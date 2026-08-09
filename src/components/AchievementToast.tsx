"use client";

import { useEffect } from "react";

export interface AchievementToastProps {
  label: string; // 成就名，例："天降传奇"
  desc?: string; // 可选描述
  onDone: () => void;
}

/** 成就解锁 toast：展示 3.4s 后自动移除 */
export default function AchievementToast({ label, desc, onDone }: AchievementToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="achievement-toast" role="status" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">
        ✦
      </span>
      <div className="toast-title">{label}</div>
      {desc ? <div className="toast-sub">{desc}</div> : null}
    </div>
  );
}
