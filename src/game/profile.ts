// ============ 黑市拍卖行 · 跨轮玩家档案（meta 成长 / 身份 / 图鉴 / 成就） ============
import { CONFIG } from "./config";
import { setLastLocalTs } from "./local";
import { ACHIEVEMENT_DEFS, SET_TEMPLATES, UNLOCK_TABLE } from "./content";
import type { AlbumEntry, GameState, Profile, Unlocks } from "./types";

const PROFILE_KEY = "bma_profile";

function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function defaultUnlocks(): Unlocks {
  return { clients: [], skills: [], bankLevel: 1, startCashBoost: 0, nightAuction: false };
}

export function defaultProfile(): Profile {
  return {
    version: 2,
    identity: "dealer",
    reputation: 0,
    unlocks: defaultUnlocks(),
    album: SET_TEMPLATES.map((s) => ({ setId: s.setId, setName: s.setName, collected: 0, total: s.parts.length })),
    achievements: {},
    totalAuctions: 0,
    totalProfit: 0,
    bestPeak: 0,
    bankruptcies: 0,
    runsCompleted: 0,
    legendaryWon: 0,
    setsCompletedTotal: 0,
    dailyDone: null,
  };
}

export function loadProfile(): Profile {
  const store = storage();
  if (!store) return defaultProfile();
  try {
    const raw = store.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return sanitizeProfile(parsed);
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(p: Profile): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PROFILE_KEY, JSON.stringify(p));
    setLastLocalTs(Date.now());
  } catch {
    // localStorage 不可用时静默
  }
}

export function sanitizeProfile(input: Partial<Profile>): Profile {
  const base = defaultProfile();
  const p: Profile = { ...base, ...input };
  p.identity = p.identity && ["dealer", "collector", "gambler", "appraiser"].includes(p.identity) ? p.identity : "dealer";
  p.reputation = Math.max(0, Math.floor(Number.isFinite(p.reputation) ? p.reputation : 0));
  p.unlocks = { ...base.unlocks, ...(p.unlocks ?? {}) };
  p.album = Array.isArray(p.album) && p.album.length > 0 ? p.album : base.album;
  p.achievements = p.achievements && typeof p.achievements === "object" ? p.achievements : {};
  const known = new Set(p.album.map((a) => a.setId));
  for (const s of SET_TEMPLATES) {
    if (!known.has(s.setId)) p.album.push({ setId: s.setId, setName: s.setName, collected: 0, total: s.parts.length });
  }
  p.totalAuctions = Math.max(0, Math.floor(Number.isFinite(p.totalAuctions) ? p.totalAuctions : 0));
  p.totalProfit = Math.max(0, Math.floor(Number.isFinite(p.totalProfit) ? p.totalProfit : 0));
  p.bestPeak = Math.max(0, Math.floor(Number.isFinite(p.bestPeak) ? p.bestPeak : 0));
  p.bankruptcies = Math.max(0, Math.floor(Number.isFinite(p.bankruptcies) ? p.bankruptcies : 0));
  p.runsCompleted = Math.max(0, Math.floor(Number.isFinite(p.runsCompleted) ? p.runsCompleted : 0));
  p.legendaryWon = Math.max(0, Math.floor(Number.isFinite(p.legendaryWon) ? p.legendaryWon : 0));
  p.setsCompletedTotal = Math.max(0, Math.floor(Number.isFinite(p.setsCompletedTotal) ? p.setsCompletedTotal : 0));
  return applyUnlocks(p);
}

/** 根据生涯声望重算解锁（幂等；返回是否发生变化） */
export function applyUnlocks(p: Profile): Profile {
  const u: Unlocks = defaultUnlocks();
  for (const row of UNLOCK_TABLE) {
    if (p.reputation < row.rep) continue;
    if (row.type === "client" && row.id) u.clients.push(row.id);
    else if (row.type === "skill" && row.id) u.skills.push(row.id);
    else if (row.type === "bank" && row.level) u.bankLevel = Math.max(u.bankLevel, row.level);
    else if (row.type === "night") u.nightAuction = true;
    else if (row.type === "startCash" && row.boost) u.startCashBoost = Math.max(u.startCashBoost, row.boost);
  }
  const changed =
    u.clients.length !== p.unlocks.clients.length ||
    u.skills.length !== p.unlocks.skills.length ||
    u.bankLevel !== p.unlocks.bankLevel ||
    u.nightAuction !== p.unlocks.nightAuction ||
    u.startCashBoost !== p.unlocks.startCashBoost;
  p.unlocks = u;
  return p;
}

