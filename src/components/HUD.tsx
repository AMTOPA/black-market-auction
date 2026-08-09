"use client";

import { availableCredit, inventoryCap, levelName } from "@/game/engine";
import { IDENTITY_INFO } from "@/game/content";
import { CONFIG } from "@/game/config";
import { formatMoney, formatMoneyCn } from "@/game/format";
import type { GameState } from "@/game/types";
import { CoinIcon } from "./ItemIcon";
import { useConfirm } from "./ConfirmDialog";

export interface HUDProps {
  state: GameState;
  onEndRun?: () => void;
}

function StrokeIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function HUD({ state, onEndRun }: HUDProps) {
  const credit = availableCredit(state);
  const { confirm, dialog } = useConfirm();

  const handleEndRun = async () => {
    if (!onEndRun) return;
    const ok = await confirm({
      title: "结束本轮",
      message: "确定要结束本轮经营吗？当前进度将进入最终结算。",
      confirmText: "结束本轮",
      tone: "danger",
    });
    if (ok) onEndRun();
  };

  return (
    <>
      <div className="hud" aria-label="经营状态">
      <div className="hud-stat" title={`现金 ¥${formatMoney(state.cash)}`}>
        <span className="hud-ico">
          <CoinIcon />
        </span>
        <span className="hud-info">
          <span className="hud-label">现金</span>
          <span className="hud-value green num">¥{formatMoneyCn(state.cash)}</span>
        </span>
      </div>
      <span className="hud-sep" aria-hidden="true" />
      <div className="hud-stat" title={`债务 ¥${formatMoney(state.debt)}`}>
        <span className="hud-ico">
          <StrokeIcon d="M12 4v16M6 14l6 6 6-6" />
        </span>
        <span className="hud-info">
          <span className="hud-label">债务</span>
          <span className={`hud-value num ${state.debt > 0 ? "red" : ""}`}>¥{formatMoneyCn(state.debt)}</span>
        </span>
      </div>
      <span className="hud-sep" aria-hidden="true" />
      <div className="hud-stat" title={`可用信用 ¥${formatMoney(credit)}`}>
        <span className="hud-ico">
          <StrokeIcon d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        </span>
        <span className="hud-info">
          <span className="hud-label">可用信用</span>
          <span className="hud-value cyan num">¥{formatMoneyCn(credit)}</span>
        </span>
      </div>
      <span className="hud-sep" aria-hidden="true" />
      <div className="hud-stat" title="情报点：调查真伪 / 定价 / 买家情报">
        <span className="hud-ico">
          <StrokeIcon d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        </span>
        <span className="hud-info">
          <span className="hud-label">情报点</span>
          <span className="hud-value violet num">{state.intel}</span>
        </span>
      </div>
      <span className="hud-sep" aria-hidden="true" />
      <div className="hud-stat" title={`库存 ${state.inventory.length}/${inventoryCap(state)}`}>
        <span className="hud-ico">
          <StrokeIcon d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8" />
        </span>
        <span className="hud-info">
          <span className="hud-label">库存</span>
          <span className={`hud-value num ${state.inventory.length >= inventoryCap(state) ? "red" : ""}`}>{state.inventory.length}/{inventoryCap(state)}</span>
        </span>
      </div>
      <span className="hud-sep" aria-hidden="true" />
      <div className="hud-stat">
        <span className="hud-ico">
          <StrokeIcon d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
        </span>
        <span className="hud-info">
          <span className="hud-label">场次</span>
          <span className="hud-value num">#{state.auctionNumber}</span>
        </span>
      </div>
      {state.mode === "sprint" ? (
        <div className="run-progress" title="竞速挑战 · 8 场定胜负">
          <span>竞速</span>
          <div className="run-progress-bar">
            <div
              className="run-progress-fill"
              style={{ width: `${Math.min(100, Math.round((state.modeRound / CONFIG.sprintRounds) * 100))}%` }}
            />
          </div>
          <span className="num">
            {state.modeRound}/{CONFIG.sprintRounds}
          </span>
        </div>
      ) : (
        <span className="mode-badge endless" title="自由经营 · 无限积累">
          自由经营
        </span>
      )}
      <span className="hud-sep" aria-hidden="true" />
      <div className="hud-stat" title={`Lv.${state.level} · ${levelName(state.level)}`}>
        <span className="hud-ico">
          <StrokeIcon d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z" />
        </span>
        <span className="hud-info">
          <span className="hud-label">等级</span>
          <span className="hud-value gold">Lv.{state.level}</span>
        </span>
      </div>
      <span className="identity-chip" title={IDENTITY_INFO[state.identity ?? "dealer"].desc}>
        {IDENTITY_INFO[state.identity ?? "dealer"].emoji} {IDENTITY_INFO[state.identity ?? "dealer"].label}
      </span>
      <div className="rep-chip" title="声望：达到 50 入场费 8 折，达到 100 特殊买家必现">
        <span aria-hidden="true">👑</span>
        <span className="num">{state.reputation}</span>
      </div>
      <div className="hud-spacer" />
        {onEndRun ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={handleEndRun}>
            结束本轮
          </button>
        ) : null}
      </div>
      {dialog}
    </>
  );
}

export default HUD;
