"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  newGame,
  beginRound,
  playerBid,
  aiStep,
  afterDealContinue,
  playerIntel,
  settlementAction,
  acceptSpecialBuyer,
  nextRound,
  forceEndRun,
  buildRunResult,
  computeNetAssets,
  availableCredit,
  entryFee,
  levelName,
  openInfoCard,
  closeInfoCard,
  chooseInfoCard,
} from "@/game/engine";
import {
  loadGame,
  saveGame,
  clearSave,
  sanitizeState,
  guestDailyInfo,
  guestClaimDaily,
} from "@/game/save";
import {
  loadProfile,
  saveProfile,
  defaultProfile,
  sanitizeProfile,
  finalizeRun,
} from "@/game/profile";
import { getLastLocalTs, setLastLocalTs } from "@/game/local";
import { todayChallenge } from "@/game/daily";
import {
  apiMe,
  apiLogin,
  apiRegister,
  apiLogout,
  apiDailyClaim,
  apiDailyClaimPost,
  apiCloudSaveGet,
  apiCloudSavePut,
  type AuthUser,
  type CloudSaveGetResponse,
} from "@/lib/api";
import { apiUrl } from "@/lib/base";
import { initAudio, setMuted, isMuted, playClick, playBid, playCoin, playGavel, playIntel, playError } from "@/game/audio";
import type { GameState, GameMode, BidChoice, IntelAction, ItemAction, IdentityKind, Profile, InfoCardChoice } from "@/game/types";
import HomeScreen from "./HomeScreen";
import AuthModal from "./AuthModal";
import LeaderboardScreen from "./LeaderboardScreen";
import RunEndScreen from "./RunEndScreen";
import LevelUpToast from "./LevelUpToast";
import AuctionScreen from "./AuctionScreen";
import SettlementScreen from "./SettlementScreen";

type View = "home" | "play" | "leaderboard";
type ClaimState = { ok: boolean; claimed: boolean; amount: number; streak: number; nextResetMs: number };

/** 云端同步周期（用户要求每 5 秒备份一次） */
const CLOUD_SYNC_INTERVAL_MS = 5000;
/** keepalive 请求体上限（浏览器约 64KB），超过则跳过退出前闪传 */
const KEEPALIVE_MAX_BYTES = 60 * 1024;

