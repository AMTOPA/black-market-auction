# 《黑市拍卖行》构建契约（CONTRACT）

本文件是并行开发的唯一契约。**先读 `src/game/types.ts` 与 `src/game/engine.ts`（已写完，勿改）**，再实现各自负责的文件。不要修改别人负责的文件。所有文件名与导出名必须与契约完全一致，否则编译失败。

## 文件树（谁写什么）

```
src/
  app/
    layout.tsx            ← A
    page.tsx              ← A
    globals.css           ✅ 已完成（设计系统，只读）
    api/
      auth/register|login|logout|me/route.ts   ✅ 已完成
      leaderboard/route.ts   ← D
      daily-claim/route.ts   ← D
  lib/
    db.ts                 ✅ 已完成
    auth.ts               ✅ 已完成
    api.ts                ← D
  game/
    types.ts              ✅ 已完成（只读）
    engine.ts             ✅ 已完成（只读）
    config.ts             ← C
    content.ts            ← C
    generator.ts          ← C
    rng.ts                ← C
    format.ts             ← D
    save.ts               ← D
    audio.ts              ← D
  components/
    GameApp.tsx           ← 主线程（负责人最后集成，A 不要写）
    HomeScreen.tsx        ← A
    AuthModal.tsx         ← A
    LeaderboardScreen.tsx ← A
    RunEndScreen.tsx      ← A
    AuctionScreen.tsx     ← B
    SettlementScreen.tsx  ← B
    HUD.tsx               ← B
    ItemCard.tsx          ← B
```

- A = Agent A（首页/登录/排行榜/终局 + layout/page）
- B = Agent B（拍卖现场 + 结算 + 共享组件）
- C = Agent C（数值/内容/生成器）
- D = Agent D（工具/存档/音效/前端 API + 两个后端路由）

所有 UI 组件顶部加 `"use client";`。

## 一、types.ts 要点（必须遵守）

- `Category`: 绘画|珠宝|古币|武器|酒|手稿|雕塑|奇物（8 类）
- `Authenticity`: 真品|高仿|赝品；`Condition`: 完美|良好|一般|破损|严重损坏
- `Tag`: 皇室|战争遗物|禁品|失窃品|名家|异域来客
- `AIKind`: 收藏家|黄牛|赌徒|老狐狸|富豪
- `Item` 关键字段：`name, category, baseValue, authenticity, condition, tags, setInfo?, trueValue, estimateLow, estimateHigh, estimateMedian, clues[] (UI 只显示 text), appraised, pawned?, acquiredRound, acquiredLevel`
- `AIBidder`: `id, name, kind, emoji, budget, preferred[], risk, valuation, wants, bluffing, bluffCeiling, patience, heldItems, wealthTier`
- `GameState.phase`: `"bidding" | "settlement" | "runEnd"`
- 不要改字段名；新增字段可以，但要保证 `engine.ts` 能正常运行（engine 用 `{...state}` 浅拷贝，新增字段没问题）。

## 二、engine.ts 对外 API（只读，UI 按此调用）

```
newGame(): GameState
beginRound(state): GameState
playerBid(state, choice: "small"|"standard"|"strong"|"exit"): GameState
aiStep(state): GameState                    // 每 tick 调一次，AI 走一步
afterDealContinue(state): GameState         // 关闭成交揭示 → 下一件/结算
playerIntel(state, action: "authenticity"|"estimate"|"buyer"|"clue"): GameState
settlementAction(state, itemId, action: "sell"|"appraise"|"hold"|"pawn"|"redeem"): GameState
acceptSpecialBuyer(state, itemId): GameState
nextRound(state): GameState                 // 结算完成 → 下一场或 runEnd
forceEndRun(state, reason): GameState
computeNetAssets(state): number
conservativeValue(item): number
itemMarketValue(state, item): number
availableCredit(state): number
canBidAt(state, price): boolean
computeLevel(peak): number
entryFee(level): number
levelName(level): string
buildRunResult(state): RunResult
recentLog(state, n?): LogEntry[]
```

