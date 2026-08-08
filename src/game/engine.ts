// ============ 黑市拍卖行 · 游戏引擎（纯逻辑，无 DOM 依赖） ============
import { CONFIG } from "./config";
import {
  generateAuctionItems,
  generateAIBidders,
  pickNews,
  rollSpecialBuyer,
  aiPrepareItem,
  intelReveal,
} from "./generator";
import {
  rollOpeningTemplate,
  rollSettlementTemplate,
  rollCommission,
  templateToEvent,
  type EventEffect,
  type RandomEventTemplate,
} from "./events";
import { chance, pick } from "./rng";
import { formatMoney, formatMult } from "./format";
import type {
  GameState,
  GameMode,
  Item,
  AIBidder,
  BidChoice,
  IntelAction,
  ItemAction,
  LogEntry,
  Category,
  DealResult,
  RunResult,
} from "./types";

let uid = 0;
export const nextId = () => `e${Date.now().toString(36)}${(uid++).toString(36)}`;

const round100 = (n: number) => Math.max(0, Math.round(n / 100) * 100);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const EMPTY_STATS = () => ({
  wonCount: 0,
  wonCategories: [] as Category[],
  fakesWon: 0,
  lowBuys: 0,
  appraisals: 0,
  realizedProfit: 0,
});

// ---------------- 等级与费用 ----------------

export function computeLevel(peak: number): number {
  const t = CONFIG.levelThresholds;
  let level = 1;
  for (let i = 1; i < t.length; i++) if (peak >= t[i]) level = i + 1;
  if (peak >= t[t.length - 1]) {
    const step = CONFIG.levelStepBeyond;
    level = t.length + Math.floor((peak - t[t.length - 1]) / step);
  }
  return level;
}

export function entryFee(level: number): number {
  const base = CONFIG.entryFees[Math.min(level - 1, CONFIG.entryFees.length - 1)];
  const extra = Math.max(0, level - CONFIG.entryFees.length);
  return round100(base * Math.pow(CONFIG.entryFeeGrowth, extra));
}

export function levelName(level: number): string {
  const names = CONFIG.levelNames;
  if (level <= names.length) return names[level - 1];
  return names[names.length - 1] + " " + level;
}

// ---------------- 估值 ----------------

export function conservativeValue(item: Item): number {
  const base = item.appraised ? item.trueValue : item.estimateMedian;
  const ratio = item.appraised ? CONFIG.estHaircutAppraised : CONFIG.estHaircutRaw;
  return Math.round(base * ratio);
}

export function itemMarketValue(state: GameState, item: Item): number {
  return Math.round(item.trueValue * (state.market[item.category] ?? 1));
}

export function computeNetAssets(state: GameState): number {
  const inv = state.inventory.reduce((s, it) => s + conservativeValue(it), 0);
  return state.cash + inv - state.debt;
}

export function availableCredit(state: GameState): number {
  const credit = Math.max(0, computeNetAssets(state) * CONFIG.creditRatio - state.debt);
  return Math.max(0, credit);
}

export function canBidAt(state: GameState, price: number): boolean {
  return state.cash + availableCredit(state) >= price;
}

// ---------------- 随机事件应用 ----------------

