import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { GameMode } from "@/game/types";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  db = new DatabaseSync(path.join(dir, "game.db"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      peak_net INTEGER NOT NULL DEFAULT 0,
      best_level INTEGER NOT NULL DEFAULT 1,
      best_auctions INTEGER NOT NULL DEFAULT 0,
      last_daily_claim TEXT,
      daily_streak INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      peak_net INTEGER NOT NULL,
      level INTEGER NOT NULL,
      auctions INTEGER NOT NULL,
      best_profit INTEGER NOT NULL,
      mode TEXT NOT NULL DEFAULT 'endless',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
    CREATE INDEX IF NOT EXISTS idx_scores_peak ON scores(peak_net DESC);
  `);
  const scoreColumns = db.prepare("PRAGMA table_info(scores)").all() as Array<{ name: string }>;
  if (!scoreColumns.some((column) => column.name === "mode")) {
    db.exec("ALTER TABLE scores ADD COLUMN mode TEXT NOT NULL DEFAULT 'endless'");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_scores_mode ON scores(mode)");
  return db;
}

export type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  created_at: number;
  peak_net: number;
  best_level: number;
  best_auctions: number;
  last_daily_claim: string | null;
  daily_streak: number;
};

export function findUserByUsername(username: string): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function createUser(username: string, passwordHash: string): number {
  const info = getDb()
    .prepare("INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)")
    .run(username, passwordHash, Date.now());
  return Number(info.lastInsertRowid);
}

export function updateUserBest(userId: number, peakNet: number, level: number, auctions: number): void {
  getDb()
    .prepare(
      `UPDATE users SET
         peak_net = MAX(peak_net, ?),
         best_level = MAX(best_level, ?),
         best_auctions = MAX(best_auctions, ?)
       WHERE id = ?`
    )
    .run(Math.round(peakNet), Math.round(level), Math.round(auctions), userId);
}

export function getUserDailyClaim(userId: number): { last: string | null; streak: number } {
  const row = findUserById(userId);
  return { last: row?.last_daily_claim ?? null, streak: row?.daily_streak ?? 0 };
}

export function setDailyClaim(userId: number, today: string, streak: number): void {
  getDb()
    .prepare("UPDATE users SET last_daily_claim = ?, daily_streak = ? WHERE id = ?")
    .run(today, streak, userId);
}

export function insertSession(token: string, userId: number, expiresAt: number): void {
  getDb().prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    token, userId, Date.now(), expiresAt
  );
}

export function findSession(token: string): { user_id: number; expires_at: number } | undefined {
  return getDb().prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?").get(token) as
    | { user_id: number; expires_at: number }
    | undefined;
}

export function deleteSession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function deleteExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
}

export function addScore(
  userId: number,
  score: number,
  level: number,
  auctions: number,
  bestProfit: number,
  mode: GameMode
): void {
  getDb()
    .prepare(
      "INSERT INTO scores (user_id, peak_net, level, auctions, best_profit, mode, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      userId,
      Math.max(0, Math.round(score)),
      Math.max(1, Math.round(level)),
      Math.max(0, Math.round(auctions)),
      Math.max(0, Math.round(bestProfit)),
      mode,
      Date.now()
    );
  updateUserBest(userId, score, level, auctions);
}

export type LeaderboardEntry = {
  rank: number;
  username: string;
  mode: GameMode;
  peak_net: number;
  level: number;
  auctions: number;
  runs: number;
  last_run_at: number;
};

export function getLeaderboard(limit = 50, mode?: GameMode): LeaderboardEntry[] {
  const statement = getDb().prepare(
    `SELECT u.username AS username,
            s.mode AS mode,
            MAX(s.peak_net) AS peak_net,
            MAX(s.level) AS level,
            MAX(s.auctions) AS auctions,
            COUNT(*) AS runs,
            MAX(s.created_at) AS last_run_at
     FROM scores s JOIN users u ON u.id = s.user_id
     ${mode ? "WHERE s.mode = ?" : ""}
     GROUP BY s.user_id, s.mode
     ORDER BY peak_net DESC, level DESC, auctions DESC
     LIMIT ?`
  );
  const rows = (mode ? statement.all(mode, limit) : statement.all(limit)) as Array<
    Omit<LeaderboardEntry, "rank">
  >;
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function getUserBest(
  userId: number,
  mode?: GameMode
): { peak_net: number; level: number; auctions: number; runs: number } {
  const statement = getDb().prepare(
    `SELECT COALESCE(MAX(peak_net),0) AS peak_net,
            COALESCE(MAX(level),0) AS level,
            COALESCE(MAX(auctions),0) AS auctions,
            COUNT(*) AS runs
     FROM scores WHERE user_id = ?${mode ? " AND mode = ?" : ""}`
  );
  const row = (mode ? statement.get(userId, mode) : statement.get(userId)) as {
    peak_net: number;
    level: number;
    auctions: number;
    runs: number;
  };
  return row;
}

/** 上海时区的当天日期字符串 YYYY-MM-DD */
export function todayShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