UI 驱动竞价的伪代码（B 必须这样做）：
```ts
// 当 state.phase==="bidding" && !state.deal && state.currentBidder!=="player" 时，
// 用 setInterval / setTimeout 循环调用： setState(s => engine.aiStep(s))
// 直到 currentBidder==="player" 或 deal 出现。
```

## 三、CSS 类（globals.css 已完成，直接使用，不要重复造样式）

布局 `.screen .screen-narrow`；面板 `.panel .panel-title`；按钮 `.btn .btn-gold .btn-danger .btn-green .btn-violet .btn-lg .btn-sm .btn-block .btn-row`；表单 `.input .field-label .error-text`；统计 `.stat .stat-value(.gold/.green/.red/.violet) .stat-label`；网格 `.grid .grid-2/3/4`；文本 `.muted .faint .small .tiny .bold .right .center .gold .green .red .violet .cyan`；标签 `.tag .tag-gold .tag-red .tag-violet .tag-green .tag-cyan`；HUD `.hud .hud-item .hud-label .hud-value(色) .hud-spacer`；拍品 `.item-card .item-name .item-sub .estimate .clue`；买家 `.bidder-row .bidder(.active/.out/.player-card) .avatar .bidder-name .bidder-kind .wealth`；竞价 `.bid-panel .bid-btn .bid-sub`；日志 `.log .log-entry(.bid/.deal/.intel/.system)`；覆盖层 `.overlay .deal-card(.win/.lose) .deal-stamp`；排行榜 `.lb-table .rank-1/2/3 .me`；首页 `.hero .logo .logo-sub .home-actions .home-stats .claim-card .claim-title`；模态 `.modal .modal-title .tabs .tab(.active)`；市场 `.market-grid .market-cell .cat .mult .up .down .flat`；新闻 `.news-item .news-title .news-hint`；里程碑 `.milestone`；提示 `.notice`；动画 `.fade-in .fade-in-up .floaty .glow-pulse`。

文字颜色也可直接用 `.gold .green .red .violet .cyan`。

## 四、Agent C：`src/game/` 下的 rng/config/content/generator（4 个文件）

### rng.ts（导出这些）
```ts
export function rand(min: number, max: number): number;      // 闭区间浮点
export function randInt(min: number, max: number): number;   // 闭区间整数
export function chance(p: number): boolean;                  // p∈[0,1]
export function pick<T>(arr: T[]): T;
export function pickN<T>(arr: T[], n: number): T[];          // 不重复
export function weightedPick<T>(items: Array<{ value: T; weight: number }>): T;
export function shuffle<T>(arr: T[]): T[];
```