/** 按事件模板应用效果，返回新状态与结果文案 */
function applyEvent(state: GameState, template: RandomEventTemplate): { state: GameState; outcome: string } {
  const effect: EventEffect | undefined = template.effect;
  if (!effect) return { state, outcome: "风平浪静，无事发生。" };
  const s: GameState = { ...state, market: { ...state.market }, roundModifiers: state.roundModifiers ? { ...state.roundModifiers } : null };
  switch (effect.kind) {
    case "cash": {
      const amount = round100(s.cash * (effect.value ?? 0.1));
      s.cash += amount;
      return { state: s, outcome: `现金 +${formatMoney(amount)}` };
    }
    case "debt": {
      const amount = round100(s.debt * (effect.value ?? 0.1));
      s.debt += amount;
      return { state: s, outcome: `债务 +${formatMoney(amount)}` };
    }
    case "interestMult": {
      const mult = effect.value ?? 1;
      s.roundModifiers = { ...(s.roundModifiers ?? {}), interestMult: (s.roundModifiers?.interestMult ?? 1) * mult };
      return { state: s, outcome: `债务利息 ×${formatMult(mult)}` };
    }
    case "storageMult": {
      const mult = effect.value ?? 1;
      s.roundModifiers = { ...(s.roundModifiers ?? {}), storageMult: (s.roundModifiers?.storageMult ?? 1) * mult };
      return { state: s, outcome: `仓储费 ×${formatMult(mult)}` };
    }
    case "specialGuaranteed": {
      s.roundModifiers = { ...(s.roundModifiers ?? {}), specialBuyerGuaranteed: true };
      return { state: s, outcome: "特殊买家必现" };
    }
    case "bidderBudget": {
      const mult = effect.value ?? 1;
      s.roundModifiers = { ...(s.roundModifiers ?? {}), bidderBudgetMult: (s.roundModifiers?.bidderBudgetMult ?? 1) * mult };
      return { state: s, outcome: `买家预算 ×${formatMult(mult)}` };
    }
    case "categoryBoom": {
      const cat = effect.category ?? pick(CONFIG.categories as unknown as Category[]);
      const mult = effect.value ?? 1.15;
      s.market = { ...s.market, [cat]: clamp((s.market[cat] ?? 1) * mult, CONFIG.marketMin, CONFIG.marketMax) };
      const applied = s.market[cat] ?? 1;
      return { state: s, outcome: `「${cat}」行情 ${formatMult(applied)}` };
    }
    default:
      return { state: s, outcome: "风平浪静，无事发生。" };
  }
}

// ---------------- 新游戏 / 开一场 ----------------

export function newGame(options?: { mode?: GameMode }): GameState {
  const market = {} as Record<Category, number>;
  for (const c of CONFIG.categories) market[c] = 1;
  return {
    version: 1,
    cash: CONFIG.startCash,
    debt: 0,
    intel: 0,
    inventory: [],
    auctionNumber: 0,
    level: 1,
    peakNet: CONFIG.startCash,
    bestProfit: 0,
    setsCompleted: 0,
    streak: 0,
    lastRoundProfit: null,
    milestones: [],
    mode: options?.mode ?? "endless",
    modeRound: 0,
    reputation: 0,
    market,
    news: [],
    specialBuyer: null,
    openingEvent: null,
    settlementEvent: null,
    commission: null,
    roundStats: EMPTY_STATS(),
    roundModifiers: null,
    itemsThisRound: [],
    itemIndex: 0,
    phase: "bidding",
    currentPrice: 0,
    bidders: [],
    activeBidders: [],
    currentBidder: null,
    playerInAuction: true,
    playerBidRaises: 0,
    biddingLog: [],
    deal: null,
    inventoryFullNotice: false,
    totals: null,
    endReason: null,
  };
}

function driftMarket(state: GameState): Record<Category, number> {
  const next = { ...state.market };
  for (const c of CONFIG.categories) {
    let drift = (Math.random() * 2 - 0.9) * CONFIG.marketDrift;
    for (const n of state.news) {
      const hit = n.affects.find((a) => a.category === c);
      if (hit && Math.random() < CONFIG.newsBias) drift = hit.dir * Math.abs(drift) * 1.6;
    }
    const v = next[c] + drift + (1 - next[c]) * CONFIG.marketRevert;
    next[c] = clamp(v, CONFIG.marketMin, CONFIG.marketMax);
  }
  return next;
}

