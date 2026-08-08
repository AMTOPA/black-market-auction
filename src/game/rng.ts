// ============ 黑市拍卖行 · 随机工具 ============

/** 返回 [min, max] 区间内的随机浮点数。 */
export function rand(min: number, max: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return low + Math.random() * (high - low);
}

/** 返回 [min, max] 区间内的随机整数。 */
export function randInt(min: number, max: number): number {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (low > high) throw new RangeError("随机整数区间内没有可取值");
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

/** 按概率 p 判定事件是否发生。 */
export function chance(p: number): boolean {
  if (p <= 0) return false;
  if (p >= 1) return true;
  return Math.random() < p;
}

/** 从非空数组中随机取一项。 */
export function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new RangeError("不能从空数组中随机取值");
  return arr[randInt(0, arr.length - 1)];
}

/** 从数组中不重复地随机取至多 n 项，不修改原数组。 */
export function pickN<T>(arr: T[], n: number): T[] {
  if (n <= 0 || arr.length === 0) return [];
  return shuffle(arr).slice(0, Math.min(Math.floor(n), arr.length));
}

/** 按非负权重随机取值；总权重为 0 时退化为等概率抽取。 */
export function weightedPick<T>(items: Array<{ value: T; weight: number }>): T {
  if (items.length === 0) throw new RangeError("不能从空权重表中随机取值");

  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (total <= 0) return pick(items).value;

  let roll = Math.random() * total;
  for (const item of items) {
    roll -= Math.max(0, item.weight);
    if (roll < 0) return item.value;
  }
  return items[items.length - 1].value;
}

/** Fisher-Yates 洗牌；返回新数组，不修改原数组。 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
