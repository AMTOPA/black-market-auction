const SHANGHAI_TIME_ZONE = "Asia/Shanghai";
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

function finiteOrZero(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function trimDecimals(n: number, maximumFractionDigits: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
    useGrouping: false,
  });
}

export function formatMoney(n: number): string {
  const rounded = Math.round(finiteOrZero(n));
  return (Object.is(rounded, -0) ? 0 : rounded).toLocaleString("en-US");
}

export function formatMoneyCn(n: number): string {
  const value = finiteOrZero(n);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 100_000_000) {
    return `${sign}${trimDecimals(abs / 100_000_000, 1)}亿`;
  }
  if (abs >= 10_000) {
    return `${sign}${trimDecimals(abs / 10_000, 1)}万`;
  }
  return formatMoney(value);
}

export function formatPct(n: number): string {
  return `${trimDecimals(finiteOrZero(n) * 100, 1)}%`;
}

export function formatMult(n: number): string {
  return `×${trimDecimals(finiteOrZero(n), 2)}`;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(finiteOrZero(ms) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function todayShanghai(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHANGHAI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function nextMidnightMs(): number {
  const [year, month, day] = todayShanghai().split("-").map(Number);
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1) - SHANGHAI_OFFSET_MS;
  return Math.max(0, nextMidnightUtc - Date.now());
}