/** 开新一场：交入场费 → 市场漂移/新闻 → 开场事件 → 生成拍品与买家 → 开始第一件 */
export function beginRound(state: GameState): GameState {
  const rep = state.reputation ?? 0;
  const feeDiscount = rep >= CONFIG.repDiscountAt ? CONFIG.repDiscountRate : 0;
  const fee = round100(entryFee(state.level) * (1 - feeDiscount));
  const modeRound = (state.modeRound ?? 0) + 1;
  const s: GameState = {
    ...state,
    cash: state.cash - fee,
    intel: Math.min(CONFIG.intelCarryMax, state.intel) + CONFIG.intelPerAuction,
    auctionNumber: state.auctionNumber + 1,
    modeRound,
    itemsThisRound: [],
    itemIndex: 0,
    phase: "bidding",
    biddingLog: [],
    specialBuyer: null,
    totals: null,
    deal: null,
    roundStats: EMPTY_STATS(),
    roundModifiers: null,
    openingEvent: null,
    settlementEvent: null,
    commission: chance(CONFIG.commissionChance) ? rollCommission(state.level, state.peakNet) : null,
  };
  s.news = pickNews();
  s.market = driftMarket(s);
  const openingTemplate = rollOpeningTemplate();
  const opening = applyEvent(s, openingTemplate);
  s.market = opening.state.market;
  s.roundModifiers = opening.state.roundModifiers;
  s.cash = opening.state.cash;
  s.debt = opening.state.debt;
  s.openingEvent = { ...templateToEvent(openingTemplate), outcome: opening.outcome };
  s.biddingLog.push({ id: nextId(), text: `【风声】${s.openingEvent.title}：${s.openingEvent.text}（${s.openingEvent.outcome}）`, kind: "intel" });
  s.itemsThisRound = generateAuctionItems(s.level, s.market, CONFIG.itemsPerAuction, s.auctionNumber);
  s.bidders = generateAIBidders(s.level, s.roundModifiers?.bidderBudgetMult ?? 1);
  s.biddingLog.push({ id: nextId(), text: `入场费 ${formatMoney(fee)} 已支付，拍卖会 #${s.auctionNumber} 开始`, kind: "system" });
  if (feeDiscount > 0) {
    s.biddingLog.push({ id: nextId(), text: `声望特权：入场费 8 折，省下 ${formatMoney(round100(entryFee(state.level) * feeDiscount))}`, kind: "system" });
  }
  return startItemAuction(s);
}
// ---------------- 单件拍品竞价 ----------------

function startItemAuction(state: GameState): GameState {
  const item = state.itemsThisRound[state.itemIndex];
  const s: GameState = { ...state, biddingLog: [...state.biddingLog], bidders: state.bidders.map((b) => ({ ...b })) };
  s.currentPrice = round100(item.estimateLow * CONFIG.startBidRatio);
  s.playerBidRaises = 0;
  s.deal = null;
  s.inventoryFullNotice = s.inventory.length >= CONFIG.inventoryCap;
  s.bidders = s.bidders.map((b) => {
    const prep = aiPrepareItem(b, item, state.market[item.category] ?? 1, s.level);
    return { ...b, ...prep };
  });
  const ids = ["player", ...s.bidders.map((b) => b.id)];
  if (s.inventoryFullNotice) {
    s.activeBidders = ids.filter((x) => x !== "player");
    s.playerInAuction = false;
    s.biddingLog.push({ id: nextId(), text: "库存已满，你无法参与本件拍品", kind: "system" });
  } else {
    s.activeBidders = [...ids];
    s.playerInAuction = true;
  }
  s.currentBidder = s.activeBidders[Math.floor(Math.random() * s.activeBidders.length)];
  s.biddingLog.push({ id: nextId(), text: `起拍价 ${formatMoney(s.currentPrice)} · ${item.name}`, kind: "system" });
  if (s.currentBidder !== "player") return aiStep(s);
  return s;
}

function nextActive(state: GameState, after: string): string | null {
  const list = state.activeBidders;
  const i = list.indexOf(after);
  for (let k = 1; k <= list.length; k++) {
    const idx = (i + k) % list.length;
    if (list[idx] !== after) return list[idx];
  }
  return null;
}

function applyRaise(state: GameState, bidderId: string, newPrice: number, actorName: string, stepLabel: string): GameState {
  const s = { ...state, currentPrice: newPrice, biddingLog: [...state.biddingLog] };
  s.currentBidder = nextActive(s, bidderId);
  s.biddingLog.push({ id: nextId(), text: `${actorName} 加价 ${formatMoney(newPrice)}${stepLabel}`, kind: "bid", actor: actorName });
  if (s.currentBidder === null) return resolveDeal(s);
  return s;
}

