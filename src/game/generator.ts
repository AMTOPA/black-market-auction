// ============ 黑市拍卖行 · 拍品 / 买家 / 新闻生成器 ============
import { CONFIG } from "./config";
import { nextId } from "./engine";
import { chance, pick, pickN, rand, randInt, shuffle, weightedPick } from "./rng";
import { formatMoney } from "./format";
import {
  ITEM_NAMES,
  ITEM_ADJECTIVES,
  GENUINE_CLUES,
  FAKE_CLUES,
  NEUTRAL_CLUES,
  NEWS_TEMPLATES,
  SET_TEMPLATES,
  AI_PROFILES,
  SPECIAL_BUYERS,
} from "./content";
import type {
  AIBidder,
  AIKind,
  Category,
  Clue,
  Condition,
  Item,
  NewsEvent,
  SpecialBuyer,
  Tag,
  IntelAction,
} from "./types";

const TAGS: Tag[] = ["皇室", "战争遗物", "禁品", "失窃品", "名家", "异域来客"];

const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);
const categories = () => CONFIG.categories as unknown as Category[];

function levelIndex(level: number): number {
  return Math.max(0, Math.min(level - 1, CONFIG.valueRanges.length - 1));
}

function rollCondition(): Condition {
  return weightedPick(CONFIG.conditionWeights.map((x) => ({ value: x.c, weight: x.w })));
}

function rollAuthenticity(level: number): Item["authenticity"] {
  const weights = CONFIG.authWeightsByLevel[levelIndex(level)];
  return weightedPick([
    { value: "真品" as const, weight: weights[0] },
    { value: "高仿" as const, weight: weights[1] },
    { value: "赝品" as const, weight: weights[2] },
  ]);
}

function rollTags(level: number): Tag[] {
  const boost = level >= 5 ? 2 : 1;
  const pool: Tag[] = [];
  const table: Array<[Tag, number]> = [
    ["名家", 0.08],
    ["战争遗物", 0.06],
    ["皇室", 0.04],
    ["禁品", 0.05],
    ["失窃品", 0.05],
    ["异域来客", 0.06],
  ];
  for (const [tag, p] of table) {
    if (chance(Math.min(1, p * boost))) pool.push(tag);
  }
  return pickN(pool, 2);
}

function buildClues(authenticity: Item["authenticity"]): Clue[] {
  const genuine = authenticity === "真品";
  const mainPool = genuine ? GENUINE_CLUES : FAKE_CLUES;
  const oppositePool = genuine ? FAKE_CLUES : GENUINE_CLUES;
  const chosen = shuffle(mainPool).slice(0, 2).map((t) => ({ ...t }));

  // 误导线索：小概率混入一条相反方向的
  const misleading = genuine ? chance(0.25) : chance(0.3);
  if (misleading && chosen.length > 0) {
    const replaceIdx = randInt(0, chosen.length - 1);
    chosen[replaceIdx] = { ...pick(oppositePool) };
  }

  const clues: Clue[] = chosen.map((t) => {
    const isFake = oppositePool.includes(t);
    const signal = genuine ? (isFake ? -1 : 1) : isFake ? 1 : -1;
    return { id: Number(nextId().replace(/\D/g, "") || 1), text: t.text, signal, strength: t.strength };
  });

  // 追加一条中性线索
  const neutral = pick(NEUTRAL_CLUES);
  clues.push({ id: Number(nextId().replace(/\D/g, "") || 1), text: neutral.text, signal: 0, strength: neutral.strength });
  return clues;
}

function pickSet(usedThisAuction: boolean): { used: boolean; setInfo?: Item["setInfo"]; partName?: string } {
  if (usedThisAuction) return { used: true };
  if (!chance(CONFIG.setChance * 1.2)) return { used: false };
  const template = pick(SET_TEMPLATES);
  const size = template.parts.length;
  const index = randInt(1, size);
  const partName = `${template.setName}·${template.parts[index - 1]}`;
  return {
    used: true,
    partName,
    setInfo: { setId: template.setId, setName: template.setName, index, size, partLabel: `${template.setName} · ${index}/${size}` },
  };
}

export function generateAuctionItems(level: number, market: Record<Category, number>, count: number, auctionNumber: number): Item[] {
  const items: Item[] = [];
  let setUsed = false;
  for (let i = 0; i < count; i += 1) {
    const range = CONFIG.valueRanges[levelIndex(level)];
    const category = pick(categories());
    const baseValue = round100(randInt(range[0], range[1]));
    const authenticity = rollAuthenticity(level);
    const condition = rollCondition();
    const conditionMult = CONFIG.conditionMult[condition];
    const authMult = CONFIG.authMult[authenticity];
    const trueValue = round100(baseValue * conditionMult * authMult);

    const median = round100(baseValue * rand(0.85, 1.15));
    const width = CONFIG.estimateWidthByLevel[levelIndex(level)];
    const estimateLow = round100(median * (1 - width));
    const estimateHigh = round100(median * (1 + width));

    const setRoll = pickSet(setUsed);
    setUsed = setRoll.used;
    const name = setRoll.partName ?? `${pick(ITEM_ADJECTIVES)}${pick(ITEM_NAMES[category])}`;

    items.push({
      id: nextId(),
      name,
      category,
      baseValue,
      authenticity,
      condition,
      conditionMult,
      authMult,
      tags: rollTags(level),
      setInfo: setRoll.setInfo,
      marketAtAcquire: market[category] ?? 1,
      trueValue,
      estimateLow,
      estimateHigh,
      estimateMedian: median,
      clues: buildClues(authenticity),
      appraised: false,
      pawned: null,
      acquiredRound: 0,
      acquiredLevel: level,
      soldFor: null,
      profit: null,
    });
  }
  return items;
}

