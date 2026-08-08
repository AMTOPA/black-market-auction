"use client";

import { computeNetAssets, entryFee, itemMarketValue } from "@/game/engine";
import { formatMoney, formatMoneyCn, formatMult } from "@/game/format";
import type { GameState, ItemAction } from "@/game/types";

import { ItemCard } from "./ItemCard";

export interface SettlementScreenProps {
  state: GameState;
  onAction: (itemId: string, action: ItemAction) => void;
  onSpecial: (itemId: string) => void;
  onNextRound: () => void;
  onHome: () => void;
}

function round100(value: number): number {
  return Math.round(value / 100) * 100;
}

export function SettlementScreen({ state, onAction, onSpecial, onNextRound, onHome }: SettlementScreenProps) {
  const specialBuyer = state.specialBuyer;
  const nextEntryFee = entryFee(state.level);
  const netAssets = computeNetAssets(state);

  const handleHome = () => {
    if (window.confirm("确定返回主页吗？请确认当前进度已经保存。")) {
      onHome();
    }
  };

  return (
    <main className="screen">
      <section className="panel panel-gold fade-in-up">
        <div className="section-title">拍卖会 #{state.auctionNumber} · 场后结算</div>
        <div className="grid grid-4">
          <div className="stat">
            <div className="stat-value green num" title={`¥${formatMoney(state.cash)}`}>
              ¥{formatMoneyCn(state.cash)}
            </div>
            <div className="stat-label">现金</div>
          </div>
          <div className="stat">
            <div className={`stat-value num ${netAssets >= 0 ? "gold" : "red"}`} title={`¥${formatMoney(netAssets)}`}>
              ¥{formatMoneyCn(netAssets)}
            </div>
            <div className="stat-label">净资产</div>
          </div>
          <div className="stat">
            <div className={`stat-value num ${state.debt > 0 ? "red" : ""}`} title={`¥${formatMoney(state.debt)}`}>
              ¥{formatMoneyCn(state.debt)}
            </div>
            <div className="stat-label">债务</div>
          </div>
          <div className="stat">
            <div className={`stat-value num ${state.inventory.length >= 6 ? "red" : "violet"}`}>
              {state.inventory.length}/6
            </div>
            <div className="stat-label">库存占用</div>
          </div>
        </div>
        <div className="notice" style={{ margin: "12px 0 0" }}>
          下一场入场费为 <strong className="num">¥{formatMoney(nextEntryFee)}</strong>。进入下一场时还会结算仓储费、债务利息与到期抵押品。
        </div>
      </section>

      {specialBuyer ? (
        <section className="panel panel-gold" style={{ marginTop: 16 }}>
          <div className="section-title">
            {specialBuyer.emoji} 特殊买家「{specialBuyer.name}」正在收货
          </div>
          <div className="small">
            求购：{specialBuyer.wantCategory}
            {specialBuyer.wantTag ? ` · 偏爱「${specialBuyer.wantTag}」` : ""} · 报价倍率{" "}
            <strong className="gold num">{formatMult(specialBuyer.mult)}</strong>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            {specialBuyer.blurb}
          </div>
        </section>
      ) : null}

      <div className="stage" style={{ marginTop: 16 }}>
        <div className="stage-main">
          <section className="panel">
            <div className="section-title">库存清单</div>
            {state.inventory.length > 0 ? (
              <div className="grid grid-2">
                {state.inventory.map((item) => {
                  const appraisalCost = round100(item.estimateMedian * 0.05);
                  const redeemCost = item.pawned ? round100(item.pawned.principal * 1.1) : 0;
                  const specialMatch = specialBuyer?.wantCategory === item.category;
                  const currentValue = itemMarketValue(state, item);

                  return (
                    <ItemCard item={item} state={state} key={item.id}>
                      {specialMatch && specialBuyer ? (
                        <button type="button" className="btn btn-gold" onClick={() => onSpecial(item.id)}>
                          出售给特殊买家 {formatMult(specialBuyer.mult)}
                        </button>
                      ) : null}

                      {item.pawned ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-green"
                            disabled={state.cash < redeemCost}
                            title={state.cash < redeemCost ? "现金不足" : undefined}
                            onClick={() => onAction(item.id, "redeem")}
                          >
                            赎回 · ¥{formatMoney(redeemCost)}
                          </button>
                          <button type="button" className="btn" onClick={() => onAction(item.id, "hold")}>
                            继续持有
                          </button>
                        </>
                      ) : (
                        <>
                          {!item.appraised ? (
                            <button
                              type="button"
                              className="btn btn-violet"
                              disabled={state.cash < appraisalCost}
                              title={state.cash < appraisalCost ? "现金不足" : undefined}
                              onClick={() => onAction(item.id, "appraise")}
                            >
                              鉴定 · ¥{formatMoney(appraisalCost)}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-green"
                            title={item.appraised ? `当前行情参考 ¥${formatMoney(currentValue)}` : "未鉴定出售会被买家压价"}
                            onClick={() => onAction(item.id, "sell")}
                          >
                            {item.appraised ? "出售" : "出售（未鉴定折价）"}
                          </button>
                          <button type="button" className="btn btn-gold" onClick={() => onAction(item.id, "pawn")}>
                            抵押
                          </button>
                          <button type="button" className="btn" onClick={() => onAction(item.id, "hold")}>
                            持有
                          </button>
                        </>
                      )}
                    </ItemCard>
                  );
                })}
              </div>
            ) : (
              <div className="notice center" style={{ margin: 0 }}>
                库存空空如也。保留现金，准备下一场机会。
              </div>
            )}
          </section>
        </div>

        <div className="stage-side">
          <section className="panel">
            <div className="section-title">新闻与市场风声</div>
            {state.news.length > 0 ? (
              state.news.map((news) => (
                <article className="news-item" key={news.id}>
                  <div className="news-title">{news.title}</div>
                  <div className="news-hint">{news.hint}</div>
                </article>
              ))
            ) : (
              <div className="muted small">本场没有值得记录的额外风声。</div>
            )}
            <div className="market-grid" style={{ marginTop: 12 }}>
              {Object.entries(state.market).map(([category, mult]) => (
                <div className="market-cell" key={category}>
                  <div className="cat">{category}</div>
                  <div className={`mult ${mult > 1 ? "up" : mult < 1 ? "down" : "flat"}`}>{formatMult(mult)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="btn-row" style={{ flexDirection: "column" }}>
              <button type="button" className="btn btn-gold btn-lg btn-block" onClick={onNextRound}>
                进入下一场拍卖会 · 入场费 ¥{formatMoney(nextEntryFee)}
              </button>
              <button type="button" className="btn btn-block" onClick={handleHome}>
                回主页
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default SettlementScreen;
