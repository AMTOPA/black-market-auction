"use client";

import { useCallback, useEffect, useState } from "react";

import { formatMoneyCn } from "@/game/format";
import { apiLeaderboard, type AuthUser, type LeaderboardData, type LeaderboardRow } from "@/lib/api";
import type { GameMode } from "@/game/types";

import { CrownIcon, RankMedal } from "./ItemIcon";

export interface LeaderboardScreenProps {
  user: AuthUser | null;
  onBack: () => void;
}

/** 领奖台顺序：亚军在左、冠军居中、季军在右 */
const PODIUM_ORDER = [2, 1, 3];

export default function LeaderboardScreen({ user, onBack }: LeaderboardScreenProps) {
  type ModeFilter = "all" | GameMode;
  const [mode, setMode] = useState<ModeFilter>("all");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async (filter: ModeFilter) => {
    setLoading(true);
    setError("");
    try {
      setData(await apiLeaderboard(50, filter === "all" ? undefined : filter));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "榜单暂时被封存，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }, []);

  const switchMode = useCallback(
    (next: ModeFilter) => {
      setMode(next);
      void loadLeaderboard(next);
    },
    [loadLeaderboard],
  );

  useEffect(() => {
    void loadLeaderboard(mode);
  }, [loadLeaderboard, mode]);

  const isMe = (row: LeaderboardRow) => Boolean(user && row.username === user.username);

  const podiumRows = (data?.list ?? [])
    .slice(0, 3)
    .map((row) => ({ rank: row.rank, row }))
    .sort((a, b) => PODIUM_ORDER.indexOf(a.rank) - PODIUM_ORDER.indexOf(b.rank))
    .filter((entry) => PODIUM_ORDER.includes(entry.rank))
    .map((entry) => entry.row);

  return (
    <section className="screen screen-narrow">
      <div className="hero lb-hero">
        <div className="tiny gold display">THE LEDGER OF FORTUNES</div>
        <h1 className="logo">地下富豪榜</h1>
        <p className="logo-sub">筹码会说出一切</p>
      </div>

      <div className="mode-tabs fade-in-up" role="group" aria-label="排行榜模式筛选" style={{ marginTop: 8 }}>
        <button type="button" className={`mode-tab ${mode === "all" ? "active" : ""}`} onClick={() => switchMode("all")}>
          全部
        </button>
        <button type="button" className={`mode-tab ${mode === "endless" ? "active" : ""}`} onClick={() => switchMode("endless")}>
          自由经营
        </button>
        <button type="button" className={`mode-tab ${mode === "sprint" ? "active" : ""}`} onClick={() => switchMode("sprint")}>
          竞速挑战
        </button>
      </div>

      {data?.me && (
        <div className="claim-card fade-in-up">
          <div className="claim-title">◆ 你的暗市记录</div>
          <div className="grid grid-4">
            <div className="stat">
              <div className="stat-value gold num">¥{formatMoneyCn(data.me.peak_net)}</div>
              <div className="stat-label">{mode === "sprint" ? "最佳最终净资产" : "最高净资产"}</div>
            </div>
            <div className="stat">
              <div className="stat-value violet num">Lv.{data.me.level}</div>
              <div className="stat-label">最高等级</div>
            </div>
            <div className="stat">
              <div className="stat-value green num">{data.me.auctions}</div>
              <div className="stat-label">拍卖场次</div>
            </div>
            <div className="stat">
              <div className="stat-value num">{data.me.runs}</div>
              <div className="stat-label">经营轮数</div>
            </div>
          </div>
        </div>
      )}

      {podiumRows.length > 0 && (
        <div className="panel panel-gold fade-in-up">
          <div className="section-title">三甲席位</div>
          <div className="podium">
            {podiumRows.map((row) => (
              <div className={`podium-col rank-${row.rank}`} key={row.rank}>
                {row.rank === 1 ? <CrownIcon className="podium-crown" /> : null}
                <div className="podium-avatar">🎩</div>
                <div className="podium-name" title={row.username}>
                  {row.username}
                </div>
                <div className="podium-net num">¥{formatMoneyCn(row.peak_net)}</div>
                {mode === "all" ? (
                  <div className={`mode-badge ${row.mode === "sprint" ? "sprint" : "endless"}`}>
                    {row.mode === "sprint" ? "竞速" : "自由"}
                  </div>
                ) : null}
                <div className="podium-plate">{row.rank}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel fade-in-up">
        <div className="section-title">完整榜单</div>
        {loading ? (
          <p className="center muted">守门人正在翻阅密封账簿……</p>
        ) : error ? (
          <div className="center">
            <p className="error-text" role="alert">
              {error}
            </p>
            <button className="btn btn-sm" type="button" onClick={() => void loadLeaderboard(mode)}>
              重新查阅
            </button>
          </div>
        ) : data && data.list.length > 0 ? (
          <table className="lb-table">
            <thead>
              <tr>
                <th scope="col">席位</th>
                <th scope="col">买家代号</th>
                <th scope="col" className="right">
                  {mode === "sprint" ? "最终净资产" : "净资产峰值"}
                </th>
                <th scope="col" className="right">
                  等级
                </th>
                <th scope="col" className="right">
                  场次
                </th>
                <th scope="col" className="right">
                  轮数
                </th>
              </tr>
            </thead>
            <tbody>
              {data.list.map((row) => (
                <tr className={isMe(row) ? "me" : ""} key={`${row.rank}-${row.username}`}>
                  <td>
                    <RankMedal rank={row.rank} />
                  </td>
                  <td className="lb-name">
                    {row.username} {isMe(row) && <span className="tag tag-gold">你</span>}
                    {mode === "all" ? (
                      <span className={`mode-badge ${row.mode === "sprint" ? "sprint" : "endless"}`} style={{ marginLeft: 6 }}>
                        {row.mode === "sprint" ? "竞速" : "自由"}
                      </span>
                    ) : null}
                  </td>
                  <td className="right gold num">¥{formatMoneyCn(row.peak_net)}</td>
                  <td className="right violet num">Lv.{row.level}</td>
                  <td className="right num">{row.auctions}</td>
                  <td className="right muted num">{row.runs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="center muted">
            <p>密封账簿还是空的。</p>
            <p className="tiny">也许你的名字，会成为这里的第一行。</p>
          </div>
        )}
      </div>

      {!user && <div className="notice">游客可以查阅榜单，但只有登记身份的买家才能留下成绩。</div>}

      <div className="btn-row">
        <button className="btn btn-gold btn-lg btn-block" type="button" onClick={onBack}>
          返回拍卖行
        </button>
      </div>
    </section>
  );
}
