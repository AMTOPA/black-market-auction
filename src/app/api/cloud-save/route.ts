import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCloudSave, upsertCloudSave } from "@/lib/db";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "请先登录" }, { status: 401 });
}

function invalid() {
  return NextResponse.json({ ok: false, error: "参数无效" }, { status: 400 });
}

/** 读取当前账号的云端存档（payload 为 { game, profile } 或 null） */
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorized();

  const row = getCloudSave(currentUser.id);
  if (!row) {
    return NextResponse.json({ ok: true, payload: null, updatedAt: 0 });
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(row.payload);
  } catch {
    payload = null;
  }
  return NextResponse.json({ ok: true, payload, updatedAt: row.updated_at });
}

/** 备份当前账号的存档。updatedAt 不大于云端已有时间戳时拒绝（避免旧数据覆盖新数据）。 */
export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!record) return invalid();

  const updatedAt = Number(record.updatedAt);
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return invalid();

  const game = record.game ?? null;
  const profile = record.profile ?? null;
  if (game !== null && (typeof game !== "object" || Array.isArray(game))) return invalid();
  if (profile !== null && (typeof profile !== "object" || Array.isArray(profile))) return invalid();

  const existing = getCloudSave(currentUser.id);
  if (existing && updatedAt <= existing.updated_at) {
    // 客户端比云端旧：拒绝本次覆盖，返回云端最新时间戳供客户端拉取
    return NextResponse.json({ ok: true, accepted: false, updatedAt: existing.updated_at });
  }

  upsertCloudSave(currentUser.id, JSON.stringify({ game, profile }), Math.floor(updatedAt));
  return NextResponse.json({ ok: true, accepted: true, updatedAt: Math.floor(updatedAt) });
}