export function generateAIBidders(level: number): AIBidder[] {
  const kinds = pickN(Object.keys(AI_PROFILES) as AIKind[], CONFIG.numBidders);
  const range = CONFIG.valueRanges[levelIndex(level)];
  const mid = (range[0] + range[1]) / 2;

  return kinds.map((kind) => {
    const profile = AI_PROFILES[kind];
    const [multLow, multHigh] = CONFIG.bidderBudgetMult[kind];
    const budget = round100(mid * rand(multLow, multHigh) * rand(0.85, 1.15));

    let preferred: Category[];
    if (kind === "富豪") {
      preferred = pickN(["绘画", "雕塑", "珠宝"] as Category[], randInt(1, 2));
    } else {
      preferred = pickN(categories(), profile.preferredCount[0]);
    }

    const wealthTier =
      budget < 15000 ? "拮据" : budget < 60000 ? "普通" : budget < 200000 ? "富裕" : budget < 800000 ? "雄厚" : "深不可测";

    return {
      id: nextId(),
      name: pick(profile.names),
      kind,
      emoji: pick(profile.emojis),
      budget,
      preferred,
      risk: profile.risk,
      valuation: 0,
      wants: true,
      bluffing: false,
      bluffCeiling: 0,
      patience: randInt(profile.patience[0], profile.patience[1]),
      heldItems: 0,
      wealthTier,
    };
  });
}

export function pickNews(): NewsEvent[] {
  const n = randInt(1, 2);
  return pickN(NEWS_TEMPLATES, n).map((t) => ({
    id: Number(nextId().replace(/\D/g, "") || 1),
    title: t.title,
    hint: t.hint,
    affects: [...t.affects],
  }));
}

export function rollSpecialBuyer(): SpecialBuyer | null {
  if (!chance(CONFIG.specialBuyerChance)) return null;
  const buyer = pick(SPECIAL_BUYERS);
  return {
    name: buyer.name,
    emoji: buyer.emoji,
    wantCategory: pick(categories()),
    wantTag: chance(0.3) ? pick(TAGS) : null,
    mult: Math.round(rand(CONFIG.specialBuyerMultMin, CONFIG.specialBuyerMultMax) * 10) / 10,
    blurb: buyer.blurb,
  };
}

/** 引擎在每件拍品开始时调用，重置买家对本件的估值与意图 */
export function aiPrepareItem(bidder: AIBidder, item: Item, marketMult: number, level: number): Partial<AIBidder> {
  const profile = AI_PROFILES[bidder.kind];
  let prefMult = bidder.preferred.includes(item.category)
    ? bidder.kind === "收藏家"
      ? 1.45
      : bidder.kind === "富豪"
        ? 1.15
        : 1.25
    : 1.0;
  if (bidder.kind === "收藏家" && item.setInfo) prefMult = 1.5;

  let valuation = Math.round(item.trueValue * marketMult * prefMult * (1 + (bidder.risk * 2 - 1) * 0.25));
  const width = (item.estimateHigh - item.estimateLow) / Math.max(1, item.estimateMedian);
  if (bidder.kind === "赌徒" && width > 0.8) valuation = Math.round(valuation * 1.3);

  // 黄牛只追明显低估
  const wants = bidder.kind === "黄牛" ? valuation >= item.estimateMedian * 1.15 : true;
  const bluffing = bidder.kind === "老狐狸" && level >= 2 && chance(profile.bluffChance);
  const bluffCeiling = Math.min(valuation * 0.9, bidder.budget * 0.55);

  return {
    valuation,
    wants,
    bluffing,
    bluffCeiling,
    patience: randInt(profile.patience[0], profile.patience[1]),
  };
}

/** 情报揭示：不直接暴露精确真值 */
export function intelReveal(item: Item, action: IntelAction, bidders: AIBidder[], marketMult: number): string {
  switch (action) {
    case "authenticity": {
      if (item.authenticity === "真品") return "多方线索指向真品，但仍有高仿的可能。";
      if (item.authenticity === "高仿") return "有较高概率是高仿，需要谨慎对待。";
      return "多条线索指向赝品，风险极高。";
    }
    case "estimate": {
      const low = round100(item.trueValue * 0.85);
      const high = round100(item.trueValue * 1.15);
      return `合理价值大概率在 ${formatMoney(low)} ~ ${formatMoney(high)} 之间。`;
    }
    case "buyer": {
      if (bidders.length === 0) return "买家席暂无人可查。";
      const b = pick(bidders);
      return `「${b.name}」偏好 ${b.preferred.join("、")}，财力${b.wealthTier}。`;
    }
    case "clue": {
      const clue = pick(item.clues);
      const verdict = clue.signal === 1 ? "比较可靠，可以采信。" : clue.signal === -1 ? "有误导嫌疑，需要怀疑。" : "不置可否，参考价值有限。";
      return `「${clue.text}」这条线索${verdict}`;
    }
    default:
      return "情报贩子摇了摇头。";
  }
}


