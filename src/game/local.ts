// ============ 本地持久化辅助（localStorage） ============
// 统一存放"本地最后修改时间"等跨模块共享的持久化元数据，
// 供 save.ts / profile.ts / GameApp 使用，避免模块间循环依赖。

const TS_KEY = "bma_last_local_ts";

export function storage(): Storage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

/** 本地存档最后被修改的时间戳（ms）；从未有过本地数据时为 0 */
export function getLastLocalTs(): number {
  const store = storage();
  if (!store) return 0;
  try {
    const raw = store.getItem(TS_KEY);
    if (!raw) return 0;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/** 记录本地存档（游戏进度 / 玩家档案）被修改的时间戳 */
export function setLastLocalTs(ts: number): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(TS_KEY, String(ts));
  } catch {
    // localStorage 不可用时静默
  }
}
