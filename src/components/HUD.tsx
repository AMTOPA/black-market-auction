"use client";

import { availableCredit, levelName } from "@/game/engine";
import { formatMoney, formatMoneyCn } from "@/game/format";
import type { GameState } from "@/game/types";

export interface HUDProps {
  state: GameState;
  onEndRun?: () => void;
}

export function HUD({ state, onEndRun }: HUDProps) {
  const credit = availableCredit(state);

  const handleEndRun = () => {
    if (!onEndRun) return;
    if (window.confirm("确定要结束本轮经营吗？当前进度将进入最终结算。")) {
      onEndRun();
    }
  };

  return (
    <div className="hud" aria-label="经营状态">
      <div className="hud-item">
        <span className="hud-label">现金</span>
        <span className="hud-value green num" title={`¥${formatMoney(state.cash)}`}>
          ¥{formatMoneyCn(state.cash)}
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">债务</span>
        <span className={`hud-value num ${state.debt > 0 ? "red" : ""}`} title={`¥${formatMoney(state.debt)}`}>
          ¥{formatMoneyCn(state.debt)}
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">可用信用</span>
        <span className="hud-value cyan num" title={`¥${formatMoney(credit)}`}>
          ¥{formatMoneyCn(credit)}
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">情报点</span>
        <span className="hud-value violet num">{state.intel}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">库存</span>
        <span className={`hud-value num ${state.inventory.length >= 6 ? "red" : ""}`}>
          {state.inventory.length}/6
        </span>
      </div>
      <div className="hud-item">
        <span className="hud-label">场次</span>
        <span className="hud-value num">#{state.auctionNumber}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">等级</span>
        <span className="hud-value gold">
          Lv.{state.level} · {levelName(state.level)}
        </span>
      </div>
      <div className="hud-spacer" />
      {onEndRun ? (
        <button type="button" className="btn btn-danger btn-sm" onClick={handleEndRun}>
          结束本轮
        </button>
      ) : null}
    </div>
  );
}

export default HUD;
