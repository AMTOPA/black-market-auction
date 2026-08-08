import { NextResponse } from "next/server";
import { CONFIG } from "@/game/config";
import { nextMidnightMs, todayShanghai } from "@/game/format";
import { getCurrentUser } from "@/lib/auth";
import { findUserById, getUserDailyClaim, setDailyClaim } from "@/lib/db";

function previousDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return [
    previous.getUTCFullYear(),
    String(previous.getUTCMonth() + 1).padStart(2, "0"),
    String(previous.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function amountForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
  return Math.min(
    CONFIG.dailyWelfareCap,
    CONFIG.dailyWelfareBase + (safeLevel - 1) * CONFIG.dailyWelfarePerLevel,
  );
}

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      claimed: false,
      amount: 0,
      streak: 0,
      nextResetMs: nextMidnightMs(),
      error: "请先登录",
    },
    { status: 401 },
  );
}

async function claimContext() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const user = findUserById(currentUser.id);
  if (!user) return null;

  const today = todayShanghai();
  const daily = getUserDailyClaim(user.id);
  const claimed = daily.last === today;
  const streak = claimed
    ? daily.streak
    : daily.last === previousDate(today)
      ? daily.streak + 1
      : 1;

  return {
    user,
    today,
    claimed,
    streak,
    amount: claimed ? 0 : amountForLevel(user.best_level),
  };
}

export async function GET() {
  const context = await claimContext();
  if (!context) return unauthorized();

  return NextResponse.json({
    ok: true,
    claimed: context.claimed,
    amount: context.amount,
    streak: context.streak,
    nextResetMs: nextMidnightMs(),
  });
}

export async function POST() {
  const context = await claimContext();
  if (!context) return unauthorized();

  if (context.claimed) {
    return NextResponse.json({
      ok: true,
      claimed: true,
      amount: 0,
      streak: context.streak,
      nextResetMs: nextMidnightMs(),
    });
  }

  setDailyClaim(context.user.id, context.today, context.streak);
  return NextResponse.json({
    ok: true,
    claimed: true,
    amount: context.amount,
    streak: context.streak,
    nextResetMs: nextMidnightMs(),
  });
}
