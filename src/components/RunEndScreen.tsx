"use client";

import { useEffect, useRef, useState } from "react";
import { formatMoneyCn } from "@/game/format";
import type { RunResult } from "@/game/types";
import { apiSubmitScore, type AuthUser } from "@/lib/api";

export interface RunEndScreenProps {
  result: RunResult;
  user: AuthUser | null;
  submitted: boolean;
  onSubmitted: () => void;
  onRestart: () => void;
  onHome: () => void;
  onLogin: () => void;
}

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function RunEndScreen({
  result,
  user,
  submitted,
  onSubmitted,
  onRestart,
  onHome,
  onLogin,
}: RunEndScreenProps) {
  const [status, setStatus] = useState<SubmitStatus>(submitted ? "success" : "idle");
  const [error, setError] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || submitted || attempted.current) return;

    attempted.current = true;
    setStatus("submitting");
    setError("");
    apiSubmitScore({
      peakNet: result.peakNet,
      level: result.level,
      auctions: result.auctions,
      bestProfit: result.bestProfit,
    })
      .then(() => {
        setStatus("success");
        onSubmitted();
      })
      .catch((reason: unknown) => {
        setStatus("error");
        setError(reason instanceof Error ? reason.message : "成绩递交失败，请稍后重试。");
      });
  }, [onSubmitted, result.auctions, result.bestProfit, result.level, result.peakNet, retryNonce, submitted, user]);

  const retrySubmit = () => {
    if (!user || status === "submitting") return;
    attempted.current = false;
    setStatus("idle");
    setRetryNonce((current) => current + 1);
  };

  return (
    <section className="screen screen-narrow">
      <div className="hero fade-in-up">
        <div className="tiny gold display">THE GAVEL HAS FALLEN</div>
        <h1 className="logo">本轮落槌</h1>
        <p className="logo-sub">账簿封存 · 输赢有痕</p>
      </div>

      <div className="panel fade-in-up">
        <div className="section-title">最终清算</div>
        <p className="center serif">“{result.endReason}”</p>
        <div className="grid grid-3">
          <div className="stat">
            <div className="stat-value gold num">¥{formatMoneyCn(result.peakNet)}</div>
            <div className="stat-label">净资产峰值</div>
          </div>
          <div className="stat">
            <div className="stat-value violet num">Lv.{result.level}</div>
            <div className="stat-label">最高等级</div>
          </div>
          <div className="stat">
            <div className="stat-value green num">{result.auctions}</div>
            <div className="stat-label">完成拍卖场</div>
          </div>
          <div className="stat">
            <div className={`stat-value num ${result.bestProfit >= 0 ? "green" : "red"}`}>
              {result.bestProfit >= 0 ? "+" : "-"}¥{formatMoneyCn(Math.abs(result.bestProfit))}
            </div>
            <div className="stat-label">单场最佳盈利</div>
          </div>
          <div className="stat">
            <div className="stat-value gold num">{result.setsCompleted}</div>
            <div className="stat-label">完整藏品套装</div>
          </div>
          <div className="stat">
            <div className="stat-value num">{user ? user.username : "游客"}</div>
            <div className="stat-label">账簿署名</div>
          </div>
        </div>
      </div>

      <div className="claim-card fade-in-up" aria-live="polite">
        <div className="claim-title">◆ 榜单递交</div>
        {!user ? (
          <>
            <p className="muted small">这份游客账簿尚未署名，因此不能进入地下富豪榜。</p>
            <button className="btn btn-green btn-sm" type="button" onClick={onLogin}>
              登录 / 注册后留名
            </button>
          </>
        ) : status === "submitting" || status === "idle" ? (
          <p className="muted small">信使正把 {user.username} 的成绩送往总账房……</p>
        ) : status === "success" || submitted ? (
          <p className="green bold">成绩已上榜。你的代号已经写进暗市总账。</p>
        ) : (
          <>
            <p className="error-text" role="alert">{error}</p>
            <button className="btn btn-sm" type="button" onClick={retrySubmit}>
              再次递交成绩
            </button>
          </>
        )}
      </div>

      <div className="home-actions fade-in-up">
        <button className="btn btn-gold btn-lg btn-block glow-pulse" type="button" onClick={onRestart}>
          再来一局
        </button>
        <button className="btn btn-block" type="button" onClick={onHome}>
          返回主页
        </button>
      </div>

      <p className="center faint tiny">赢家带走藏品，行家带走教训。午夜之后，一切重新开价。</p>
    </section>
  );
}



