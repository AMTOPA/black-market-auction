// ============ 黑市拍卖行 · 随机事件与委托池 ============
import { CONFIG } from "./config";
import { formatMoney } from "./format";
import { pick, rand, weightedPick } from "./rng";
import type { Category, Commission, CommissionKind, RoundEvent, RoundEventKind } from "./types";

let uid = 0;
const localId = () => `ev${Date.now().toString(36)}${(uid++).toString(36)}`;
const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);
const categories = () => CONFIG.categories as unknown as Category[];

/** 事件效果：引擎按 kind 应用 */
export interface EventEffect {
  kind:
    | "cash" // value: 现金比例（0.2 = +20% 现金）
    | "debt" // value: 债务比例
    | "interestMult" // value: 利息倍率
    | "storageMult" // value: 仓储费倍率
    | "specialGuaranteed" // 特殊买家必现
    | "bidderBudget" // value: 买家预算倍率
    | "categoryBoom"; // value: 行情倍率（>1 涨 / <1 跌），category 缺省时随机
  value?: number;
  category?: Category;
}

export interface RandomEventTemplate {
  id: string; // 稳定唯一 id（React key + 效果分发）
  kind: RoundEventKind;
  title: string;
  text: string;
  weight: number;
  effect?: EventEffect;
}

export const OPENING_EVENTS: RandomEventTemplate[] = [
  { id: "op-cash", kind: "opening", title: "神秘注资", text: "一位不愿露面的出资人看好你的眼光，往账户汇入一笔周转金。", weight: 12, effect: { kind: "cash", value: 0.2 } },
  { id: "op-debt", kind: "opening", title: "旧债寻踪", text: "一桩旧案的债务凭证浮出水面，债主上门催讨。", weight: 8, effect: { kind: "debt", value: 0.1 } },
  { id: "op-interest", kind: "opening", title: "债主加码", text: "放贷人风闻你要大举扫货，提前上调了今夜利息。", weight: 9, effect: { kind: "interestMult", value: 1.25 } },
  { id: "op-storage", kind: "opening", title: "库房被查", text: "巡捕房突击检查的风声四起，藏货仓储费用水涨船高。", weight: 9, effect: { kind: "storageMult", value: 1.3 } },
  { id: "op-boom-wine", kind: "opening", title: "酒窖清仓", text: "一位老酒商急病清仓，陈年佳酿大量流入拍场。", weight: 10, effect: { kind: "categoryBoom", category: "酒", value: 1.3 } },
  { id: "op-boom-jewel", kind: "opening", title: "珠宝展风波", text: "珠宝展失窃案震动市场，珠宝类估值集体看涨。", weight: 9, effect: { kind: "categoryBoom", category: "珠宝", value: 1.25 } },
  { id: "op-boom-painting", kind: "opening", title: "海外基金扫货", text: "海外基金追索东方旧藏，绘画拍品身价倍增。", weight: 9, effect: { kind: "categoryBoom", category: "绘画", value: 1.2 } },
  { id: "op-boom-curio", kind: "opening", title: "奇物热炒", text: "地下圈子里突然热炒来历不明的奇物，价格一路走高。", weight: 8, effect: { kind: "categoryBoom", category: "奇物", value: 1.2 } },
  { id: "op-buyers", kind: "opening", title: "国际藏家入场", text: "一队海外买家今夜抵达，腰包鼓胀、志在必得。", weight: 10, effect: { kind: "bidderBudget", value: 1.15 } },
  { id: "op-special", kind: "opening", title: "金主点名", text: "一位神秘金主放话：今夜必有高价收购。", weight: 7, effect: { kind: "specialGuaranteed" } },
];