function removeBidder(state: GameState, bidderId: string, reason?: string): GameState {
  const s = { ...state, activeBidders: state.activeBidders.filter((x) => x !== bidderId), biddingLog: [...state.biddingLog] };
  if (reason) s.biddingLog.push({ id: nextId(), text: reason, kind: "bid" });
  if (s.activeBidders.length === 1) return resolveDeal(s);
  if (s.currentBidder === bidderId || !s.activeBidders.includes(s.currentBidder ?? "")) {
    s.currentBidder = s.activeBidders[0];
    if (s.currentBidder !== "player") return aiStep(s);
  }
  return s;
}

/** 玩家行动 */
export function playerBid(state: GameState, choice: BidChoice): GameState {
  if (state.phase !== "bidding" || !state.playerInAuction || state.currentBidder !== "player" || state.deal) return state;
  const item = state.itemsThisRound[state.itemIndex];
  if (choice === "exit") {
    const s = { ...state, playerInAuction: false, activeBidders: state.activeBidders.filter((x) => x !== "player"), biddingLog: [...state.biddingLog] };
    s.biddingLog.push({ id: nextId(), text: "你退出竞拍", kind: "bid", actor: "玩家" });
    if (s.activeBidders.length === 1) return resolveDeal(s);
    s.currentBidder = s.activeBidders[0];
    if (s.currentBidder !== "player") return aiStep(s);
    return s;
  }
  const step = CONFIG.bidSteps[choice];
  const newPrice = round100(state.currentPrice * (1 + step));
  if (!canBidAt(state, newPrice)) {
    return { ...state, biddingLog: [...state.biddingLog, { id: nextId(), text: "资金不足，无法加到该价位", kind: "system" }] };
  }
  const s = { ...state, currentPrice: newPrice, playerBidRaises: state.playerBidRaises + 1, biddingLog: [...state.biddingLog] };
  const label = choice === "small" ? "（小幅）" : choice === "standard" ? "（标准）" : "（强势）";
  s.biddingLog.push({ id: nextId(), text: `你加价 ${formatMoney(newPrice)}${label}`, kind: "bid", actor: "玩家" });
  s.currentBidder = nextActive(s, "player");
  if (s.currentBidder === null) return resolveDeal(s);
  return aiStep(s);
}

/** AI 走一步（仅当轮到一个 AI 表态时有效）。UI 用定时器驱动。 */
export function aiStep(state: GameState): GameState {
  if (state.phase !== "bidding" || state.deal) return state;
  if (state.currentBidder === "player" || state.currentBidder === null) return state;
  const bidder = state.bidders.find((b) => b.id === state.currentBidder);
  if (!bidder || !state.activeBidders.includes(bidder.id)) return state;

  const price = state.currentPrice;
  const s0 = { ...state, biddingLog: [...state.biddingLog] };
  const b = { ...bidder };

  let willRaise = b.wants || b.bluffing;
  if (b.bluffing && price >= b.bluffCeiling) willRaise = false;
  if (b.wants && price > b.valuation && !b.bluffing) willRaise = false;
  if (b.patience <= 0) willRaise = willRaise && Math.random() < 0.5;
  const maxAfford = b.budget;
  if (!willRaise || price >= maxAfford) {
    const reason =
      b.bluffing && price >= b.bluffCeiling
        ? b.name + " 收手了，看来他只是想抬价"
        : price > b.valuation
          ? b.name + " 犹豫片刻，放弃跟进"
          : b.name + " 选择退出";
    return removeBidder(s0, b.id, reason);
  }

  const stepChoices =
    b.kind === "富豪" ? [0.05, 0.15, 0.35, 0.35] : b.kind === "赌徒" ? [0.15, 0.35, 0.35] : b.kind === "老狐狸" ? [0.05, 0.05, 0.15] : [0.05, 0.15, 0.15];
  const step = stepChoices[Math.floor(Math.random() * stepChoices.length)];
  let newPrice = round100(price * (1 + step));
  if (newPrice > maxAfford) newPrice = round100(maxAfford);
  if (newPrice <= price) return removeBidder(s0, b.id, b.name + " 无力跟进，退出");
  const nb = { ...b, patience: b.patience - 1 };
  const s = { ...s0, bidders: s0.bidders.map((x) => (x.id === b.id ? nb : x)) };
  const label = step >= 0.35 ? "（强势）" : step === 0.15 ? "（标准）" : "（小幅）";
  return applyRaise(s, b.id, newPrice, b.name, label);
}

