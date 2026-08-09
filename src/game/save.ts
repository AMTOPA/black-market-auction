import { CONFIG } from "./config";
import { nextMidnightMs, todayShanghai, previousDate, round100 } from "./format";
import { nextId } from "./id";
import { defaultUnlocks } from "./profile";
import { setLastLocalTs } from "./local";
import type { AIBidder, GameState, Item, LogEntry, NewsEvent } from "./types";

const SAVE_KEY = "bma_save";
const DAILY_KEY = "bma_daily";

interface StoredDailyInfo {
  date: string;
  streak: number;
}

export interface GuestDailyInfo {
  claimed: boolean;
  streak: number;
  amount: number;
  nextResetMs: number;
}

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

function welfareAmount(level: number): number {
  const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
  return Math.min(
    CONFIG.dailyWelfareCap,
    CONFIG.dailyWelfareBase + (safeLevel - 1) * CONFIG.dailyWelfarePerLevel,
  );
}

function loadDaily(): StoredDailyInfo | null {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(DAILY_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;

    const { date, streak } = value as Partial<StoredDailyInfo>;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    if (typeof streak !== "number" || !Number.isFinite(streak) || streak < 1) return null;
    return { date, streak: Math.floor(streak) };
  } catch {
    return null;
  }
}

/**
 * 旧版存档迁移：早期版本用 Number(nextId().replace(/\D/g, "")) 生成线索/新闻 ID，
 * 会得到重复的纯数字 ID（例如两个线索都是 909），导致 React 渲染出现
 * “two children with the same key” 警告。此处对所有纯展示 ID 统一重排为
 * 唯一的字符串 ID，对引擎引用到的 ID（库存/买家）仅在重复时重排。
 */
export function sanitizeState(state: GameState): GameState {
  const rekeyClues = (item: Item): Item => {
    const clues = (item.clues ?? []).map((clue) => ({ ...clue, id: nextId() }));
    return { ...item, clues };
  };

  const dedupeBy = <T extends { id: unknown }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.map((item) => {
      const raw = item.id;
      const key = typeof raw === "string" && raw.length > 0 ? raw : nextId();
      if (seen.has(key)) return { ...item, id: nextId() };
      seen.add(key);
      return item;
    });
  };

  const itemsThisRound: Item[] = (state.itemsThisRound ?? []).map(rekeyClues);
  const inventory: Item[] = dedupeBy((state.inventory ?? []).map(rekeyClues));
  const news: NewsEvent[] = (state.news ?? []).map((n) => ({ ...n, id: nextId() }));
  const biddingLog: LogEntry[] = (state.biddingLog ?? []).map((entry) => ({ ...entry, id: nextId() }));
  const bidders: AIBidder[] = dedupeBy(state.bidders ?? []);
  const deal = state.deal ? { ...state.deal, item: rekeyClues(state.deal.item) } : state.deal;

  // 多元化扩展：旧存档缺省字段补默认值
  const oldStats = state.roundStats as Partial<GameState["roundStats"]> | undefined;
  const roundStats: GameState["roundStats"] = {
    wonCount: typeof oldStats?.wonCount === "number" ? oldStats.wonCount : 0,
    wonCategories: Array.isArray(oldStats?.wonCategories) ? oldStats.wonCategories : [],
    fakesWon: typeof oldStats?.fakesWon === "number" ? oldStats.fakesWon : 0,
    lowBuys: typeof oldStats?.lowBuys === "number" ? oldStats.lowBuys : 0,
    appraisals: typeof oldStats?.appraisals === "number" ? oldStats.appraisals : 0,
    realizedProfit: typeof oldStats?.realizedProfit === "number" ? oldStats.realizedProfit : 0,
    soldRevenue: typeof oldStats?.soldRevenue === "number" ? oldStats.soldRevenue : 0,
    soldCount: typeof oldStats?.soldCount === "number" ? oldStats.soldCount : 0,
    specialSales: typeof oldStats?.specialSales === "number" ? oldStats.specialSales : 0,
    pawnProceeds: typeof oldStats?.pawnProceeds === "number" ? oldStats.pawnProceeds : 0,
    appraisalCosts: typeof oldStats?.appraisalCosts === "number" ? oldStats.appraisalCosts : 0,
    interestPaid: typeof oldStats?.interestPaid === "number" ? oldStats.interestPaid : 0,
    storageFees: typeof oldStats?.storageFees === "number" ? oldStats.storageFees : 0,
    commissionReward: typeof oldStats?.commissionReward === "number" ? oldStats.commissionReward : 0,
    interestEarned: typeof oldStats?.interestEarned === "number" ? oldStats.interestEarned : 0,
    legendaryWon: typeof oldStats?.legendaryWon === "number" ? oldStats.legendaryWon : 0,
  };

  return {
    ...state,
    itemsThisRound,
    inventory,
    news,
    biddingLog,
    bidders,
    deal,
    mode: state.mode ?? "endless",
    modeRound: typeof state.modeRound === "number" ? state.modeRound : 1,
    reputation: typeof state.reputation === "number" ? state.reputation : 0,
    openingEvent: state.openingEvent ?? null,
    settlementEvent: state.settlementEvent ?? null,
    commission: state.commission ?? null,
    roundStats,
    roundModifiers: state.roundModifiers ?? null,
    roundType: state.roundType ?? "standard",
    identity: state.identity ?? "dealer",
    unlocks: { ...defaultUnlocks(), ...(state.unlocks ?? {}) },
    aiGrudges: state.aiGrudges ?? {},
    setsCollected: state.setsCollected ?? {},
    infoCard: state.infoCard ?? null,
    nightPlayed: Boolean(state.nightPlayed),
    runProfit: typeof state.runProfit === "number" ? state.runProfit : 0,
    dailyChallengeDate: typeof state.dailyChallengeDate === "string" ? state.dailyChallengeDate : todayShanghai(),
    dailyChallengePaid: Boolean(state.dailyChallengePaid),
    totals: state.totals ?? null,
  };
}

export function loadGame(): GameState | null {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const state = parsed as GameState;
    if (state.version !== CONFIG.version) return null;
    // 终局状态已封档并写入档案，不再恢复，避免刷新/换设备后重复结算
    if (state.phase === "runEnd") return null;
    return sanitizeState(state);
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(SAVE_KEY, JSON.stringify(sanitizeState(state)));
    setLastLocalTs(Date.now());
  } catch {
    // localStorage may be unavailable or full; gameplay should continue without persistence.
  }
}

export function clearSave(): void {
  const store = storage();
  if (!store) return;

  try {
    store.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage access failures.
  }
}

export function guestDailyInfo(state: GameState): GuestDailyInfo {
  const today = todayShanghai();
  const daily = loadDaily();
  const claimed = daily?.date === today;
  const streak = claimed
    ? daily.streak
    : daily?.date === previousDate(today)
      ? daily.streak + 1
      : 1;

  return {
    claimed,
    streak,
    amount: claimed ? 0 : welfareAmount(state.level),
    nextResetMs: nextMidnightMs(),
  };
}

export function guestClaimDaily(state: GameState): { state: GameState; amount: number } | null {
  const info = guestDailyInfo(state);
  if (info.claimed) return null;

  const store = storage();
  if (!store) return null;

  try {
    store.setItem(DAILY_KEY, JSON.stringify({ date: todayShanghai(), streak: info.streak }));
  } catch {
    return null;
  }

  return {
    state: { ...state, cash: state.cash + info.amount },
    amount: info.amount,
  };
}
