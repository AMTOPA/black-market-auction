// ============ 黑市拍卖行 · 数值平衡表 ============
import type { Condition } from "./types";

export const CONFIG = {
  version: 1,
  categories: ["绘画", "珠宝", "古币", "武器", "酒", "手稿", "雕塑", "奇物"] as const,
  startCash: 30000,
  inventoryCap: 6,
  creditRatio: 0.3,
  interestRate: 0.08,
  intelPerAuction: 2,
  intelCarryMax: 1,
  itemsPerAuction: 8,
  numBidders: 4,
  startBidRatio: 0.3,
  bidSteps: { small: 0.05, standard: 0.15, strong: 0.35 },
  authMult: { 真品: 1, 高仿: 0.45, 赝品: 0.08 },
  conditionMult: { 完美: 1.35, 良好: 1.15, 一般: 0.95, 破损: 0.7, 严重损坏: 0.5 },
  conditionWeights: [
    { c: "完美", w: 20 },
    { c: "良好", w: 36 },
    { c: "一般", w: 26 },
    { c: "破损", w: 13 },
    { c: "严重损坏", w: 5 },
  ] satisfies Array<{ c: Condition; w: number }>,
  estHaircutRaw: 0.6,
  estHaircutAppraised: 0.9,
  appraiseFeeRate: 0.05,
  unappraisedMin: 0.8,
  unappraisedMax: 0.95,
  storageFeeRate: 0.01,
  pawnRate: 0.5,
  pawnRounds: 3,
  pawnRedeemFee: 0.1,
  forcedLiquidationAppraised: 0.8,
  forcedLiquidationRaw: 0.6,
  setChance: 0.12,
  setBonusMin: 1.5,
  setBonusMax: 3.0,
  specialBuyerChance: 0.4,
  specialBuyerMultMin: 1.3,
  specialBuyerMultMax: 2.0,
  marketMin: 0.6,
  marketMax: 2.0,
  marketDrift: 0.12,
  marketRevert: 0.12,
  newsBias: 0.7,
  levelNames: ["跳蚤市场", "私人仓库", "古董沙龙", "黑市拍卖", "富豪密拍", "国家级藏品交易", "无尽高端市场"],
  levelThresholds: [0, 60000, 150000, 400000, 1000000, 3000000, 8000000],
  levelStepBeyond: 8000000,
  entryFees: [500, 1500, 4000, 10000, 25000, 60000, 120000],
  entryFeeGrowth: 1.9,
  valueRanges: [[2000, 15000], [8000, 60000], [30000, 200000], [120000, 800000], [500000, 3000000], [2000000, 12000000], [8000000, 50000000]],
  authWeightsByLevel: [[65, 25, 10], [60, 28, 12], [55, 30, 15], [50, 32, 18], [45, 33, 22], [40, 34, 26], [35, 35, 30]],
  estimateWidthByLevel: [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65],
  bidderBudgetMult: {
    收藏家: [1.2, 2.2],
    黄牛: [1.5, 2.5],
    赌徒: [0.9, 2.4],
    老狐狸: [1.4, 2.6],
    富豪: [2.5, 4.5],
  },
  dailyWelfareBase: 3000,
  dailyWelfarePerLevel: 1500,
  dailyWelfareCap: 80000,

  milestoneThresholds: [100000, 300000, 800000, 2000000, 5000000, 12000000],
  // ---- 多元化扩展：模式 / 委托 / 声望 ----
  sprintRounds: 8, // 竞速挑战固定场次
  commissionChance: 0.8, // 每场获得委托的概率（避免每场都有）
  commissionRewardMin: 1000, // 委托保底奖励
  commissionRewardScale: 0.03, // 委托奖励随净资产缩放
  commissionRepAward: 5, // 完成委托的声望奖励
  repCap: 200, // 声望上限
  repDiscountAt: 50, // 声望达到后入场费 8 折
  repDiscountRate: 0.2,
  repSpecialAt: 100, // 声望达到后特殊买家必现
};

