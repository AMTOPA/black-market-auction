import type { GameMode } from "@/game/types";
import { apiUrl } from "@/lib/base";

export type AuthUser = { id: number; username: string };
export type LeaderboardRow = {
  rank: number;
  username: string;
  mode: GameMode;
  peak_net: number;
  level: number;
  auctions: number;
  runs: number;
  last_run_at: number;
};
export type LeaderboardData = {
  list: LeaderboardRow[];
  me: { username: string; peak_net: number; level: number; auctions: number; runs: number } | null;
};
export type DailyClaimResponse = {
  claimed: boolean;
  amount: number;
  streak: number;
  nextResetMs: number;
};

type ErrorResponse = { error?: unknown };

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = data && typeof data === "object" ? (data as ErrorResponse).error : undefined;
    throw new Error(typeof error === "string" ? error : `请求失败（${response.status}）`);
  }

  return data as T;
}

export async function apiMe(): Promise<{ user: AuthUser | null }> {
  return apiFetch(apiUrl("/api/auth/me"));
}

export async function apiRegister(
  username: string,
  password: string,
): Promise<{ ok: true; user: AuthUser }> {
  return apiFetch(apiUrl("/api/auth/register"), {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function apiLogin(
  username: string,
  password: string,
): Promise<{ ok: true; user: AuthUser }> {
  return apiFetch(apiUrl("/api/auth/login"), {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function apiLogout(): Promise<void> {
  await apiFetch<{ ok: true }>(apiUrl("/api/auth/logout"), { method: "POST" });
}

export async function apiLeaderboard(limit = 50, mode?: GameMode): Promise<LeaderboardData> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (mode) params.set("mode", mode);
  return apiFetch(apiUrl(`/api/leaderboard?${params.toString()}`));
}

export async function apiSubmitScore(r: {
  mode: GameMode;
  score: number;
  level: number;
  auctions: number;
  bestProfit: number;
}): Promise<{
  ok: true;
  best: { peak_net: number; level: number; auctions: number; runs: number };
}> {
  return apiFetch(apiUrl("/api/leaderboard"), {
    method: "POST",
    body: JSON.stringify({
      mode: r.mode,
      score: r.score,
      level: r.level,
      auctions: r.auctions,
      bestProfit: r.bestProfit,
    }),
  });
}

export async function apiDailyClaim(): Promise<DailyClaimResponse> {
  return apiFetch(apiUrl("/api/daily-claim"));
}

export type CloudSavePayload = { game: unknown | null; profile: unknown | null };
export type CloudSaveGetResponse = { ok: true; payload: CloudSavePayload | null; updatedAt: number };
export type CloudSavePutResponse = { ok: true; accepted: boolean; updatedAt: number };

export async function apiCloudSaveGet(): Promise<CloudSaveGetResponse> {
  return apiFetch(apiUrl("/api/cloud-save"));
}

export async function apiCloudSavePut(body: {
  game: unknown | null;
  profile: unknown | null;
  updatedAt: number;
}): Promise<CloudSavePutResponse> {
  return apiFetch(apiUrl("/api/cloud-save"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}
export async function apiDailyClaimPost(): Promise<DailyClaimResponse> {
  return apiFetch(apiUrl("/api/daily-claim"), { method: "POST" });
}