### config.ts（导出 CONFIG，数值即平衡表）
```ts
export const CONFIG = {
  version: 1,
  categories: ["绘画","珠宝","古币","武器","酒","手稿","雕塑","奇物"] as const,
  startCash: 30000,
  inventoryCap: 6,
  creditRatio: 0.3,
  interestRate: 0.08,
  intelPerAuction: 2,
  intelCarryMax: 1,
  itemsPerAuction: 8,
  numBidders: 4,
  startBidRatio: 0.3,        // 起拍价 = 估价下限 × 30%
  bidSteps: { small: 0.05, standard: 0.15, strong: 0.35 },
  authMult: { 真品: 1, 高仿: 0.45, 赝品: 0.08 },
  conditionMult: { 完美: 1.15, 良好: 1.0, 一般: 0.85, 破损: 0.6, 严重损坏: 0.35 },
  conditionWeights: [ {c:"完美",w:16},{c:"良好",w:36},{c:"一般",w:28},{c:"破损",w:14},{c:"严重损坏",w:6} ],
  estHaircutRaw: 0.6,        // 未鉴定保守估值系数
  estHaircutAppraised: 0.9,  // 已鉴定保守估值系数
  appraiseFeeRate: 0.05,     // 鉴定费 = 估价中位数×5%
  unappraisedMin: 0.8, unappraisedMax: 0.95,
  storageFeeRate: 0.01,
  pawnRate: 0.5, pawnRounds: 3, pawnRedeemFee: 0.1,
  forcedLiquidationAppraised: 0.8, forcedLiquidationRaw: 0.6,
  setChance: 0.12,           // 拍品成套概率
  setBonusMin: 1.5, setBonusMax: 3.0,
  specialBuyerChance: 0.3,
  specialBuyerMultMin: 1.3, specialBuyerMultMax: 2.0,
  marketMin: 0.6, marketMax: 2.0, marketDrift: 0.09, marketRevert: 0.12, newsBias: 0.7,
  levelNames: ["跳蚤市场","私人仓库","古董沙龙","黑市拍卖","富豪密拍","国家级藏品交易","无尽高端市场"],
  levelThresholds: [0, 60000, 150000, 400000, 1000000, 3000000, 8000000],  // 峰值净资产门槛
  levelStepBeyond: 8000000,  // 7 级以后每升一级所需增量
  entryFees: [500, 1500, 4000, 10000, 25000, 60000, 120000],
  entryFeeGrowth: 1.9,
  // 每级拍品基础价值区间 [low, high]
  valueRanges: [[2000,15000],[8000,60000],[30000,200000],[120000,800000],[500000,3000000],[2000000,12000000],[8000000,50000000]],
  // 每级真伪权重 [真品, 高仿, 赝品]
  authWeightsByLevel: [[65,25,10],[60,28,12],[55,30,15],[50,32,18],[45,33,22],[40,34,26],[35,35,30]],
  // 每级估价区间宽度（中位数的±比例）
  estimateWidthByLevel: [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65],
  // 每级 AI 预算倍数（相对该级价值区间中位）
  bidderBudgetMult: { 收藏家: [1.2, 2.2], 黄牛: [1.5, 2.5], 赌徒: [0.9, 2.4], 老狐狸: [1.4, 2.6], 富豪: [2.5, 4.5] },
  // 每日补助
  dailyWelfareBase: 3000, dailyWelfarePerLevel: 1500, dailyWelfareCap: 80000,
  // 里程碑（净资产）
  milestoneThresholds: [100000, 300000, 800000, 2000000, 5000000, 12000000],
};
```

### content.ts（导出文本池，全部中文，文艺有味道）
```ts
export const ITEM_NAMES: Record<Category, string[]>;   // 每类至少 16 个名字，如 绘画: "无名港口","雾中灯塔",...；奇物: "永动沙漏","逆纹罗盘",...
export const ITEM_ADJECTIVES: string[];                // 前缀，如 "鎏金","残破","鎏彩","乌木","象牙","珐琅","鎏银","漆器"
export interface ClueTemplate { text: string; strength: number; }
export const GENUINE_CLUES: ClueTemplate[];   // ≥12 条，指向真品（如 "流传有序，最早可追溯至 19XX 年的私人收藏"）
export const FAKE_CLUES: ClueTemplate[];      // ≥12 条，指向赝品（如 "底部发现修复痕迹","卖家拒绝透露来源","专家意见存在争议"）
export const NEUTRAL_CLUES: ClueTemplate[];   // ≥6 条，中性（如 "拍卖行未提供任何检测报告"）
export interface NewsTemplate { title: string; hint: string; affects: { category: Category; dir: 1 | -1 }[]; }
export const NEWS_TEMPLATES: NewsTemplate[];  // ≥12 条，覆盖各类目，如 { title:"欧洲博物馆筹备战争遗物大展", hint:"武器类近期可能走俏", affects:[{category:"武器",dir:1}] }
export interface SetTemplate { setId: number; setName: string; category: Category; parts: string[]; } // parts 长度 2~4
export const SET_TEMPLATES: SetTemplate[];    // ≥8 套，如 { setName:"失落王朝金币", category:"古币", parts:["第一枚","第二枚","第三枚"] }
export const AI_PROFILES: Record<AIKind, { emojis: string[]; names: string[]; risk: number; patience: [number, number]; bluffChance: number; preferredCount: [number, number]; }>;
// risk: 收藏家0.15 黄牛0.1 赌徒0.35 老狐狸0.25 富豪0.12
// bluffChance: 只有老狐狸 >0（如0.35），其他 0
// patience: 收藏家[5,9] 黄牛[3,6] 赌徒[4,8] 老狐狸[6,10] 富豪[4,8]
export const SPECIAL_BUYERS: { name: string; emoji: string; blurb: string }[];  // ≥8，如 {name:"神秘私人藏家",emoji:"🕶️",blurb:"在寻找某类珍品"}
export const AI_KIND_LABEL: Record<AIKind, string>;  // 已含在 kind，可省略
```