/** 只剩一人时成交 */
function resolveDeal(state: GameState): GameState {
  if (state.deal) return state;
  const winnerId = state.activeBidders[0];
  const item = state.itemsThisRound[state.itemIndex];
  const price = state.currentPrice;
  let s: GameState = { ...state, biddingLog: [...state.biddingLog] };

  let wonByName = "";
  let reveal: NonNullable<DealResult["reveal"]> | null = null;
  if (winnerId === "player") {
    const paid = Math.min(s.cash, price);
    const borrowed = price - paid;
    s.cash = s.cash - paid;
    s.debt = s.debt + borrowed;
    s.inventory = [...s.inventory, { ...item, acquiredRound: s.auctionNumber, acquiredLevel: s.level }];
    const stats = s.roundStats ?? EMPTY_STATS();
    s.roundStats = {
      ...stats,
      wonCount: stats.wonCount + 1,
      wonCategories: [...stats.wonCategories, item.category],
      fakesWon: stats.fakesWon + (item.authenticity === "赝品" ? 1 : 0),
      lowBuys: stats.lowBuys + (price <= item.estimateMedian * 0.8 ? 1 : 0),
    };
    wonByName = "你";
    s.biddingLog.push({ id: nextId(), text: `成交！你以 ${formatMoney(price)} 拍下 ${item.name}`, kind: "deal" });
  } else {
    const bidder = s.bidders.find((b) => b.id === winnerId)!;
    const nb = { ...bidder, budget: bidder.budget - price, heldItems: bidder.heldItems + 1 };
    s.bidders = s.bidders.map((x) => (x.id === winnerId ? nb : x));
    wonByName = bidder.name;
    reveal = { authenticity: item.authenticity, trueValue: item.trueValue };
    s.biddingLog.push({
      id: nextId(),
      text: `${bidder.name} 以 ${formatMoney(price)} 拍下 ${item.name}（真实价值 ${formatMoney(Math.round(item.trueValue))}·${item.authenticity}）`,
      kind: "deal",
    });
  }
  s.deal = { item, wonBy: winnerId, wonByName, price, reveal };
  return s;
}

/** 玩家确认成交揭示后，推进到下一件或结算 */
export function afterDealContinue(state: GameState): GameState {
  if (!state.deal) return state;
  const s = { ...state, deal: null, biddingLog: [...state.biddingLog] };
  if (s.itemIndex + 1 < s.itemsThisRound.length) {
    s.itemIndex += 1;
    return startItemAuction(s);
  }
  return enterSettlement(s);
}

/** 情报调查 */
export function playerIntel(state: GameState, action: IntelAction): GameState {
  if (state.phase !== "bidding" || state.deal || state.intel < 1) return state;
  const item = state.itemsThisRound[state.itemIndex];
  const s = { ...state, intel: state.intel - 1, biddingLog: [...state.biddingLog] };
  const text = intelReveal(item, action, s.bidders, state.market[item.category] ?? 1);
  s.biddingLog.push({ id: nextId(), text: `【情报】${text}`, kind: "intel" });
  return s;
}
// ---------------- 结算 ----------------

function enterSettlement(state: GameState): GameState {
  const s0: GameState = { ...state, phase: "settlement", biddingLog: [...state.biddingLog], totals: null, currentBidder: null };
  // 结算随机事件（现金/债务/行情立即生效，倍率作用于本场结转）
  const template = rollSettlementTemplate();
  const applied = applyEvent(s0, template);
  let s = applied.state;
  s.biddingLog = [...s.biddingLog];
  s.settlementEvent = { ...templateToEvent(template), outcome: applied.outcome };
  s.biddingLog.push({ id: nextId(), text: `【场后风声】${s.settlementEvent.title}：${s.settlementEvent.text}（${s.settlementEvent.outcome}）`, kind: "intel" });
  // 特殊买家：声望达标或事件保证必现
  const rep = s.reputation ?? 0;
  const guaranteed = Boolean(s.roundModifiers?.specialBuyerGuaranteed) || rep >= CONFIG.repSpecialAt;
  s.specialBuyer = rollSpecialBuyer(guaranteed);
  s.biddingLog.push({ id: nextId(), text: "拍卖会结束，进入结算", kind: "system" });
  return s;
}

