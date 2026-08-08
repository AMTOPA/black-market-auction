"use client";

import { useEffect, useRef } from "react";

import { availableCredit, canBidAt, recentLog } from "@/game/engine";
import { formatMoney, formatMoneyCn, formatMult } from "@/game/format";
import type { BidChoice, GameState, IntelAction } from "@/game/types";

import { HUD } from "./HUD";

export interface AuctionScreenProps {
  state: GameState;
  onBid: (choice: BidChoice) => void;
  onIntel: (action: IntelAction) => void;
  onDealContinue: () => void;
  onNextRound?: () => void;
  onEndRun: () => void;
  onAiTick: () => void;
}

const BID_OPTIONS: Array<{ choice: Exclude<BidChoice, "exit">; label: string; step: number }> = [
  { choice: "small", label: "小幅 +5%", step: 0.05 },
  { choice: "standard", label: "标准 +15%", step: 0.15 },
  { choice: "strong", label: "强势 +35%", step: 0.35 },
];

const INTEL_OPTIONS: Array<{ action: IntelAction; label: string; detail: string }> = [
  { action: "authenticity", label: "调查真伪", detail: "研判赝品风险" },
  { action: "estimate", label: "精确定价", detail: "缩小价值区间" },
  { action: "buyer", label: "买家情报", detail: "窥探偏好财力" },
  { action: "clue", label: "线索可信度", detail: "检验一条线索" },
];

function round100(value: number): number {
  return Math.round(value / 100) * 100;
}