### generator.ts（导出这些，是唯一产生随机内容的地方）
```ts
export function generateAuctionItems(level: number, market: Record<Category, number>, count: number, auctionNumber: number): Item[];
export function generateAIBidders(level: number): AIBidder[];
export function pickNews(): NewsEvent[];
export function rollSpecialBuyer(): SpecialBuyer | null;
export function aiPrepareItem(bidder: AIBidder, item: Item, marketMult: number, level: number): Partial<AIBidder>;
export function intelReveal(item: Item, action: IntelAction, bidders: AIBidder[], marketMult: number): string;
```

**generateAuctionItems 规则**（用 rng 实现，公式固定）：
1. 取 `valueRanges[min(level-1, len-1)]`，`baseValue = randInt(low, high)`，金额向百取整。
2. `category = pick(CONFIG.categories)`；等级≥5 时奇物/雕塑权重略升（可简单处理：随机即可）。
3. `authenticity = weightedPick(真品/高仿/赝品 by authWeightsByLevel[level-1])`。
4. `condition = weightedPick(CONFIG.conditionWeights)`。
5. `trueValue = round(baseValue × authMult × conditionMult)`（向百取整）。
6. 标签：独立概率 `名家8% 战争遗物6% 皇室4% 禁品5% 失窃品5% 异域来客6%`，等级≥5 时翻倍，最多 2 个，且 `未鉴定` 不加标签。真品+名家 时价值不额外加（标签用于叙事与特殊买家，不改变 V）。
7. 估价：`median = round100(baseValue × rand(0.85,1.15))`；`width = estimateWidthByLevel[min(level-1,6)]`；`low = round100(median×(1-width))`，`high = round100(median×(1+width))`。**估价围绕 baseValue 而非 trueValue**，让赝品看起来值钱。
8. 线索：真品 → 取 2 条 GENUINE（strength 用模板值，随机 25% 概率把其中 1 条换成 FAKE 误导）；赝品/高仿 → 取 2 条 FAKE（30% 概率换 1 条 GENUINE 误导）；再加 1 条 NEUTRAL。最终 2~3 条。`signal` 按来源设定（1/-1/0）。
9. 成套：`chance(setChance×1.2)` 且 level≥2 时生效（等级1不出现套装，降低门槛）：从 SET_TEMPLATES 随机一套，`index = randInt(1,size)`，`partLabel = setName + " · " + index + "/" + size`；**同一场不会出现同一套的两件**（简单起见：每场最多给 1 件套装拍品即可）。
10. 名称：`pick(ITEM_ADJECTIVES) + pick(ITEM_NAMES[category])`；若成套则直接使用套装 part 名（如 "失落王朝金币 · 2/3"）。id 用 `nextId()`（从 engine 导入）。

**generateAIBidders 规则**：
- 数量 `CONFIG.numBidders`，从 5 种性格中 `pickN`（不重复，若不足 5 则允许重复）。
- 姓名/emoji 从 `AI_PROFILES[kind]` 取，`risk` 用模板值。
- 预算：`mid = valueRanges[min(level-1,6)] 的中位数`，`mult = rand(bidderBudgetMult[kind][0], [1])`，`budget = round100(mid × mult × rand(0.85,1.15))`；富豪 ×2.5~4.5 保证有钱。
- `preferred`：收藏家取 1 个固定偏好类 + 随机 1 个；富豪偏好 `绘画|雕塑|珠宝` 中随机 1-2；其他随机 1-2 个类目。
- `wealthTier` 按 budget 档位：<15k 拮据 / <60k 普通 / <200k 富裕 / <800k 雄厚 / else 深不可测。
- `valuation/wants/bluffing/bluffCeiling/patience` 初值随意（每件拍品会被 aiPrepareItem 重置）。