/** 结算阶段对某件藏品执行操作 */
export function settlementAction(state: GameState, itemId: string, action: ItemAction): GameState {
  if (state.phase !== "settlement") return state;
  const idx = state.inventory.findIndex((it) => it.id === itemId);
  if (idx < 0) return state;
  const item = state.inventory[idx];
  const s: GameState = { ...state, inventory: [...state.inventory], biddingLog: [...state.biddingLog] };

  if (action === "appraise") {
    if (item.appraised) return state;
    const cost = round100(item.estimateMedian * CONFIG.appraiseFeeRate);
    if (s.cash < cost) {
      s.biddingLog.push({ id: nextId(), text: "现金不足，无法支付鉴定费", kind: "system" });
      return s;
    }
    s.cash -= cost;
    s.inventory[idx] = { ...item, appraised: true };
    s.roundStats = { ...(s.roundStats ?? EMPTY_STATS()), appraisals: (s.roundStats?.appraisals ?? 0) + 1 };
    s.biddingLog.push({ id: nextId(), text: `已鉴定《${item.name}》：${item.authenticity}，真实价值 ${formatMoney(item.trueValue)}（鉴定费 ${formatMoney(cost)}）`, kind: "info" });
    return s;
  }

  if (action === "hold") {
    return state;
  }

  if (action === "pawn") {
    if (item.pawned) return state;
    const principal = round100(conservativeValue(item) * CONFIG.pawnRate);
    s.cash += principal;
    s.inventory[idx] = { ...item, pawned: { principal, roundsLeft: CONFIG.pawnRounds } };
    s.biddingLog.push({ id: nextId(), text: `《${item.name}》抵押 ${formatMoney(principal)}，${CONFIG.pawnRounds} 场内可赎回`, kind: "info" });
    return s;
  }

  if (action === "redeem") {
    if (!item.pawned) return state;
    const cost = round100(item.pawned.principal * (1 + CONFIG.pawnRedeemFee));
    if (s.cash < cost) {
      s.biddingLog.push({ id: nextId(), text: "现金不足，无法赎回", kind: "system" });
      return s;
    }
    s.cash -= cost;
    s.inventory[idx] = { ...item, pawned: null };
    s.biddingLog.push({ id: nextId(), text: `《${item.name}》已赎回（支付 ${formatMoney(cost)}）`, kind: "info" });
    return s;
  }

  // sell
  if (action === "sell") {
    const setInfo = item.setInfo;
    const setParts = setInfo ? s.inventory.filter((it) => it.setInfo?.setId === setInfo.setId) : [];
    if (setInfo && setParts.length === setInfo.size) {
      const total = setParts.reduce((sum, it) => sum + itemMarketValue(s, it), 0);
      const mult = CONFIG.setBonusMin + Math.random() * (CONFIG.setBonusMax - CONFIG.setBonusMin);
      const price = Math.round(total * mult);
      const ids = new Set(setParts.map((p) => p.id));
      s.inventory = s.inventory.filter((it) => !ids.has(it.id));
      s.cash += price;
      s.setsCompleted += 1;
      const costBase = setParts.reduce((sum, it) => sum + (it.pawned ? it.pawned.principal : 0), 0);
      const profit = Math.round(price - costBase);
      if (profit > s.bestProfit) s.bestProfit = profit;
      s.roundStats = { ...(s.roundStats ?? EMPTY_STATS()), realizedProfit: (s.roundStats?.realizedProfit ?? 0) + profit };
      s.biddingLog.push({ id: nextId(), text: `成套出售《${setInfo.setName}》（${setParts.length}件）！收入 ${formatMoney(price)}`, kind: "deal" });
      return s;
    }
    const base = itemMarketValue(s, item);
    const discount = item.appraised ? 1 : CONFIG.unappraisedMin + Math.random() * (CONFIG.unappraisedMax - CONFIG.unappraisedMin);
    const price = Math.round(base * discount);
    s.cash += price;
    s.inventory.splice(idx, 1);
    s.inventory = [...s.inventory];
    s.biddingLog.push({ id: nextId(), text: `《${item.name}》售出 ${formatMoney(price)}${item.appraised ? "" : "（未鉴定，买家压价）"}`, kind: "deal" });
    const profit = Math.round(price - (item.pawned ? item.pawned.principal : 0));
    if (profit > s.bestProfit) s.bestProfit = profit;
    s.roundStats = { ...(s.roundStats ?? EMPTY_STATS()), realizedProfit: (s.roundStats?.realizedProfit ?? 0) + profit };
    return s;
  }

  return s;
}

