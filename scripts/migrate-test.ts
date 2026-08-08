// 存档迁移测试：模拟旧版重复数字 ID 存档，验证 sanitizeState 重排后唯一
import { sanitizeState } from "../src/game/save";
import type { GameState } from "../src/game/types";

// 构造一个“旧版”状态：两条线索 id 都是 909，两条新闻 id 都是 909，日志 id 重复
const old: GameState = {
  version: 1,
  cash: 12000, debt: 3000, intel: 2,
  inventory: [
    {
      id: "item-1", name: "泣血红玉", category: "珠宝", baseValue: 20000, authenticity: "真品",
      condition: "良好", conditionMult: 1.15, authMult: 1, tags: [], marketAtAcquire: 1,
      trueValue: 23000, estimateLow: 10000, estimateHigh: 20000, estimateMedian: 15000,
      clues: [
        { id: 909 as unknown as string, text: "线索A", signal: 1, strength: 0.9 },
        { id: 909 as unknown as string, text: "线索B", signal: 1, strength: 0.8 },
      ],
      appraised: false, pawned: null, acquiredRound: 1, acquiredLevel: 1, soldFor: null, profit: null,
    },
  ],
  auctionNumber: 3, level: 1, peakNet: 30000, bestProfit: 0, setsCompleted: 0, streak: 1,
  lastRoundProfit: null, milestones: [],
  market: { 绘画: 1, 珠宝: 1, 古币: 1, 武器: 1, 酒: 1, 手稿: 1, 雕塑: 1, 奇物: 1 },
  news: [
    { id: 909 as unknown as string, title: "新闻1", hint: "h", affects: [] },
    { id: 909 as unknown as string, title: "新闻2", hint: "h", affects: [] },
  ],
  specialBuyer: null,
  itemsThisRound: [
    {
      id: "lot-1", name: "无名港口", category: "绘画", baseValue: 15000, authenticity: "高仿",
      condition: "一般", conditionMult: 0.95, authMult: 0.45, tags: [], marketAtAcquire: 1,
      trueValue: 6412, estimateLow: 8000, estimateHigh: 16000, estimateMedian: 12000,
      clues: [
        { id: 909 as unknown as string, text: "线索C", signal: -1, strength: 0.7 },
        { id: 909 as unknown as string, text: "线索D", signal: -1, strength: 0.6 },
        { id: 909 as unknown as string, text: "线索E", signal: 0, strength: 0.5 },
      ],
      appraised: false, pawned: null, acquiredRound: 1, acquiredLevel: 1, soldFor: null, profit: null,
    },
  ],
  itemIndex: 0, phase: "bidding",
  currentPrice: 4500,
  bidders: [
    { id: "b1", name: "顾听泉", kind: "收藏家", emoji: "🎩", budget: 30000, preferred: ["绘画"], risk: 0.15, valuation: 12000, wants: true, bluffing: false, bluffCeiling: 0, patience: 7, heldItems: 0, wealthTier: "普通" },
    { id: "b1", name: "铁算盘阿九", kind: "黄牛", emoji: "🧮", budget: 20000, preferred: ["珠宝"], risk: 0.1, valuation: 8000, wants: true, bluffing: false, bluffCeiling: 0, patience: 4, heldItems: 0, wealthTier: "普通" },
  ],
  activeBidders: ["player", "b1"], currentBidder: "player", playerInAuction: true, playerBidRaises: 0,
  biddingLog: [
    { id: "L", text: "旧日志", kind: "system" },
    { id: "L", text: "旧日志2", kind: "system" },
  ],
  deal: null, inventoryFullNotice: false, totals: null, endReason: null,
};

const s = sanitizeState(old);
const allClueIds = [...s.inventory.flatMap((i) => i.clues), ...s.itemsThisRound.flatMap((i) => i.clues)].map((c) => c.id);
const newsIds = s.news.map((n) => n.id);
const logIds = s.biddingLog.map((l) => l.id);
const bidderIds = s.bidders.map((b) => b.id);

const uniq = (arr: string[]) => new Set(arr).size === arr.length;
const allStr = (arr: string[]) => arr.every((x) => typeof x === "string" && x.length > 0);

const pass =
  uniq(allClueIds) && allStr(allClueIds) &&
  uniq(newsIds) && allStr(newsIds) &&
  uniq(logIds) && allStr(logIds) &&
  uniq(bidderIds) && allStr(bidderIds);

console.log("clue ids:", allClueIds);
console.log("news ids:", newsIds);
console.log("bidder ids:", bidderIds);
console.log(pass ? "MIGRATION TEST PASS" : "MIGRATION TEST FAIL");
process.exit(pass ? 0 : 1);