**aiPrepareItem 规则**（每件拍品开始时 engine 调用，返回覆盖字段）：
- `prefMult`：bidder.preferred 含该类别时 = 1.25（收藏家 1.45；富豪 1.15）；不含 = 1.0。收藏家若 item.setInfo 且其曾持有同套（engine 不跟踪，简化：直接给 setInfo 的物品收藏家 prefMult 1.5）。
- `valuation = round(item.trueValue × marketMult × prefMult × (1 + (risk×2-1)×0.25))`。
- 赌徒额外：若估价区间宽（`(high-low)/median > 0.8`）则 `valuation ×= 1.3`（赌未知）。
- `wants = valuation >= currentPrice×0.85`（由 engine 传入 currentPrice 之前……注意：**engine 在 startItemAuction 里先设好 currentPrice 再调 aiPrepareItem**，但你的函数签名不含 currentPrice——用 `item.estimateLow×0.3` 近似起拍价即可，wants 由 engine 运行时再判断：**engine 的逻辑是 `willRaise = wants || bluffing`，且 `price > valuation && !bluffing` 时退出**，所以 aiPrepareItem 只需给 valuation/bluffing/patience/估值相关即可，wants 可留 true 由 valuation 自动挡）。为稳妥：`wants = true`（engine 用 valuation 自动截断），黄牛例外：`wants = valuation >= item.estimateMedian×1.15`（只追明显低估）。
- 老狐狸：`bluffing = chance(0.35) && level>=2`；`bluffCeiling = min(valuation×0.9, budget×0.55)`。
- `patience = randInt(模板[0],[1])`。

**pickNews**：从 NEWS_TEMPLATES 随机 1~2 条不重复。

**rollSpecialBuyer**：`chance(specialBuyerChance)` 否则 null；`wantCategory = pick(categories)`；30% 概率附加 `wantTag = pick(tags)`；`mult = rand(1.3,2.0)` 取一位小数；name/emoji/blurb 从 SPECIAL_BUYERS 取。

**intelReveal**：根据 action 返回中文情报文本（**不要直接暴露精确真实价值**）：
- authenticity：真品→"多方线索指向真品，但仍有高仿的可能。"；高仿→"有较高概率是高仿，需谨慎对待。"；赝品→"多条线索指向赝品，风险极高。"
- estimate：返回 `"合理价值大概率在 " + formatMoney(round100(trueValue×0.85)) + " ~ " + formatMoney(round100(trueValue×1.15)) + " 之间。"`
- buyer：随机一位 bidder，返回 `"「name」偏好 " + preferred.join("、") + "，财力" + wealthTier + "。"`
- clue：随机一条线索，按 signal 返回 `"「"+text+"」这条线索" + (1→"比较可靠，可以采信。" / -1→"有误导嫌疑，需要怀疑。" / 0→"不置可否，参考价值有限。")`

## 五、Agent D：`format.ts / save.ts / audio.ts / api.ts` + 两个后端路由

### format.ts
```ts
export function formatMoney(n: number): string;        // 千分位，如 "12,400"；负数带 -
export function formatMoneyCn(n: number): string;      // 中文：≥1亿 "1.2亿"，≥1万 "3.4万"，否则千分位
export function formatPct(n: number): string;          // 0.08 → "8%"
export function formatMult(n: number): string;         // 1.25 → "×1.25"
export function formatClock(ms: number): string;       // 倒计时 "HH:MM:SS"
export function todayShanghai(): string;               // 上海时区 YYYY-MM-DD（与后端一致）
export function nextMidnightMs(): number;              // 距下一个上海时区 0 点的毫秒数
```