/** 接受特殊买家的收购报价 */
export function acceptSpecialBuyer(state: GameState, itemId: string): GameState {
  if (state.phase !== "settlement" || !state.specialBuyer) return state;
  const idx = state.inventory.findIndex((it) => it.id === itemId);
  if (idx < 0) return state;
  const item = state.inventory[idx];
  if (item.category !== state.specialBuyer.wantCategory) return state;
  const price = Math.round(itemMarketValue(state, item) * state.specialBuyer.mult);
  const s: GameState = { ...state, inventory: [...state.inventory], biddingLog: [...state.biddingLog], cash: state.cash + price };
  s.inventory.splice(idx, 1);
  s.inventory = [...s.inventory];
  const profit = Math.round(price - (item.pawned ? item.pawned.principal : 0));
  if (profit > s.bestProfit) s.bestProfit = profit;
  s.roundStats = { ...(s.roundStats ?? EMPTY_STATS()), realizedProfit: (s.roundStats?.realizedProfit ?? 0) + profit };
  s.biddingLog.push({ id: nextId(), text: `${state.specialBuyer.name} 高价收购《${item.name}》：${formatMoney(price)}！`, kind: "deal" });
  return s;
}

/** 委托完成判定（纯函数，供结算界面实时预览与引擎结算共用） */
export function judgeCommission(state: GameState): boolean {
  const c = state.commission;
  if (!c) return false;
  const stats = state.roundStats ?? EMPTY_STATS();
  switch (c.kind) {
    case "win_any":
      return stats.wonCount >= 1;
    case "buy_category":
      return stats.wonCategories.includes(c.targetCategory!);
    case "avoid_fake":
      return stats.wonCount >= 1 && stats.fakesWon === 0;
    case "appraise_any":
      return stats.appraisals >= 1;
    case "profit_target":
      return stats.realizedProfit >= (c.targetValue ?? 0);
    case "low_buy":
      return stats.lowBuys >= 1;
    default:
      return false;
  }
}

