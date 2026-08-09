"use client";

import type { MouseEvent } from "react";
import type { InfoCardChoice } from "@/game/types";

export interface InfoCardModalProps {
  itemName: string;
  onChoose: (choice: InfoCardChoice) => void;
  onClose: () => void;
}

const OPTIONS: { choice: InfoCardChoice; emoji: string; title: string; desc: string }[] = [
  { choice: "authenticity", emoji: "🔍", title: "查真伪", desc: "直接研判本件真品/赝品风险" },
  { choice: "buyer", emoji: "🎭", title: "探买家", desc: "窥探当前买家预算与偏好" },
  { choice: "trend", emoji: "📈", title: "看行情", desc: "预判本件类别短期走势" },
];

/** 信息卡 · 三选一弹窗：消耗 1 点情报换取一条情报 */
export default function InfoCardModal({ itemName, onChoose, onClose }: InfoCardModalProps) {
  const handleOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="overlay" onClick={handleOverlayClick}>
      <div className="info-card-modal" role="dialog" aria-modal="true" aria-label="信息卡">
        <div className="info-card-head">
          <div className="info-card-title">信息卡 · 三选一</div>
          <div className="info-card-sub">关于《{itemName}》的情报，任选一项（消耗 1 情报）</div>
        </div>
        <div className="info-card-options">
          {OPTIONS.map((option) => (
            <button
              type="button"
              key={option.choice}
              className="info-card-option"
              onClick={() => onChoose(option.choice)}
            >
              <span className="opt-emoji" aria-hidden="true">
                {option.emoji}
              </span>
              <span className="opt-title">{option.title}</span>
              <span className="opt-desc">{option.desc}</span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}