### save.ts（localStorage，key 统一前缀 `bma_`）
```ts
export function loadGame(): GameState | null;
export function saveGame(state: GameState): void;
export function clearSave(): void;
export interface GuestDailyInfo { claimed: boolean; streak: number; amount: number; nextResetMs: number; }
export function guestDailyInfo(state: GameState): GuestDailyInfo;
export function guestClaimDaily(state: GameState): { state: GameState; amount: number } | null;
// 补助公式：amount = min(dailyWelfareCap, dailyWelfareBase + (level-1)*dailyWelfarePerLevel)
// 游客数据存 bma_daily = { date: YYYY-MM-DD, streak }
```
存档要容错：JSON.parse 失败返回 null；版本不符返回 null。

### audio.ts（WebAudio 合成音效，无外部文件）
```ts
export function initAudio(): void;      // 需在用户手势后调用（创建 AudioContext）
export function setMuted(m: boolean): void;
export function isMuted(): boolean;
export function playClick(): void;
export function playBid(): void;        // 加价
export function playCoin(): void;       // 收款
export function playGavel(): void;      // 成交
export function playLose(): void;       // 失败
export function playWin(): void;        // 胜利/升级
export function playIntel(): void;      // 情报
export function playError(): void;
```

### api.ts（客户端 fetch 封装，与后端路由对应）
```ts
export type AuthUser = { id: number; username: string };
export type LeaderboardRow = { rank: number; username: string; peak_net: number; level: number; auctions: number; runs: number; last_run_at: number };
export type LeaderboardData = { list: LeaderboardRow[]; me: { username: string; peak_net: number; level: number; auctions: number; runs: number } | null };
export async function apiMe(): Promise<{ user: AuthUser | null }>;
export async function apiRegister(username: string, password: string): Promise<{ ok: true; user: AuthUser }>;
export async function apiLogin(username: string, password: string): Promise<{ ok: true; user: AuthUser }>;
export async function apiLogout(): Promise<void>;
export async function apiLeaderboard(limit?: number): Promise<LeaderboardData>;
export async function apiSubmitScore(r: { peakNet: number; level: number; auctions: number; bestProfit: number }): Promise<{ ok: true; best: { peak_net: number; level: number; auctions: number; runs: number } }>;
export type DailyClaimResponse = { claimed: boolean; amount: number; streak: number; nextResetMs: number };
export async function apiDailyClaim(): Promise<DailyClaimResponse>;  // GET：查询；返回 claimed=false 且可领
export async function apiDailyClaimPost(): Promise<DailyClaimResponse>; // POST：领取
```
错误处理：非 2xx 时 throw new Error(返回的 error 字段)。

### 后端路由（参考已完成的 auth 路由写法，用 @/lib/db 与 @/lib/auth）
- `src/app/api/leaderboard/route.ts`：GET 返回 `{ list, me }`（me 需登录；用 db.getUserBest）；POST 需登录，body `{ peakNet, level, auctions, bestProfit }` 校验为正数后 `addScore(user.id, ...)` 返回 `{ ok:true, best }`。
- `src/app/api/daily-claim/route.ts`：GET：未登录返回 401；已登录查 `getUserDailyClaim` + `todayShanghai()`：若 last===today 返回 `{ claimed:true, amount:0, streak, nextResetMs:nextMidnightMs() }`，否则 `{ claimed:false, amount: 计算值, streak: last 是昨天? streak+1 : 1, nextResetMs }`（amount 用 user.best_level 代入公式）。POST：未登录 401；今天已领返回 `{ claimed:true, ... }` 且**不再发放**；否则 `setDailyClaim` 并返回 `{ claimed:false→true 语义用 ok 字段}`。**请把响应统一为 `{ ok: boolean; claimed: boolean; amount: number; streak: number; nextResetMs: number }`**（GET ok=true；POST 成功 ok=true）。

## 六、Agent A：`layout.tsx / page.tsx / HomeScreen / AuthModal / LeaderboardScreen / RunEndScreen`

