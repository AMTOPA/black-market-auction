"use client";

import { useEffect } from "react";

export interface LevelUpToastProps {
  title: string; // 例："市场升级"
  subtitle?: string; // 例："进入「古董沙龙」"
  onDone: () => void; // 动画结束后由父组件移除本 toast
}

/** 升级提示 toast：展示 3.4s 后自动移除 */
export default function LevelUpToast({ title, subtitle, onDone }: LevelUpToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="levelup-toast" role="status" aria-live="polite">
      <span className="toast-icon" aria-hidden="true">
        🎉
      </span>
      <div className="toast-title">{title}</div>
      {subtitle ? <div className="toast-sub">{subtitle}</div> : null}
    </div>
  );
}