export default function GameApp() {
  const [game, setGame] = useState<GameState | null>(null);
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [claim, setClaim] = useState<ClaimState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [muted, setMutedState] = useState(false);
  const audioReady = useRef(false);
  const prevDealRef = useRef<string | null>(null);
  const finalizedRef = useRef(false);
  const [gains, setGains] = useState<{ reputation: number; newUnlocks: string[]; newAchievements: string[]; newSets: string[] } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [levelToast, setLevelToast] = useState<{ key: number; title: string; subtitle?: string } | null>(null);
  const prevLevelRef = useRef(1);

  // ---- 云存档同步 refs（避免定时器闭包读到旧值） ----
  const gameRef = useRef<GameState | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const dirtyRef = useRef(false); // 已登录且有未上传的本地改动
  const lastLocalTsRef = useRef(0); // 本地存档最后修改时间（与 localStorage 保持一致）
  const restoringRef = useRef(false); // 正在从云端恢复，抑制"伪改动"的脏标记

  // 挂载：读存档 + 登录态 + 音量
  useEffect(() => {
    const saved = loadGame();
    setGame(saved);
    setProfile(loadProfile());
    lastLocalTsRef.current = getLastLocalTs();
    setMutedState(isMuted());
    apiMe()
      .then((r) => {
        setUser(r.user);
        if (r.user) {
          apiDailyClaim()
            .then((c) => setClaim({ ok: true, ...c }))
            .catch(() => setClaim({ ok: false, claimed: false, amount: 0, streak: 0, nextResetMs: 0 }));
          // 已登录（会话 cookie 有效）：拉取云端存档并做冲突合并
          void syncAfterLogin();
        }
      })
      .catch(() => {});
    const onFirst = () => {
      if (!audioReady.current) {
        audioReady.current = true;
        initAudio();
      }
    };
    window.addEventListener("pointerdown", onFirst);
    return () => window.removeEventListener("pointerdown", onFirst);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ref 跟随最新 state
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { userRef.current = user; }, [user]);

  // 每次游戏状态变化 → 自动存档 + 标记待上传
  useEffect(() => {
    if (game) {
      saveGame(game);
      lastLocalTsRef.current = getLastLocalTs();
      if (!restoringRef.current && userRef.current) dirtyRef.current = true;
    }
  }, [game]);

  // 档案变化 → 标记待上传
  useEffect(() => {
    if (profile) {
      lastLocalTsRef.current = getLastLocalTs();
      if (!restoringRef.current && userRef.current) dirtyRef.current = true;
    }
  }, [profile]);

  /** 将云端存档恢复到本地（以云端为准） */
  const restoreFromCloud = useCallback((r: CloudSaveGetResponse) => {
    const remoteGame = r.payload?.game ?? null;
    const remoteProfile = r.payload?.profile ?? null;
    restoringRef.current = true;
    try {
      if (remoteGame) {
        const restored = sanitizeState(remoteGame as GameState);
        if (restored.phase === "runEnd") {
          // 终局状态不入云，也不恢复：本轮增益已并入档案，避免换设备重复结算
          setGame(null);
          clearSave();
        } else {
          setGame(restored);
          saveGame(restored);
        }
      } else {
        setGame(null);
        clearSave();
      }
      if (remoteProfile) {
        const restoredProfile = sanitizeProfile(remoteProfile as Partial<Profile>);
        setProfile(restoredProfile);
        saveProfile(restoredProfile);
      }
      // 以当前时间为本地基准，云端稍后会被本机的最新改动覆盖
      lastLocalTsRef.current = Date.now();
      setLastLocalTs(lastLocalTsRef.current);
      dirtyRef.current = false;
    } finally {
      restoringRef.current = false;
    }
  }, []);

  /** 登录/恢复会话后：拉取云端，按时间戳做冲突合并 */
  const syncAfterLogin = useCallback(async () => {
    try {
      const r = await apiCloudSaveGet();
      if (r.payload && r.updatedAt > lastLocalTsRef.current) {
        // 云端比本地新 → 恢复云端
        restoreFromCloud(r);
      } else {
        // 本地与云端相同或更新 → 以本地为准，下一个周期覆盖云端
        dirtyRef.current = true;
      }
    } catch {
      // 网络失败：保留本地，下一个周期重试上传
      dirtyRef.current = true;
    }
  }, [restoreFromCloud]);

  /** 把本地改动推送到云端（供 5 秒周期 / 退出登录调用） */
  const flushCloud = useCallback(async () => {
    if (!userRef.current || !dirtyRef.current) return;
    const g = gameRef.current;
    const p = profileRef.current;
    // 终局状态不入云：本轮增益已并入档案，避免换设备后重复结算
    const payloadGame = g && g.phase === "runEnd" ? null : g;
    try {
      const r = await apiCloudSavePut({
        game: payloadGame,
        profile: p,
        updatedAt: lastLocalTsRef.current,
      });
      if (r.accepted === false) {
        // 云端已有更新的时间戳 → 拉取并恢复，避免旧数据覆盖新数据
        const latest = await apiCloudSaveGet();
        if (latest.payload && latest.updatedAt > lastLocalTsRef.current) {
          restoreFromCloud(latest);
        } else {
          // 时间戳不新于本地（内容一致或极端并发）：视为已同步，防止死循环
          dirtyRef.current = false;
        }
      } else {
        dirtyRef.current = false;
      }
    } catch {
      // 网络异常：保持 dirty，下个周期重试
    }
  }, [restoreFromCloud]);

  // 每 5 秒：已登录且有改动 → 自动备份到云端
  useEffect(() => {
    const timer = window.setInterval(() => {
      void flushCloud();
    }, CLOUD_SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [flushCloud]);

  // 退出/刷新页面前：尽力闪传一次（keepalive 有 64KB 上限，超限交给 5 秒周期）
  useEffect(() => {
    const onHide = () => {
      if (!userRef.current || !dirtyRef.current) return;
      const g = gameRef.current;
      const p = profileRef.current;
      const payloadGame = g && g.phase === "runEnd" ? null : g;
      const body = JSON.stringify({
        game: payloadGame,
        profile: p,
        updatedAt: lastLocalTsRef.current,
      });
      if (body.length > KEEPALIVE_MAX_BYTES) return;
      try {
        fetch(apiUrl("/api/cloud-save"), {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {});
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  // 终局：结算档案（每轮一次）
  useEffect(() => {
    if (game?.phase === "runEnd" && profile && !finalizedRef.current) {
      finalizedRef.current = true;
      const res = finalizeRun(profile, game, Boolean(game.dailyChallengePaid));
      saveProfile(res.profile);
      setProfile(res.profile);
      setGains(res.gains);
      // 本轮已封档：清掉进行中存档，避免刷新页面后重复结算
      clearSave();
    }
  }, [game, profile]);

  // 市场升级提示
  useEffect(() => {
    if (game && game.phase === "bidding" && game.level > (prevLevelRef.current ?? 1)) {
      setLevelToast({ key: Date.now(), title: "市场升级", subtitle: `进入「${levelName(game.level)}」` });
    }
    prevLevelRef.current = game?.level ?? 1;
  }, [game]);

  // 音效联动：成交 / 收钱
  useEffect(() => {
    if (!game) return;
    const deal = game.deal ?? null;
    const dealKey = deal ? `${deal.item.id}:${deal.price}` : null;
    if (dealKey && dealKey !== prevDealRef.current) {
      playGavel();
      if (deal?.wonBy === "player") playCoin();
    }
    prevDealRef.current = dealKey;
  }, [game]);

  const handleToggleMute = () => {
    const m = !muted;
    setMutedState(m);
    setMuted(m);
  };

  const startNewRun = useCallback((mode: GameMode = "endless") => {
    playClick();
    clearSave();
    finalizedRef.current = false;
    setGains(null);
    setGame(beginRound(newGame({ mode, identity: profile?.identity ?? "dealer", startCashBoost: profile?.unlocks?.startCashBoost ?? 0 })));
    setSubmitted(false);
    setView("play");
  }, [profile]);

  const continueRun = useCallback(() => {
    playClick();
    if (game?.phase !== "runEnd") {
      finalizedRef.current = false;
      setGains(null);
    }
    setSubmitted(false);
    setView("play");
  }, [game?.phase]);

  const handleBid = useCallback((choice: BidChoice) => {
    playBid();
    setGame((s) => (s ? playerBid(s, choice) : s));
  }, []);

  const handleAiTick = useCallback(() => {
    setGame((s) => (s ? aiStep(s) : s));
  }, []);

  const handleIntel = useCallback((action: IntelAction) => {
    playIntel();
    setGame((s) => (s ? playerIntel(s, action) : s));
  }, []);

  const handleDealContinue = useCallback(() => {
    playClick();
    setGame((s) => (s ? afterDealContinue(s) : s));
  }, []);

  const handleAction = useCallback((itemId: string, action: ItemAction) => {
    if (action === "sell" || action === "pawn") playCoin();
    else playClick();
    setGame((s) => (s ? settlementAction(s, itemId, action) : s));
  }, []);

  const handleSpecial = useCallback((itemId: string) => {
    playCoin();
    setGame((s) => (s ? acceptSpecialBuyer(s, itemId) : s));
  }, []);

  const handleNextRound = useCallback(() => {
    playGavel();
    setGame((s) => (s ? nextRound(s) : s));
  }, []);

  const handleEndRun = useCallback(() => {
    playGavel();
    setGame((s) => (s ? forceEndRun(s, "主动结束本轮") : s));
  }, []);

  const handleOpenInfoCard = useCallback(() => setGame((s) => (s ? openInfoCard(s) : s)), []);
  const handleChooseInfoCard = useCallback((c: InfoCardChoice) => {
    playIntel();
    setGame((s) => (s ? chooseInfoCard(s, c) : s));
  }, []);
  const handleCloseInfoCard = useCallback(() => setGame((s) => (s ? closeInfoCard(s) : s)), []);

  const handleIdentityChange = useCallback((id: IdentityKind) => {
    setProfile((p) => {
      const np = p ? { ...p, identity: id } : { ...defaultProfile(), identity: id };
      saveProfile(np);
      return np;
    });
    playClick();
  }, []);

  const handleClaimDaily = useCallback(async () => {
    if (!game) return;
    if (user) {
      try {
        const c = await apiDailyClaimPost();
        setClaim({ ok: true, ...c });
        if (c.amount > 0) {
          playCoin();
          setGame((s) => (s ? { ...s, cash: s.cash + c.amount } : s));
        } else {
          playErrorSilent();
        }
      } catch {
        /* 已领或网络错误 */
        playErrorSilent();
      }
    } else {
      const res = guestClaimDaily(game);
      if (res) {
        playCoin();
        setGame(res.state);
      }
    }
  }, [game, user]);

  const handleAuthed = useCallback((u: AuthUser) => {
    setUser(u);
    setAuthOpen(false);
    apiDailyClaim()
      .then((c) => setClaim({ ok: true, ...c }))
      .catch(() => {});
    // 登录后拉取云端存档（新账号云端为空，则把本地进度作为基线上传）
    void syncAfterLogin();
    playCoin();
  }, [syncAfterLogin]);

  const handleLogout = useCallback(async () => {
    // 退出前先推送未上传的改动
    await flushCloud().catch(() => {});
    await apiLogout().catch(() => {});
    setUser(null);
    setClaim(null);
    dirtyRef.current = false;
    playClick();
  }, [flushCloud]);

  const phase = game?.phase;
  const myResult = game ? buildRunResult(game) : null;

  // 渲染主体
  let body: React.ReactNode = null;
  if (view === "leaderboard") {
    body = <LeaderboardScreen onBack={() => { playClick(); setView(game ? "play" : "home"); }} user={user} />;
  } else if (view === "play" && game && phase === "bidding") {
    body = (
      <AuctionScreen
        state={game}
        onBid={handleBid}
        onIntel={handleIntel}
        onDealContinue={handleDealContinue}
        onAiTick={handleAiTick}
        onEndRun={handleEndRun}
        onOpenInfoCard={handleOpenInfoCard}
        onChooseInfoCard={handleChooseInfoCard}
        onCloseInfoCard={handleCloseInfoCard}
      />
    );
  } else if (view === "play" && game && phase === "settlement") {
    body = (
      <SettlementScreen
        state={game}
        onAction={handleAction}
        onSpecial={handleSpecial}
        onNextRound={handleNextRound}
        onHome={() => { playClick(); setView("home"); }}
      />
    );
  } else if (view === "play" && game && phase === "runEnd") {
    body = (
      <RunEndScreen
        result={myResult!}
        user={user}
        submitted={submitted}
        onSubmitted={() => setSubmitted(true)}
        onRestart={startNewRun}
        onHome={() => { playClick(); setView("home"); }}
        onLogin={() => setAuthOpen(true)}
        gains={gains}
        profile={profile}
      />
    );
  } else {
    // 首页
    const guest = game ? guestDailyInfo(game) : null;
    body = (
      <HomeScreen
        game={game}
        user={user}
        guestDaily={guest}
        serverClaim={claim}
        onStartNew={startNewRun}
        onContinue={continueRun}
        onLeaderboard={() => { playClick(); setView("leaderboard"); }}
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
        onClaimDaily={handleClaimDaily}
        onToggleMute={handleToggleMute}
        muted={muted}
        onEndRun={handleEndRun}
        challenge={todayChallenge()}
        profile={profile}
        onIdentityChange={handleIdentityChange}
      />
    );
  }

  return (
    <div className="app-wrap">
      {body}
      {authOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) { playClick(); setAuthOpen(false); } }}>
          <AuthModal onClose={() => { playClick(); setAuthOpen(false); }} onAuthed={handleAuthed} />
        </div>
      )}
      {levelToast ? (
        <div className="toast-stack">
          <LevelUpToast key={levelToast.key} title={levelToast.title} subtitle={levelToast.subtitle} onDone={() => setLevelToast(null)} />
        </div>
      ) : null}
    </div>
  );
}

function playErrorSilent() {
  playError();
}
