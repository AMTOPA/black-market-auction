import { NextRequest, NextResponse } from "next/server";
import type { GameMode } from "@/game/types";
import { getCurrentUser } from "@/lib/auth";
import { addScore, getLeaderboard, getUserBest } from "@/lib/db";

interface ScoreBody {
  mode?: unknown;
  score?: unknown;
  level?: unknown;
  auctions?: unknown;
  bestProfit?: unknown;
}

function isGameMode(value: unknown): value is GameMode {
  return value === "endless" || value === "sprint";
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export async function GET(req: NextRequest) {
  const requestedLimit = Number(req.nextUrl.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(100, Math.max(1, Math.floor(requestedLimit)))
    : 50;
  const requestedMode = req.nextUrl.searchParams.get("mode");
  if (requestedMode !== null && !isGameMode(requestedMode)) {
    return NextResponse.json({ error: "无效的游戏模式" }, { status: 400 });
  }

  const mode = requestedMode ?? undefined;
  const user = await getCurrentUser();
  const list = getLeaderboard(limit, mode);
  const me = user ? { username: user.username, ...getUserBest(user.id, mode) } : null;
  return NextResponse.json({ list, me });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: ScoreBody;
  try {
    body = (await req.json()) as ScoreBody;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { mode, score, level, auctions, bestProfit } = body;
  if (
    !isGameMode(mode) ||
    !isPositiveNumber(score) ||
    !isPositiveNumber(level) ||
    !isPositiveNumber(auctions) ||
    !isPositiveNumber(bestProfit)
  ) {
    return NextResponse.json({ error: "成绩数据必须为正数且游戏模式有效" }, { status: 400 });
  }

  addScore(user.id, score, level, auctions, bestProfit, mode);
  return NextResponse.json({ ok: true, best: getUserBest(user.id, mode) });
}