export const SETTLEMENT_EVENTS: RandomEventTemplate[] = [
  { id: "st-commission", kind: "settlement", title: "匿名委托", text: "一位匿名藏家送来佣金，委托你继续搜集旧藏。", weight: 12, effect: { kind: "cash", value: 0.12 } },
  { id: "st-insurance", kind: "settlement", title: "保险理赔", text: "一场旧案的保险赔付终于到账。", weight: 10, effect: { kind: "cash", value: 0.1 } },
  { id: "st-cashback", kind: "settlement", title: "黑金回扣", text: "拍卖行暗地里返还了一笔手续费。", weight: 9, effect: { kind: "cash", value: 0.15 } },
  { id: "st-rumor", kind: "settlement", title: "黑市传闻", text: "传闻某类藏品即将被爆炒，市场暗流涌动。", weight: 11, effect: { kind: "categoryBoom", value: 1.15 } },
  { id: "st-crash", kind: "settlement", title: "行情预警", text: "内线警告某类藏品即将遭打压，出手要快。", weight: 9, effect: { kind: "categoryBoom", value: 0.85 } },
  { id: "st-mystery", kind: "settlement", title: "神秘买家现身", text: "一位神秘买家托话：点名要收某类藏品。", weight: 8, effect: { kind: "specialGuaranteed" } },
  { id: "st-storage", kind: "settlement", title: "仓储特权", text: "你与仓库老板谈成长期合作，仓储费大幅打折。", weight: 10, effect: { kind: "storageMult", value: 0.5 } },
  { id: "st-interest", kind: "settlement", title: "债务宽限", text: "债主心情大好，宣布今夜利息减半。", weight: 8, effect: { kind: "interestMult", value: 0.5 } },
  { id: "st-favor", kind: "settlement", title: "线人馈赠", text: "情报线人送来一份谢礼，庆贺你全身而退。", weight: 7, effect: { kind: "cash", value: 0.08 } },
];

export function rollOpeningTemplate(): RandomEventTemplate {
  return weightedPick(OPENING_EVENTS.map((t) => ({ value: t, weight: t.weight })));
}

export function rollSettlementTemplate(): RandomEventTemplate {
  return weightedPick(SETTLEMENT_EVENTS.map((t) => ({ value: t, weight: t.weight })));
}

/** 生成一场委托（每场开局随机给一个，供玩家本场完成） */
export function rollCommission(level: number, peakNet: number): Commission {
  const reward = round100(
    Math.max(CONFIG.commissionRewardMin, (CONFIG.commissionRewardMin + peakNet * CONFIG.commissionRewardScale) * rand(0.85, 1.3)),
  );
  const rep = CONFIG.commissionRepAward;
  const kinds: CommissionKind[] = ["win_any", "buy_category", "avoid_fake", "appraise_any", "profit_target", "low_buy"];
  const kind = pick(kinds);
  const id = localId();
  switch (kind) {
    case "win_any":
      return { id, kind, title: "暗线委托：一件入袋", desc: "本场至少拍下一件藏品", reward, rep };
    case "buy_category": {
      const cat = pick(categories());
      return { id, kind, title: `暗线委托：求购${cat}`, desc: `本场拍下一件「${cat}」类藏品`, reward, rep, targetCategory: cat };
    }
    case "avoid_fake":
      return { id, kind, title: "暗线委托：火眼金睛", desc: "本场拍下至少一件，且不让赝品进入库存", reward, rep };
    case "appraise_any":
      return { id, kind, title: "暗线委托：验明正身", desc: "本场至少鉴定一件藏品", reward, rep };
    case "profit_target": {
      const target = round100(Math.max(4000, peakNet * 0.12));
      return { id, kind, title: "暗线委托：落袋为安", desc: `本场卖出与特殊出售合计利润达到 ${formatMoney(target)}`, reward, rep, targetValue: target };
    }
    case "low_buy": {
      const ratio = 0.8;
      return { id, kind, title: "暗线委托：捡漏之王", desc: `以低于估价中位数 ${Math.round(ratio * 100)}% 的价格拍下一件`, reward, rep, targetValue: ratio };
    }
  }
}

/** 便捷：模板转展示用 RoundEvent（outcome 由引擎应用效果后补写） */
export function templateToEvent(template: RandomEventTemplate): RoundEvent {
  return { id: template.id, kind: template.kind, title: template.title, text: template.text };
}
