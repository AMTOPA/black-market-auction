"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameMode, GameState } from "@/game/types";
import { formatClock, formatMoneyCn } from "@/game/format";
import type { GuestDailyInfo } from "@/game/save";
import type { AuthUser } from "@/lib/api";
import { EmblemMark } from "./ItemIcon";

type ServerClaimInfo = {
  ok: boolean;
  claimed: boolean;
  amount: number;
  streak: number;
  nextResetMs: number;
};

export interface HomeScreenProps {
  game: GameState | null;
  user: AuthUser | null;
  guestDaily: GuestDailyInfo | null;
  serverClaim: ServerClaimInfo | null;
  onStartNew: (mode: GameMode) => void;
  onContinue: () => void;
  onLeaderboard: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onClaimDaily: () => void | Promise<void>;
  onToggleMute: () => void;
  muted: boolean;
  onEndRun?: () => void;
}

export default function HomeScreen({
  game,
  user,
  guestDaily,
  serverClaim,
  onStartNew,
  onContinue,
  onLeaderboard,
  onOpenAuth,
  onLogout,
  onClaimDaily,
  onToggleMute,
  muted,
  onEndRun,
}: HomeScreenProps) {
  const daily = user ? serverClaim : guestDaily;
  const [remainingMs, setRemainingMs] = useState(daily?.nextResetMs ?? 0);
  const [selectedMode, setSelectedMode] = useState<GameMode>("endless");

  useEffect(() => {
    setRemainingMs(daily?.nextResetMs ?? 0);
    if (!daily?.nextResetMs) return;

    const timer = window.setInterval(() => {
      setRemainingMs((current) => Math.max(0, current - 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [daily?.nextResetMs]);

  const netAssets = useMemo(() => {
    if (!game) return 0;
    const inventoryValue = game.inventory.reduce(
      (total, item) => total + (item.appraised ? item.trueValue : item.estimateMedian),
      0,
    );
    return game.cash + inventoryValue - game.debt;
  }, [game]);

  const hasActiveRun = Boolean(game && game.phase !== "runEnd");
  const canClaim = Boolean(game && daily && !daily.claimed && (!user || serverClaim?.ok));

  const handleNewGame = () => {
    if (!game || window.confirm("新账簿会封存当前经营进度。确定重新入场吗？")) {
      onStartNew(selectedMode);
    }
  };

  const handleEndRun = () => {
    if (onEndRun && window.confirm("确定就此落槌，结束本轮经营并清算成绩吗？")) {
      onEndRun();
    }
  };

  return (
    <section className="screen screen-narrow">
      <div className="hero fade-in-up">
        <EmblemMark className="emblem floaty" />
        <div className="tiny gold display">EST. IN THE SHADOWS</div>
        <h1 className="logo">黑市拍卖行</h1>
        <p className="logo-sub">真伪无言 · 价高者得</p>
        <p className="muted small">午夜钟响，名单焚尽。今夜每一次举牌，都可能买下传奇，也可能买下谎言。</p>
      </div>

      <div className="panel fade-in-up">
        <div className="panel-title">◆ 今夜账簿</div>
        {user ? (
          <div className="btn-row">
            <span className="tag tag-gold">已认证买家</span>
            <span className="bold">{user.username}</span>
            <button className="btn btn-sm" type="button" onClick={onLogout}>
              退出登录
            </button>
          </div>
        ) : (
          <div className="notice">
            你正以游客身份穿行暗市：进度保存在本机，成绩不会进入公开榜单。
          </div>
        )}

        <div className="mode-tabs" role="group" aria-label="经营模式选择" style={{ marginTop: 14 }}>
          <button
            type="button"
            className={`mode-tab ${selectedMode === "endless" ? "active" : ""}`}
            onClick={() => setSelectedMode("endless")}
          >
            自由经营
          </button>
          <button
            type="button"
            className={`mode-tab ${selectedMode === "sprint" ? "active" : ""}`}
            onClick={() => setSelectedMode("sprint")}
          >
            竞速挑战
          </button>
        </div>
        <p className="center muted tiny" style={{ marginTop: 8 }}>
          自由经营：稳步扩张，看谁走得远 · 竞速挑战：8 场冲刺，比拼最终净资产
        </p>

        <div className="home-actions">
          {hasActiveRun && (
            <button className="btn btn-gold btn-lg btn-block glow-pulse" type="button" onClick={onContinue}>
              继续经营 · 重返拍卖厅
            </button>
          )}
          <button
            className={`btn btn-lg btn-block ${hasActiveRun ? "" : "btn-gold glow-pulse"}`}
            type="button"
            onClick={handleNewGame}
          >
            {game ? "另开新局" : "签下第一本账簿"}
          </button>
          <button className="btn btn-violet btn-block" type="button" onClick={onLeaderboard}>
            查看地下富豪榜
          </button>
          {!user && (
            <button className="btn btn-green btn-block" type="button" onClick={onOpenAuth}>
              登录 / 注册身份
            </button>
          )}
          <button className="btn btn-sm btn-block" type="button" onClick={onToggleMute}>
            {muted ? "开启拍卖厅音效" : "静音拍卖厅"}
          </button>
        </div>
      </div>

      <div className="claim-card fade-in-up">
        <div className="claim-title">◆ 每日秘密补助</div>
        {!game ? (
          <p className="muted small">先建立一份经营账簿，暗线才会送来今日的周转金。</p>
        ) : user && !serverClaim ? (
          <p className="muted small">正在核验今日的秘密汇款……</p>
        ) : daily ? (
          <>
            <p className="small">
              {daily.claimed ? (
                <span className="green">今日补助已经入账。</span>
              ) : (
                <span>
                  可领取 <strong className="gold num">¥{formatMoneyCn(daily.amount)}</strong> 周转金
                </span>
              )}
              <span className="muted"> · 连续往来 {daily.streak} 天</span>
            </p>
            <p className="tiny faint num">下一次账目刷新：{formatClock(remainingMs)}</p>
            <button
              className="btn btn-gold btn-sm"
              type="button"
              disabled={!canClaim}
              onClick={() => void onClaimDaily()}
            >
              {daily.claimed ? "今日已领取" : "收下秘密补助"}
            </button>
          </>
        ) : (
          <p className="error-text">补助账目暂时无法读取，请稍后再试。</p>
        )}
      </div>

      {game && (
        <>
          <div className="home-stats fade-in-up">
            <div className="stat">
              <div className="stat-value gold num">¥{formatMoneyCn(netAssets)}</div>
              <div className="stat-label">净资产</div>
            </div>
            <div className="stat">
              <div className="stat-value green num">¥{formatMoneyCn(game.cash)}</div>
              <div className="stat-label">现金</div>
            </div>
            <div className="stat">
              <div className={`stat-value num ${game.debt > 0 ? "red" : ""}`}>¥{formatMoneyCn(game.debt)}</div>
              <div className="stat-label">债务</div>
            </div>
            <div className="stat">
              <div className="stat-value violet num">Lv.{game.level}</div>
              <div className="stat-label">拍卖等级</div>
            </div>
            <div className="stat">
              <div className="stat-value gold num">{game.streak}</div>
              <div className="stat-label">连续盈利</div>
            </div>
          </div>

          {game.phase !== "runEnd" && (
            <div className="center fade-in-up">
              <button
                className="btn btn-danger btn-sm"
                type="button"
                disabled={!onEndRun}
                onClick={handleEndRun}
                title={onEndRun ? "结束本轮经营" : "等待主控制器接入结束回调"}
              >
                结束本轮并清算
              </button>
            </div>
          )}
        </>
      )}

      <p className="center faint tiny">不问来路，不留收据。请保管好你的筹码与秘密。</p>
    </section>
  );
}

