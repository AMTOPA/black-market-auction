"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoneyCn } from "@/game/format";
import {
  apiLeaderboard,
  type AuthUser,
  type LeaderboardData,
  type LeaderboardRow,
} from "@/lib/api";

export interface LeaderboardScreenProps {
  user: AuthUser | null;
  onBack: () => void;
}

function rankClass(rank: number): string {
  if (rank === 1) return "rank-1";
  if (rank === 2) return "rank-2";
  if (rank === 3) return "rank-3";
  return "";
}

function rankMark(rank: number): string {
  if (rank === 1) return "♛ 1";
  if (rank === 2) return "◆ 2";
  if (rank === 3) return "◇ 3";
  return String(rank);
}

export default function LeaderboardScreen({ user, onBack }: LeaderboardScreenProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await apiLeaderboard(50));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "榜单暂时被封存，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const isMe = (row: LeaderboardRow) => Boolean(user && row.username === user.username);

  return (
    <section className="screen screen-narrow">
      <div className="hero">
        <div className="tiny gold display">THE LEDGER OF FORTUNES</div>
        <h1 className="logo">地下富豪榜</h1>
        <p className="logo-sub">筹码会说出一切</p>
      </div>

      {data?.me && (
        <div className="claim-card fade-in-up">
          <div className="claim-title">◆ 你的暗市记录</div>
          <div className="grid grid-4">
            <div className="stat">
              <div className="stat-value gold num">¥{formatMoneyCn(data.me.peak_net)}</div>
              <div className="stat-label">最高净资产</div>
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

      <div className="panel fade-in-up">
        <div className="panel-title">◆ 榜单存档</div>
        {loading ? (
          <p className="center muted">守门人正在翻阅密封账簿……</p>
        ) : error ? (
          <div className="center">
            <p className="error-text" role="alert">{error}</p>
            <button className="btn btn-sm" type="button" onClick={() => void loadLeaderboard()}>
              重新查阅
            </button>
          </div>
        ) : data && data.list.length > 0 ? (
          <table className="lb-table">
            <thead>
              <tr>
                <th scope="col">席位</th>
                <th scope="col">买家代号</th>
                <th scope="col" className="right">净资产峰值</th>
                <th scope="col" className="right">等级</th>
                <th scope="col" className="right">场次</th>
                <th scope="col" className="right">轮数</th>
              </tr>
            </thead>
            <tbody>
              {data.list.map((row) => (
                <tr className={isMe(row) ? "me" : ""} key={`${row.rank}-${row.username}`}>
                  <td className={rankClass(row.rank)}>{rankMark(row.rank)}</td>
                  <td className="bold">
                    {row.username} {isMe(row) && <span className="tag tag-gold">你</span>}
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

      {!user && (
        <div className="notice">游客可以查阅榜单，但只有登记身份的买家才能留下成绩。</div>
      )}

      <div className="btn-row">
        <button className="btn btn-gold btn-lg btn-block" type="button" onClick={onBack}>
          返回拍卖行
        </button>
      </div>
    </section>
  );
}
