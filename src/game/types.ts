// ============ 黑市拍卖行 · 核心类型定义 ============
// 本文件是所有模块（引擎 / 生成器 / UI）的唯一数据契约，请勿随意改动字段名。

export type Category = "绘画" | "珠宝" | "古币" | "武器" | "酒" | "手稿" | "雕塑" | "奇物";
export type Authenticity = "真品" | "高仿" | "赝品";
export type Condition = "完美" | "良好" | "一般" | "破损" | "严重损坏";
export type Tag = "皇室" | "战争遗物" | "禁品" | "失窃品" | "名家" | "异域来客";
export type AIKind = "收藏家" | "黄牛" | "赌徒" | "老狐狸" | "富豪";
export type BidChoice = "small" | "standard" | "strong" | "exit";
export type IntelAction = "authenticity" | "estimate" | "buyer" | "clue";
export type ItemAction = "sell" | "appraise" | "hold" | "pawn" | "redeem";

/** 公开线索。signal/strength 对玩家隐藏，仅引擎使用。 */
export interface Clue {
  id: number;
  text: string;
  signal: 1 | 0 | -1; // +1 指向真品，-1 指向赝品，0 中性
  strength: number; // 0..1，影响玩家判断的重要程度
}

export interface SetInfo {
  setId: number;
  setName: string;
  index: number; // 1-based
  size: number;
  partLabel: string; // 例如 "失落王朝金币 · 1/3"
}

export interface PawnInfo {
  principal: number; // 抵押所得本金
  roundsLeft: number; // 剩余可赎回场次
}

export interface Item {
  id: string;
  name: string;
  category: Category;
  baseValue: number; // 基础价值 V
  authenticity: Authenticity;
  condition: Condition;
  conditionMult: number;
  authMult: number; // 真品1 / 高仿0.45 / 赝品0.08
  tags: Tag[];
  setInfo?: SetInfo;
  marketAtAcquire: number; // 入手时的该类目市场倍率（仅展示参考）
  trueValue: number; // baseValue * conditionMult * authMult（不含市场）
  estimateLow: number;
  estimateHigh: number;
  estimateMedian: number;
  clues: Clue[]; // 2~3 条公开线索（UI 只显示 text）
  appraised: boolean;
  pawned: PawnInfo | null;
  acquiredRound: number; // 第几场拍到的（1-based）
  acquiredLevel: number;
  soldFor: number | null; // 卖出实收（含市场与折扣）
  profit: number | null; // soldFor - 入手成本（含鉴定费等）
}

export type WealthTier = "拮据" | "普通" | "富裕" | "雄厚" | "深不可测";

export interface AIBidder {
  id: string;
  name: string;
  kind: AIKind;
  emoji: string;
  budget: number; // 总预算，拍下后扣减
  preferred: Category[];
  risk: number; // 0..1 估值误差
  /** 以下为“当前拍品”的临时状态，引擎在每件拍品开始时重置 */
  valuation: number;
  wants: boolean;
  bluffing: boolean;
  bluffCeiling: number;
  patience: number;
  heldItems: number; // 本场已拍下件数
  wealthTier: WealthTier;
}

export interface NewsEvent {
  id: number;
  title: string;
  hint: string; // 给玩家的提示文案
  affects: { category: Category; dir: 1 | -1 }[];
}

export interface SpecialBuyer {
  name: string;
  emoji: string;
  wantCategory: Category;
  wantTag: Tag | null;
  mult: number; // 1.3 ~ 2.0
  blurb: string;
}

export type LogKind = "bid" | "info" | "deal" | "system" | "intel";

export interface LogEntry {
  id: number;
  text: string;
  kind: LogKind;
  actor?: string;
}

export interface DealResult {
  item: Item;
  wonBy: string; // "player" 或 bidder id
  wonByName: string;
  price: number;
  /** AI 赢下时向玩家揭示真相，用于学习 */
  reveal: { authenticity: Authenticity; trueValue: number } | null;
}

export interface SettlementTotals {
  roundProfit: number; // 本场净盈亏（不含未实现浮盈）
  soldCount: number;
  soldRevenue: number;
  storageFees: number;
  interestPaid: number;
  appraisalCosts: number;
  pawnProceeds: number;
  specialSales: number;
}

export interface GameState {
  version: number;
  // 资源
  cash: number;
  debt: number;
  intel: number;
  inventory: Item[];
  // 进度
  auctionNumber: number; // 已完整结束的场次（从0开始）
  level: number; // 当前拍卖等级（按历史峰值只升不降）
  peakNet: number;
  bestProfit: number;
  setsCompleted: number;
  streak: number; // 连续盈利场次
  lastRoundProfit: number | null;
  milestones: string[];
  // 市场
  market: Record<Category, number>;
  news: NewsEvent[];
  specialBuyer: SpecialBuyer | null;
  // 本轮进行中
  itemsThisRound: Item[];
  itemIndex: number; // 0-based，指向当前拍品
  phase: "bidding" | "settlement" | "runEnd";
  // 竞价现场
  currentPrice: number;
  bidders: AIBidder[];
  activeBidders: string[]; // "player" 或 bidder id，仍在竞价中
  currentBidder: string | null; // 轮到谁表态
  playerInAuction: boolean;
  playerBidRaises: number; // 玩家本件拍品的加价次数
  biddingLog: LogEntry[];
  deal: DealResult | null; // 成交后弹出揭示
  inventoryFullNotice: boolean; // 库存满时玩家无法竞拍
  // 结算
  totals: SettlementTotals | null;
  // 终局
  endReason: string | null;
}

export type RunResult = {
  peakNet: number;
  level: number;
  auctions: number;
  bestProfit: number;
  setsCompleted: number;
  endReason: string;
};