/** 结算完成 → 下一场（含委托奖励、仓储费、利息、抵押到期、破产检查、竞速终局） */
export function nextRound(state: GameState): GameState {
  if (state.phase !== "settlement") return state;
  let s: GameState = { ...state, biddingLog: [...state.biddingLog], inventory: [...state.inventory], phase: "bidding" };

  // 1) 委托判定与奖励
  const commission = state.commission;
  if (commission) {
    const done = judgeCommission(state);
    if (done) {
      s.cash += commission.reward;
      s.reputation = Math.min(CONFIG.repCap, (s.reputation ?? 0) + commission.rep);
      s.commission = { ...commission, result: "完成" };
      s.biddingLog.push({ id: nextId(), text: `委托完成：「${commission.title}」奖励 ${formatMoney(commission.reward)}，声望 +${commission.rep}`, kind: "deal" });
    } else {
      s.commission = { ...commission, result: "未完成" };
      s.biddingLog.push({ id: nextId(), text: `委托未完成：「${commission.title}」`, kind: "system" });
    }
  }

  // 2) 仓储费（受事件/倍率修正）与抵押到期
  const mods = state.roundModifiers;
  const storageMult = mods?.storageMult ?? 1;
  let storage = 0;
  s.inventory = s.inventory.map((it) => {
    if (it.pawned) return it;
    const fee = Math.round(conservativeValue(it) * CONFIG.storageFeeRate * storageMult);
    storage += fee;
    return it;
  });
  s.inventory = s.inventory
    .map((it) => {
      if (!it.pawned) return it;
      const p = { ...it.pawned, roundsLeft: it.pawned.roundsLeft - 1 };
      if (p.roundsLeft > 0) return { ...it, pawned: p };
      const price = Math.round(itemMarketValue(s, it) * 0.8);
      const due = Math.round(it.pawned.principal * (1 + CONFIG.pawnRedeemFee));
      s.cash += price - due;
      s.biddingLog.push({ id: nextId(), text: `抵押到期：《${it.name}》被强制出售，偿还 ${formatMoney(due)}，余 ${formatMoney(Math.max(0, price - due))} 入账`, kind: "system" });
      return null;
    })
    .filter((it): it is Item => it !== null);

  const interestMult = mods?.interestMult ?? 1;
  const interest = Math.round(s.debt * CONFIG.interestRate * interestMult);
  const fee = storage + interest;
  const pay = Math.min(s.cash, fee);
  s.cash -= pay;
  s.debt += fee - pay;
  if (storage > 0 || interest > 0) s.biddingLog.push({ id: nextId(), text: `仓储费 ${formatMoney(storage)}，债务利息 ${formatMoney(interest)}`, kind: "system" });

  // 3) 净资产峰值 / 等级
  const net = computeNetAssets(s);
  const peak = Math.max(state.peakNet, net);
  const newLevel = computeLevel(peak);
  if (newLevel > s.level) {
    s.milestones = [...s.milestones, `晋升到 ${levelName(newLevel)}（净资产峰值 ${formatMoney(peak)}）`];
    s.biddingLog.push({ id: nextId(), text: `🎉 市场升级：进入「${levelName(newLevel)}」！`, kind: "deal" });
  }
  s.peakNet = peak;
  s.level = newLevel;

  // 4) 竞速模式：完成固定场次 → 直接终局（不再支付下一场入场费）
  if (s.mode === "sprint" && (s.modeRound ?? 0) >= CONFIG.sprintRounds) {
    return { ...s, phase: "runEnd", endReason: `完成竞速挑战 · 第${s.modeRound}场` };
  }

  // 5) 强制清算
  const feeNext = entryFee(s.level);
  let forced = false;
  if (s.cash + availableCredit(s) < feeNext) {
    forced = true;
    s.biddingLog.push({ id: nextId(), text: "资金不足，触发强制清算！", kind: "system" });
    const liquidation = s.inventory.filter((it) => !it.pawned);
    for (const it of liquidation) {
      const price = Math.round(itemMarketValue(s, it) * (it.appraised ? CONFIG.forcedLiquidationAppraised : CONFIG.forcedLiquidationRaw));
      s.cash += price;
      s.biddingLog.push({ id: nextId(), text: `强制清算：《${it.name}》变现 ${formatMoney(price)}`, kind: "system" });
    }
    const keep = new Set(s.inventory.filter((it) => it.pawned).map((it) => it.id));
    s.inventory = s.inventory.filter((it) => keep.has(it.id));
  }

  // 6) 能否继续
  const canEnter = s.cash + availableCredit(s) >= entryFee(newLevel);
  if (!canEnter) {
    return { ...s, phase: "runEnd", endReason: forced ? "强制清算后仍资不抵债，无法支付下一场入场费" : "无法支付下一场入场费" };
  }
  if (s.debt > 0 && computeNetAssets(s) <= 0) {
    return { ...s, phase: "runEnd", endReason: "净资产归零，信用耗尽" };
  }
  s.biddingLog.push({ id: nextId(), text: "—— 下一场拍卖会即将开始 ——", kind: "system" });
  return beginRound(s);
}

/** 主动结束本轮 */
export function forceEndRun(state: GameState, reason: string): GameState {
  return { ...state, phase: "runEnd", endReason: reason };
}

export function buildRunResult(state: GameState): RunResult {
  return {
    peakNet: state.peakNet,
    level: state.level,
    auctions: state.auctionNumber,
    bestProfit: state.bestProfit,
    setsCompleted: state.setsCompleted,
    endReason: state.endReason ?? "主动结束",
    mode: state.mode ?? "endless",
    score: (state.mode ?? "endless") === "sprint" ? computeNetAssets(state) : state.peakNet,
  };
}

/** 供 UI 渲染的近期日志（取最后 N 条） */
export function recentLog(state: GameState, n = 40): LogEntry[] {
  return state.biddingLog.slice(-n);
}
