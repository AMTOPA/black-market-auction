import { CONFIG } from "./config";
import { nextMidnightMs, todayShanghai } from "./format";
import type { GameState } from "./types";

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

export function loadGame(): GameState | null {
  const store = storage();
  if (!store) return null;

  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const state = parsed as GameState;
    return state.version === CONFIG.version ? state : null;
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(SAVE_KEY, JSON.stringify(state));
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
