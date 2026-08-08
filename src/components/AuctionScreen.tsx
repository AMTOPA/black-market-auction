"use client";

import { useEffect, useRef } from "react";

import { availableCredit, canBidAt, recentLog } from "@/game/engine";
import { formatMoney, formatMoneyCn, formatMult } from "@/game/format";
import type { BidChoice, GameState, IntelAction } from "@/game/types";

import { HUD } from "./HUD";
import { ItemIcon } from "./ItemIcon";

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
      <main className="screen screen-narrow">
        <HUD state={state} onEndRun={props.onEndRun} />
        <div className="notice" style={{ marginTop: 16 }}>
          拍品资料正在整理，请稍候。
        </div>
      </main>
    );
  }

  const marketMult = state.market[item.category] ?? 1;
  const marketDirection = marketMult > 1 ? "up" : marketMult < 1 ? "down" : "flat";
  const marketArrow = marketMult > 1 ? "↑" : marketMult < 1 ? "↓" : "→";

  const playerStillIn = state.activeBidders.includes("player");

  return (
    <main className="screen">
      <HUD state={state} onEndRun={props.onEndRun} />

      <div className="stage" style={{ marginTop: 16 }}>
        {/* ---- 左：聚光灯舞台 ---- */}
        <div className="stage-main">
          <section className="spotlight-card">
            <div className="kicker">
              LOT {state.itemIndex + 1} / {state.itemsThisRound.length} · 地下拍卖现场
            </div>
            <div className="spotlight-top" style={{ marginTop: 12 }}>
              <ItemIcon category={item.category} size="lg" />
              <div className="spotlight-identity">
                <h2 className="spotlight-name">{item.name}</h2>
                <div className="spotlight-sub">
                  {item.category} · 品相：{item.condition}
                  {item.setInfo ? ` · 套装「${item.setInfo.setName}」${item.setInfo.partLabel}` : ""}
                </div>
                <div className="spotlight-tags">
                  {item.tags.map((tag) => (
                    <span className="tag tag-gold" key={tag}>
                      {tag}
                    </span>
                  ))}
                  {item.setInfo ? <span className="tag tag-violet">{item.setInfo.partLabel}</span> : null}
                </div>
              </div>
            </div>

            <div className="spotlight-meta">
              <div className="meta-cell">
                <div className="kicker">行家估价</div>
                <div className="meta-big gold num">
                  ¥{formatMoney(item.estimateLow)} ~ ¥{formatMoney(item.estimateHigh)}
                </div>
                <div className="meta-small">中位数 ¥{formatMoney(item.estimateMedian)}</div>
              </div>
              <div className="meta-cell">
                <div className="kicker">当前叫价</div>
                <div className="meta-big gold num">¥{formatMoney(state.currentPrice)}</div>
                <div className={`meta-small ${marketDirection === "up" ? "green" : marketDirection === "down" ? "red" : ""}`}>
                  {item.category}行情 {marketArrow} {formatMult(marketMult)}
                </div>
              </div>
              <div className="meta-cell">
                <div className="kicker">可调度资金</div>
                <div className="meta-big num">¥{formatMoneyCn(spendingPower)}</div>
                <div className="meta-small">现金 + 可用信用</div>
              </div>
            </div>

            <div className="section-title" style={{ marginTop: 18 }}>
              公开线索
            </div>
            <div className="clue-list">
              {item.clues.map((clue) => (
                <div className="clue-item" key={clue.id}>
                  {clue.text}
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">现场记录</div>
            <div className="log-panel" ref={logRef} aria-live="polite">
              <div className="log">
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
          </section>
        </div>

        {/* ---- 右：买家席 + 情报 ---- */}
        <div className="stage-side">
          <section className="panel">
            <div className="section-title">买家席</div>
            <div className="bidder-rail">
              <div
                className={`bidder-row player-row ${state.currentBidder === "player" ? "active" : ""} ${
                  playerStillIn ? "" : "out"
                }`}
              >
                <span className="avatar">🎩</span>
                <div className="bidder-info">
                  <div className="bidder-name">你</div>
                  <div className="bidder-kind" title={`现金与信用合计 ¥${formatMoney(spendingPower)}`}>
                    黑市经营者 · 可调度 ¥{formatMoneyCn(spendingPower)}
                  </div>
                </div>
                <div className="bidder-status">
                  {!playerStillIn ? (
                    <span className="tag tag-red">出局</span>
                  ) : state.currentBidder === "player" ? (
                    <>
                      <span className="turn-dot" aria-hidden="true" />
                      <span className="turn-tag">出价</span>
                    </>
                  ) : null}
                </div>
              </div>

              {state.bidders.map((bidder) => {
                const isActive = state.currentBidder === bidder.id;
                const isInAuction = state.activeBidders.includes(bidder.id);
                return (
                  <div className={`bidder-row ${isActive ? "active" : ""} ${isInAuction ? "" : "out"}`} key={bidder.id}>
                    <span className="avatar">{bidder.emoji}</span>
                    <div className="bidder-info">
                      <div className="bidder-name">{bidder.name}</div>
                      <div className="bidder-kind">
                        {bidder.kind} · 财力：{bidder.wealthTier}
                      </div>
                    </div>
                    <div className="bidder-status">
                      {!isInAuction ? (
                        <span className="tag tag-red">出局</span>
                      ) : isActive ? (
                        <>
                          <span className="turn-dot" aria-hidden="true" />
                          <span className="turn-tag">出价</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <div className="section-title">情报交易 · 每次 1 点</div>
            <div className="intel-bar">
              {INTEL_OPTIONS.map((option) => (
                <button
                  type="button"
                  className="intel-btn"
                  disabled={!canUseIntel}
                  onClick={() => props.onIntel(option.action)}
                  key={option.action}
                  title={option.detail}
                >
                  {option.label}
                  <span className="tiny" style={{ opacity: 0.72 }}>
                    {" "}
                    · {option.detail}
                  </span>
                </button>
              ))}
            </div>
            {canUseIntel ? null : state.intel === 0 ? (
              <div className="center muted tiny" style={{ marginTop: 8 }}>
                本场情报点已耗尽，留待下一场补充。
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {state.inventoryFullNotice ? (
        <div className="notice" style={{ marginTop: 16 }}>
          库存已满（{state.inventory.length}/6），本件拍品只能旁观。请在结算阶段出售或抵押藏品。
        </div>
      ) : null}

      {/* ---- 底部：竞价操作区 ---- */}
      <section className="panel panel-gold action-bar" style={{ marginTop: 16 }}>
        <div className="bid-bar">
          {BID_OPTIONS.map((option) => {
            const nextPrice = round100(state.currentPrice * (1 + option.step));
            const affordable = canBidAt(state, nextPrice);
            const tone = option.choice === "small" ? "small" : option.choice === "standard" ? "standard" : "strong";
            return (
              <button
                type="button"
                className={`bid-btn-lg ${tone}`}
                disabled={!canPlayerAct || !affordable}
                onClick={() => props.onBid(option.choice)}
                key={option.choice}
                title={!affordable ? "现金与可用信用不足" : undefined}
              >
                <span className="bid-main">{option.label}</span>
                <span className="bid-sub num">叫价 ¥{formatMoney(nextPrice)}</span>
              </button>
            );
          })}
          <button
            type="button"
            className="bid-btn-lg exit"
            disabled={!canPlayerAct}
            onClick={() => props.onBid("exit")}
          >
            <span className="bid-main">退出</span>
            <span className="bid-sub">保留资金</span>
          </button>
        </div>
        {!canPlayerAct && !state.deal ? (
          <div className="center muted small">
            {state.playerInAuction ? "等待其他买家表态……" : "你已退出本件拍品竞价。"}
          </div>
        ) : null}
      </section>

      {state.deal ? (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="成交结果">
          <div className={`deal-card ${state.deal.wonBy === "player" ? "win" : "lose"}`}>
            <div className="deal-icon">
              <ItemIcon category={state.deal.item.category} size="md" />
            </div>
            <div className="deal-stamp">{state.deal.wonBy === "player" ? "成交！" : "落槌"}</div>
            <div className="deal-item-name">{state.deal.item.name}</div>
            {state.deal.wonBy === "player" ? (
              <>
                <div className="deal-price green num">¥{formatMoney(state.deal.price)}</div>
                <p className="deal-note">藏品已进入库存，真相留待结算时鉴定。</p>
              </>
            ) : (
              <>
                <div className="deal-price red num">¥{formatMoney(state.deal.price)}</div>
                <p className="deal-note">被 {state.deal.wonByName} 拍走</p>
                {state.deal.reveal ? (
                  <div className="panel" style={{ marginTop: 14 }}>
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
            <button
              type="button"
              className="btn btn-gold btn-lg btn-block"
              style={{ marginTop: 18 }}
              onClick={props.onDealContinue}
            >
              继续
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default AuctionScreen;
