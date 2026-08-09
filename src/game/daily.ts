// ============ 黑市拍卖行 · 每日挑战（按日期确定性生成，公平可重复） ============
import { CONFIG } from "./config";
import { todayShanghai } from "./format";
import type { Category, GameState } from "./types";

export interface DailyChallenge {
  date: string;
  kind: "win2" | "cat2" | "noFake" | "profit" | "appraise2" | "setPart";
  title: string;
  desc: string;
  reward: number;
  rep: number;
  targetCategory?: Category;
}

const CATS: Category[] = ["绘画", "珠宝", "古币", "武器", "酒", "手稿", "雕塑", "奇物"];

function hashDate(date: string): number {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) >>> 0;
  return h;
}

export function todayChallenge(): DailyChallenge {
  const date = todayShanghai();
  const h = hashDate(date);
  const cat = CATS[h % CATS.length];
  const kindIdx = h % 6;
  const kinds: Array<{ kind: DailyChallenge["kind"]; title: string; desc: (c: Category) => string }> = [
    { kind: "win2", title: "双喜临门", desc: () => "本场至少拍下 2 件藏品" },
    { kind: "cat2", title: "专收一门", desc: (c) => `本场至少拍下 2 件「${c}」类藏品` },
    { kind: "noFake", title: "火眼金睛", desc: () => "本场不让任何赝品进入库存" },
    { kind: "profit", title: "落袋为安", desc: () => "本场卖出总利润达到 8,000" },
    { kind: "appraise2", title: "验明正身", desc: () => "本场至少鉴定 2 件藏品" },
    { kind: "setPart", title: "套装入册", desc: () => "本场入手 1 件套装组件" },
  ];
  const k = kinds[kindIdx];
  return {
    date,
    kind: k.kind,
    title: k.title,
    desc: k.desc(cat),
    reward: CONFIG.dailyChallengeReward,
    rep: CONFIG.dailyChallengeRep,
    targetCategory: k.kind === "cat2" ? cat : undefined,
  };
}

/** 判定今日挑战是否已完成（基于本场 roundStats / setsCollected） */
export function isChallengeDone(state: GameState, c: DailyChallenge): boolean {
  const s = state.roundStats ?? { wonCount: 0, wonCategories: [], fakesWon: 0, lowBuys: 0, appraisals: 0, realizedProfit: 0 };
  switch (c.kind) {
    case "win2":
      return (s.wonCount ?? 0) >= 2;
    case "cat2":
      return (s.wonCategories ?? []).filter((x) => x === c.targetCategory).length >= 2;
    case "noFake":
      return (s.wonCount ?? 0) >= 1 && (s.fakesWon ?? 0) === 0;
    case "profit":
      return (s.realizedProfit ?? 0) >= 8000;
    case "appraise2":
      return (s.appraisals ?? 0) >= 2;
    case "setPart":
      return Object.values(state.setsCollected ?? {}).some((parts) => parts.length >= 1);
    default:
      return false;
  }
}