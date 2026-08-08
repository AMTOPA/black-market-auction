export type AuthUser = { id: number; username: string };
export type LeaderboardRow = {
  rank: number;
  username: string;
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
  return apiFetch("/api/auth/me");
}

export async function apiRegister(
  username: string,
  password: string,
): Promise<{ ok: true; user: AuthUser }> {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function apiLogin(
  username: string,
  password: string,
): Promise<{ ok: true; user: AuthUser }> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function apiLogout(): Promise<void> {
  await apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export async function apiLeaderboard(limit = 50): Promise<LeaderboardData> {
  const params = new URLSearchParams({ limit: String(limit) });
  return apiFetch(`/api/leaderboard?${params.toString()}`);
}

export async function apiSubmitScore(r: {
  peakNet: number;
  level: number;
  auctions: number;
  bestProfit: number;
}): Promise<{
  ok: true;
  best: { peak_net: number; level: number; auctions: number; runs: number };
}> {
  return apiFetch("/api/leaderboard", {
    method: "POST",
    body: JSON.stringify(r),
  });
}

export async function apiDailyClaim(): Promise<DailyClaimResponse> {
  return apiFetch("/api/daily-claim");
}

export async function apiDailyClaimPost(): Promise<DailyClaimResponse> {
  return apiFetch("/api/daily-claim", { method: "POST" });
}