- `layout.tsx`：根布局。`<html lang="zh-CN">`，head 引入 Google Fonts：`Cinzel:wght@600;700;900`、`Noto+Serif+SC:wght@600;700;900`、`Noto+Sans+SC:wght@400;500;700`（用 `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@600;700;900&display=swap">`），`<body>` 包含 `<div className="app-bg" />` 与 `<main>{children}</main>`。metadata.title = "黑市拍卖行"，description 一句话。**不要 import globals.css 以外的 CSS。**
- `page.tsx`：`import GameApp from "@/components/GameApp"; export default function Home(){ return <GameApp/>; }`。
- 各屏幕是**纯展示组件**：props 由 GameApp 传入（见第七节），组件内部不直接调用 engine，只调用 `api.ts` 或 `save.ts` 中允许的辅助函数（如 `guestDailyInfo`）。HomeScreen 的“继续经营/新游戏/排行榜/登录/退出/结束本轮”按钮通过 `onXxx` 回调交给 GameApp。画面要精美：用设计系统类，首页 logo 用 `.hero .logo`，加一点装饰性文案。
- AuthModal：登录/注册双 tab，调 `apiLogin/apiRegister`，成功后回调 `onAuthed(user)`；显示错误用 `.error-text`。
- LeaderboardScreen：`apiLeaderboard()` 拉数据，`.lb-table` 渲染，我这一行加 `me` class；加载中/错误处理。
- RunEndScreen：接收 `result: RunResult` 与 `user`，展示 `.stat` 网格；**若已登录**：挂载时自动 `apiSubmitScore`（去重：props 给 `submitted` 标记，提交过就不再提交）；显示“已上榜/未登录不能上榜（去登录）”。按钮“再来一局”回调 `onRestart`，“返回主页”`onHome`。

## 七、Agent B：`AuctionScreen / SettlementScreen / HUD / ItemCard`

### AuctionScreen props
```ts
{
  state: GameState;
  onBid: (choice: BidChoice) => void;
  onIntel: (action: IntelAction) => void;
  onDealContinue: () => void;
  onNextRound: () => void;          // 结算→下一场（在 Settlement 用，不是这里）
  onEndRun: () => void;
}
```
渲染：
1. `HUD`（现金/债务/信用/情报点/库存 x/6/场次/等级）。
2. 当前拍品 `.item-card`：名称、`.tag` 标签（setInfo 用 `.tag-violet` 显示 partLabel）、类别、估价区间 `.estimate`、市场行情（该类目 mult + 涨跌）、2~3 条线索 `.clue`。
3. 买家 `.bidder-row`：玩家卡 + 4 位 AI；AI 显示 emoji/姓名/性格/wealthTier；`.active` 高亮 currentBidder；已出局 `.out`；当前价格显示。
4. 竞价面板 `.bid-panel`：四个 `.bid-btn`（小幅+5%/标准+15%/强势+35%/退出），**仅当 `phase==="bidding" && !deal && currentBidder==="player" && playerInAuction` 时可用**；用 `canBidAt(state, round100(price×(1+step)))` 判断资金不足禁用；库存满时显示 `.notice`。
5. 情报按钮：4 个（调查真伪/精确定价/买家情报/线索可信度），`intel>0 && phase==="bidding" && !deal` 可用。
6. 日志 `.log`：`recentLog(state)`，新条目自动滚动到底（useEffect + ref.scrollTop）。
7. AI 自动走棋：`useEffect` 中，当 `phase==="bidding" && !deal && currentBidder!=="player"` 时 `setTimeout(()=>onAiTick(), 650)`，`onAiTick` 由 props 传入（GameApp 里 `setState(s=>engine.aiStep(s))`）。注意清理定时器。
8. 成交揭示：`deal` 存在时渲染 `.overlay > .deal-card`：`wonBy==="player"` → win 样式“成交！”+ 成交价 + 该拍品进入库存；否则 lose 样式“被 X 拍走”+ `reveal` 显示真实价值与真伪（学习）。按钮“继续”调 `onDealContinue`。
9. 顶部小按钮：“结算说明”可选；`onEndRun`（结束本轮）放 HUD 或右上角 `.btn-danger btn-sm`，需二次确认（window.confirm）。

