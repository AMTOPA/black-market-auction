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
} from "@/game/engine";
import { loadGame, saveGame, clearSave, guestDailyInfo, guestClaimDaily } from "@/game/save";
import {
  apiMe,
  apiLogin,
  apiRegister,
  apiLogout,
  apiDailyClaim,
  apiDailyClaimPost,
  type AuthUser,
} from "@/lib/api";
import { initAudio, setMuted, isMuted, playClick, playBid, playCoin, playGavel, playIntel, playError } from "@/game/audio";
import type { GameState, BidChoice, IntelAction, ItemAction } from "@/game/types";
import HomeScreen from "./HomeScreen";
import AuthModal from "./AuthModal";
import LeaderboardScreen from "./LeaderboardScreen";
import RunEndScreen from "./RunEndScreen";
import AuctionScreen from "./AuctionScreen";
import SettlementScreen from "./SettlementScreen";

type View = "home" | "play" | "leaderboard";
type ClaimState = { ok: boolean; claimed: boolean; amount: number; streak: number; nextResetMs: number };

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

  // 挂载：读存档 + 登录态 + 音量
  useEffect(() => {
    const saved = loadGame();
    setGame(saved);
    setMutedState(isMuted());
    apiMe()
      .then((r) => {
        setUser(r.user);
        if (r.user) {
          apiDailyClaim()
            .then((c) => setClaim({ ok: true, ...c }))
            .catch(() => setClaim({ ok: false, claimed: false, amount: 0, streak: 0, nextResetMs: 0 }));
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
  }, []);

  // 每次游戏状态变化 → 自动存档
  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  // 音效联动：成交 / 收钱
  useEffect(() => {
    if (!game) return;
    const dealKey = game.deal ? `${game.deal.item.id}:${game.deal.price}` : null;
    if (dealKey && dealKey !== prevDealRef.current) {
      playGavel();
      if (game.deal.wonBy === "player") playCoin();
    }
    prevDealRef.current = dealKey;
  }, [game]);

  const handleToggleMute = () => {
    const m = !muted;
    setMutedState(m);
    setMuted(m);
  };

  const startNewRun = useCallback(() => {
    playClick();
    clearSave();
    setGame(beginRound(newGame()));
    setSubmitted(false);
    setView("play");
  }, []);

  const continueRun = useCallback(() => {
    playClick();
    setSubmitted(false);
    setView("play");
  }, []);

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
    playCoin();
  }, []);

  const handleLogout = useCallback(async () => {
    await apiLogout().catch(() => {});
    setUser(null);
    setClaim(null);
    playClick();
  }, []);

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
      />
    );
  }

  return (
    <div className="app-wrap">
      <div className="app-bg" />
      {body}
      {authOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) { playClick(); setAuthOpen(false); } }}>
          <AuthModal onClose={() => { playClick(); setAuthOpen(false); }} onAuthed={handleAuthed} />
        </div>
      )}
    </div>
  );
}

function playErrorSilent() {
  playError();
}