/** 本轮声望收益：场次/等级/连胜/峰值加成 */
export function runReputationGain(state: GameState): number {
  const rounds = state.auctionNumber ?? 0;
  const level = state.level ?? 1;
  const streak = state.streak ?? 0;
  const peakBonus = Math.min(20, Math.floor((state.peakNet ?? 0) / 100000));
  return Math.max(1, Math.floor(rounds * 2 + level * 3 + streak + peakBonus));
}

function isBankruptcyEnd(reason: string | null): boolean {
  if (!reason) return false;
  return /破产|资不抵债|净资产归零|无法支付/.test(reason);
}

/** 结算本轮：声望收益 + 图鉴合并 + 成就判定 + 每日挑战标记。返回本次增益明细 */
export function finalizeRun(
  profile: Profile,
  state: GameState,
  challengeDone: boolean,
): {
  profile: Profile;
  gains: { reputation: number; newUnlocks: string[]; newAchievements: string[]; newSets: string[] };
} {
  const p = sanitizeProfile({ ...profile });
  const endReason = state.endReason ?? "";

  // 声望
  const repGain = runReputationGain(state);
  p.reputation += repGain;
  p.runsCompleted += 1;
  p.totalAuctions += state.auctionNumber ?? 0;
  p.totalProfit += Math.max(0, state.runProfit ?? 0);
  p.bestPeak = Math.max(p.bestPeak, state.peakNet ?? 0);
  p.legendaryWon += state.roundStats?.legendaryWon ?? 0;
  p.setsCompletedTotal += state.setsCompleted ?? 0;
  if (isBankruptcyEnd(endReason)) p.bankruptcies += 1;
  if (challengeDone) p.dailyDone = { date: state.dailyChallengeDate ?? "", done: true };

  // 图鉴合并（setsCollected: setId -> part 下标数组）
  const newSets: string[] = [];
  const partsOf = (id: number): number => SET_TEMPLATES.find((s) => s.setId === id)?.parts.length ?? 0;
  for (const [setIdStr, parts] of Object.entries(state.setsCollected ?? {})) {
    const setId = Number(setIdStr);
    const total = partsOf(setId);
    if (total === 0) continue;
    const entry = p.album.find((a) => a.setId === setId);
    const collected = Math.min(total, parts.length);
    if (entry) {
      if (collected > entry.collected) entry.collected = collected;
      if (entry.collected >= total && entry.total >= total) newSets.push(entry.setName);
    } else {
      p.album.push({ setId, setName: SET_TEMPLATES.find((s) => s.setId === setId)?.setName ?? `套装${setId}`, collected, total });
      if (collected >= total) newSets.push(p.album[p.album.length - 1].setName);
    }
  }

  // 成就
  const newAchievements: string[] = [];
  const want: Record<string, boolean> = {
    profit10000: (state.lastRoundProfit ?? 0) >= 10000 || (state.roundStats?.realizedProfit ?? 0) >= 10000,
    profit50000: (state.lastRoundProfit ?? 0) >= 50000,
    streak3: (state.streak ?? 0) >= 3,
    set1: (state.setsCompleted ?? 0) >= 1,
    legendary1: (state.roundStats?.legendaryWon ?? 0) >= 1,
    bankrupt1: isBankruptcyEnd(endReason),
    sprint1: state.mode === "sprint" && endReason.includes("完成竞速"),
    night1: Boolean(state.nightPlayed),
    peak1m: (state.peakNet ?? 0) >= 1_000_000,
  };
  for (const def of ACHIEVEMENT_DEFS) {
    if (p.achievements[def.id]) continue;
    if (want[def.check]) {
      p.achievements[def.id] = Date.now();
      newAchievements.push(def.label);
    }
  }

  const before = applyUnlocks({ ...p }).unlocks;
  const after = applyUnlocks(p).unlocks;
  const newUnlocks: string[] = [];
  for (const row of UNLOCK_TABLE) {
    if (p.reputation - repGain < row.rep && p.reputation >= row.rep) newUnlocks.push(row.label);
  }
  void before;
  void after;

  return { profile: p, gains: { reputation: repGain, newUnlocks, newAchievements, newSets } };
}