### SettlementScreen props
```ts
{
  state: GameState;
  onAction: (itemId: string, action: ItemAction) => void;
  onSpecial: (itemId: string) => void;   // 接受特殊买家
  onNextRound: () => void;
  onHome: () => void;
}
```
渲染：
1. 本场新闻 `.news-item`（state.news）。
2. 特殊买家：`state.specialBuyer` 存在时 `.notice` 金色横幅：谁、想要什么、倍数；库存中匹配 `wantCategory` 的物品卡上显示“出售给特殊买家 `×mult`”按钮（调 onSpecial）。
3. 库存清单：每件用 `ItemCard`；显示 appraised 与否（未鉴定显示“未鉴定·估价区间”，已鉴定显示真实价值+真伪+品相）、setInfo、pawns。操作按钮：
   - 未鉴定：鉴定（显示费用=估价中位数×5%）、出售（提示未鉴定打折）、抵押、持有
   - 已鉴定：出售、抵押、持有
   - 已抵押：赎回（费用=本金×1.1）、（不可再抵押）
4. 底部“进入下一场拍卖会” `.btn-gold btn-lg btn-block` 调 `onNextRound`；旁边 `.btn-ghost` 回主页 `onHome`（先确认）。
5. 展示：现金/净资产/债务/库存占用；提示下一场入场费 `entryFee(state.level)`。

### HUD props：`{ state: GameState; onEndRun?: () => void }`，用 `.hud` 渲染核心数值，**数值用 `formatMoney`/`formatMoneyCn`**。

### ItemCard props：`{ item: Item; state: GameState; children?: ReactNode }`，`.item-card` 展示拍品信息（名称/类别/标签/估价或真值/品相/套装），操作按钮由 SettlementScreen 作为 children 传入。

## 八、最终集成（主线程负责，勿动）
`GameApp.tsx`：加载存档 → 初始化 auth（apiMe）→ 屏幕路由（home/auction/settlement/runEnd 由 state.phase 决定 + 首页/排行榜/登录浮层）→ 所有 engine 调用 → 每次 state 变化 `saveGame` → 首次点击时 `initAudio()` + 各动作音效 → 每日补助（游客本地、登录用户服务端）→ 结束本轮时 `forceEndRun` + 若登录 `apiSubmitScore`。A/B 写的组件按第七节 props 对接。

## 九、质量标准
- 全部 TypeScript 严格模式可编译（`npm run build` 通过）。
- 画面用设计系统类，禁止内联硬编码主题色（# 号颜色只能在 globals.css）。
- 中文文案，符合“黑市拍卖行”氛围。
- 组件无 `any`（除必要的类型断言）。
- 不引入新依赖（next/react/react-dom/typescript 之外）。

## 十、v2 扩展说明

项目已迭代到 v2，核心契约（第一~九节）不变，在此之上新增了以下内容：

- **场型随机化**：新增 `RoundType`（standard / theme / noReserve / speed / gala / night），每场结构不再千篇一律。
- **多身份流派**：新增 `IdentityKind`（dealer 行商 / collector 藏家 / gambler 赌徒 / appraiser 鉴定师）。
- **跨轮档案**：新增 `src/game/profile.ts`，持久化生涯声望、解锁项、套装图鉴与成就。
- **每日挑战**：新增 `src/game/daily.ts`，每天一组主题目标，完成后发放奖励。
- **传奇拍品**：拍品新增 `rarity: "legendary"`（真品、高价值、金色描边）。
- **结算盈亏明细**：`SettlementTotals` / `RoundStats` 补齐出售收入、仓储费、利息、鉴定费、委托奖励、现金利息等分项。
- **信息卡三选一**：`InfoCardState` 开启后消耗 1 点情报，从真伪 / 买家 / 行情三选一。
- **现金利息引擎**：留存现金按场计息；债务利息与仓储费可被事件 / 声望修正（`RoundModifiers`）。
- **AI 结怨**：`aiGrudges` 记录买家对玩家的恩怨，影响后续出价。

**兼容性承诺**：`GameState` / `RoundStats` 等类型的新增字段全部向后兼容——`sanitizeState`（save.ts）对旧档缺失的新字段补默认值。核心字段名契约保持不变，新增字段一律以默认值兼容旧档，旧档无需迁移即可继续游玩。
