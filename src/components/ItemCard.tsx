"use client";

import type { ReactNode } from "react";

import { itemMarketValue } from "@/game/engine";
import { formatMoney, formatMult } from "@/game/format";
import type { GameState, Item, Tag } from "@/game/types";

import { ItemIcon } from "./ItemIcon";

export interface ItemCardProps {
  item: Item;
  state: GameState;
  children?: ReactNode;
}

function tagClass(tag: Tag): string {
  if (tag === "禁品" || tag === "失窃品") return "tag tag-red";
  if (tag === "皇室" || tag === "名家") return "tag tag-gold";
  if (tag === "异域来客") return "tag tag-violet";
  return "tag tag-cyan";
}

function authenticityClass(authenticity: Item["authenticity"]): string {
  if (authenticity === "真品") return "tag tag-green";
  if (authenticity === "高仿") return "tag tag-gold";
  return "tag tag-red";
}

export function ItemCard({ item, state, children }: ItemCardProps) {
  const marketMult = state.market[item.category] ?? 1;
  const currentMarketValue = itemMarketValue(state, item);

  return (
    <article className={`item-card${item.rarity === "legendary" ? " legendary" : ""}`}>
      <div className="item-card-head">
        <ItemIcon category={item.category} size="md" />
        <div className="item-card-title">
          <div className="item-name">{item.name}</div>
          <div className="item-sub">
            {item.category} · 品相：{item.condition} · 第 {item.acquiredRound || state.auctionNumber} 场入手
          </div>
        </div>
      </div>

      <div className="item-card-tags">
        {item.rarity === "legendary" ? <span className="legendary-tag">✦ 传奇</span> : null}
        {item.tags.map((tag) => (
          <span className={tagClass(tag)} key={tag}>
            {tag}
          </span>
        ))}
        {item.setInfo ? <span className="tag tag-violet">{item.setInfo.partLabel}</span> : null}
        {item.pawned ? (
          <span className="tag tag-red">已抵押 · 剩余 {item.pawned.roundsLeft} 场</span>
        ) : null}
      </div>

      <div className="item-card-body">
        <div className="stat">
          <div className="stat-label">{item.appraised ? "鉴定真实价值" : "未鉴定估价区间"}</div>
          <div className="stat-value gold num">
            {item.appraised
              ? `¥${formatMoney(item.trueValue)}`
              : `¥${formatMoney(item.estimateLow)} ~ ¥${formatMoney(item.estimateHigh)}`}
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">当前市场</div>
          <div className={`stat-value num ${marketMult > 1 ? "green" : marketMult < 1 ? "red" : ""}`}>
            {formatMult(marketMult)}
          </div>
          <div className="tiny muted">
            {item.appraised ? `行情参考 ¥${formatMoney(currentMarketValue)}` : `估价中位数 ¥${formatMoney(item.estimateMedian)}`}
          </div>
        </div>
      </div>

      {item.appraised ? (
        <div className="item-card-tags">
          <span className={authenticityClass(item.authenticity)}>{item.authenticity}</span>
          <span className="tag">品相：{item.condition}</span>
        </div>
      ) : (
        <div className="notice" style={{ margin: 0 }}>
          尚未鉴定：直接出售时买家会利用信息差压价。
        </div>
      )}

      {item.setInfo ? (
        <div className="clue-item">
          套装「{item.setInfo.setName}」· 第 {item.setInfo.index}/{item.setInfo.size} 件
        </div>
      ) : null}

      {children ? <div className="item-card-actions">{children}</div> : null}
    </article>
  );
}

export default ItemCard;