export function AuctionScreen(props: AuctionScreenProps) {
  const { state } = props;
  const item = state.itemsThisRound[state.itemIndex];
  const logRef = useRef<HTMLDivElement>(null);
  const logs = recentLog(state);
  const lastLogId = logs.at(-1)?.id;

  const canPlayerAct =
    state.phase === "bidding" && !state.deal && state.currentBidder === "player" && state.playerInAuction;
  const canUseIntel = state.intel > 0 && state.phase === "bidding" && !state.deal;
  const spendingPower = state.cash + availableCredit(state);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lastLogId]);

  useEffect(() => {
    if (state.phase !== "bidding" || state.deal || state.currentBidder === "player") return;
    const timer = window.setTimeout(() => props.onAiTick(), 650);
    return () => window.clearTimeout(timer);
  }, [props.onAiTick, state.currentBidder, state.deal, state.phase]);

  if (!item) {
    return (
      <main className="screen screen-narrow grid">
        <HUD state={state} onEndRun={props.onEndRun} />
        <div className="notice">拍品资料正在整理，请稍候。</div>
      </main>
    );
  }

  const marketMult = state.market[item.category] ?? 1;
  const marketDirection = marketMult > 1 ? "up" : marketMult < 1 ? "down" : "flat";
  const marketArrow = marketMult > 1 ? "↑" : marketMult < 1 ? "↓" : "→";

  return (
    <main className="screen grid">
      <HUD state={state} onEndRun={props.onEndRun} />

      <section className="panel fade-in-up">
        <div className="panel-title">
          地下拍卖现场 · 第 {state.itemIndex + 1}/{state.itemsThisRound.length} 件
        </div>
        <div className="grid grid-2">
          <article className="item-card">
            <div className="item-name">{item.name}</div>
            <div className="item-sub">类别：{item.category} · 品相：{item.condition}</div>

            <div className="btn-row">
              {item.tags.map((tag) => (
                <span className="tag tag-gold" key={tag}>
                  {tag}
                </span>
              ))}
              {item.setInfo ? <span className="tag tag-violet">{item.setInfo.partLabel}</span> : null}
            </div>

            <div className="stat">
              <div className="stat-label">行家估价</div>
              <div className="estimate num">
                ¥{formatMoney(item.estimateLow)} ~ ¥{formatMoney(item.estimateHigh)}
              </div>
            </div>

            <div className="market-grid">
              <div className="market-cell">
                <div className="cat">{item.category}行情</div>
                <div className={`mult ${marketDirection}`}>
                  {marketArrow} {formatMult(marketMult)}
                </div>
              </div>
              <div className="market-cell">
                <div className="cat">当前叫价</div>
                <div className="mult gold num">¥{formatMoney(state.currentPrice)}</div>
              </div>
            </div>

            <div className="panel-title">公开线索</div>
            {item.clues.map((clue) => (
              <div className="clue" key={clue.id}>
                {clue.text}
              </div>
            ))}
          </article>

          <div className="panel">
            <div className="panel-title">现场记录</div>
            <div className="log" ref={logRef} aria-live="polite">
              {logs.length > 0 ? (
                logs.map((entry) => {
                  const actorClass = entry.actor === "玩家" ? "actor-player" : entry.actor ? "actor-bidder" : "";
                  return (
                    <div className={`log-entry ${entry.kind} ${actorClass}`} key={String(entry.id)}>
                      {entry.text}
                    </div>
                  );
                })
              ) : (
                <div className="log-entry system">拍卖师正在确认起拍价……</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">
          买家席 · 当前价格 <span className="gold num">¥{formatMoney(state.currentPrice)}</span>
        </div>
        <div className="bidder-row">
          <div
            className={`bidder player-card ${state.currentBidder === "player" ? "active" : ""} ${
              state.activeBidders.includes("player") ? "" : "out"
            }`}
          >
            <span className="avatar">🎩</span>
            <span className="bidder-name">你</span>
            <div className="bidder-kind">黑市经营者</div>
            <div className="wealth num" title={`现金与信用合计 ¥${formatMoney(spendingPower)}`}>
              可调度：¥{formatMoneyCn(spendingPower)}
            </div>
            {!state.activeBidders.includes("player") ? <span className="tag tag-red">已出局</span> : null}
          </div>

          {state.bidders.map((bidder) => {
            const isActive = state.currentBidder === bidder.id;
            const isInAuction = state.activeBidders.includes(bidder.id);
            return (
              <div className={`bidder ${isActive ? "active" : ""} ${isInAuction ? "" : "out"}`} key={bidder.id}>
                <span className="avatar">{bidder.emoji}</span>
                <span className="bidder-name">{bidder.name}</span>
                <div className="bidder-kind">{bidder.kind}</div>
                <div className="wealth">财力：{bidder.wealthTier}</div>
                {!isInAuction ? <span className="tag tag-red">已出局</span> : null}
              </div>
            );
          })}
        </div>
      </section>

      {state.inventoryFullNotice ? (
        <div className="notice">库存已满（{state.inventory.length}/6），本件拍品只能旁观。请在结算阶段出售或抵押藏品。</div>
      ) : null}

      <section className="panel">
        <div className="panel-title">你的竞价</div>
        <div className="bid-panel">
          {BID_OPTIONS.map((option) => {
            const nextPrice = round100(state.currentPrice * (1 + option.step));
            const affordable = canBidAt(state, nextPrice);
            return (
              <button
                type="button"
                className="btn bid-btn"
                disabled={!canPlayerAct || !affordable}
                onClick={() => props.onBid(option.choice)}
                key={option.choice}
                title={!affordable ? "现金与可用信用不足" : undefined}
              >
                {option.label}
                <span className="bid-sub num">叫价 ¥{formatMoney(nextPrice)}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="btn btn-danger bid-btn exit"
            disabled={!canPlayerAct}
            onClick={() => props.onBid("exit")}
          >
            退出
            <span className="bid-sub">保留资金</span>
          </button>
        </div>
        {!canPlayerAct && !state.deal ? (
          <div className="center muted small">
            {state.playerInAuction ? "等待其他买家表态……" : "你已退出本件拍品竞价。"}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-title">情报交易 · 每次消耗 1 点</div>
        <div className="bid-panel">
          {INTEL_OPTIONS.map((option) => (
            <button
              type="button"
              className="btn btn-violet bid-btn"
              disabled={!canUseIntel}
              onClick={() => props.onIntel(option.action)}
              key={option.action}
            >
              {option.label}
              <span className="bid-sub">{option.detail}</span>
            </button>
          ))}
        </div>
      </section>

      {state.deal ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="成交结果">
          <div className={`deal-card ${state.deal.wonBy === "player" ? "win" : "lose"}`}>
            <div className="deal-stamp">{state.deal.wonBy === "player" ? "成交！" : "落槌"}</div>
            <div className="item-name">{state.deal.item.name}</div>
            {state.deal.wonBy === "player" ? (
              <>
                <p className="green bold">你以 ¥{formatMoney(state.deal.price)} 赢下拍品</p>
                <p className="muted small">藏品已进入库存，真相留待结算时鉴定。</p>
              </>
            ) : (
              <>
                <p className="red bold">
                  被 {state.deal.wonByName} 以 ¥{formatMoney(state.deal.price)} 拍走
                </p>
                {state.deal.reveal ? (
                  <div className="panel">
                    <div className="panel-title">复盘揭示</div>
                    <div className="stat-value gold num">真实价值 ¥{formatMoney(state.deal.reveal.trueValue)}</div>
                    <span
                      className={`tag ${
                        state.deal.reveal.authenticity === "真品"
                          ? "tag-green"
                          : state.deal.reveal.authenticity === "高仿"
                            ? "tag-gold"
                            : "tag-red"
                      }`}
                    >
                      {state.deal.reveal.authenticity}
                    </span>
                  </div>
                ) : null}
              </>
            )}
            <button type="button" className="btn btn-gold btn-lg btn-block" onClick={props.onDealContinue}>
              继续
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default AuctionScreen;




