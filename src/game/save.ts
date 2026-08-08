import { CONFIG } from "./config";
import { nextMidnightMs, todayShanghai } from "./format";
import { nextId } from "./engine";
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

function previousDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return [
    previous.getUTCFullYear(),
    String(previous.getUTCMonth() + 1).padStart(2, "0"),
    String(previous.getUTCDate()).padStart(2, "0"),
  ].join("-");
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

  return { ...state, itemsThisRound, inventory, news, biddingLog, bidders, deal };
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
