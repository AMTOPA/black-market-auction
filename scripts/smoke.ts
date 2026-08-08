// 黑市拍卖行 · 引擎冒烟测试 v3
import {
  newGame,
  beginRound,
  aiStep,
  playerBid,
  afterDealContinue,
  playerIntel,
  settlementAction,
  nextRound,
  forceEndRun,
  buildRunResult,
  computeNetAssets,
  availableCredit,
  canBidAt,
  entryFee,
  computeLevel,
  judgeCommission,
} from "../src/game/engine";
import type { GameState } from "../src/game/types";

let failures = 0;
let checks = 0;
function assert(cond: boolean, msg: string) {
  checks++;
  if (!cond) { failures++; console.error("FAIL:", msg); }
}
function assertSane(s: GameState, label: string) {
  for (const v of [s.cash, s.debt, s.intel, s.currentPrice, s.peakNet, s.bestProfit]) assert(Number.isFinite(v), `${label}: finite ${v}`);
  for (const it of s.inventory) {
    assert(Number.isFinite(it.trueValue) && it.trueValue > 0, `${label}: trueValue>0`);
    assert(it.estimateHigh >= it.estimateLow, `${label}: estimate sane`);
  }
  assert(s.cash >= 0, `${label}: cash>=0 (${s.cash})`);
  assert(s.debt >= 0, `${label}: debt>=0 (${s.debt})`);
}

const g0 = newGame();
assert(g0.cash === 30000 && computeLevel(70000) === 2 && computeLevel(400000) === 4 && entryFee(1) === 500, "基础数值");
assert(availableCredit(g0) > 0, "credit > 0");

let totalRounds = 0;
let naturalEnds = 0;
for (let run = 0; run < 12; run++) {
  let s = beginRound(newGame());
  let guard = 0;
  let won = 0;
  let roundsPlayed = 0;
  assert(s.itemsThisRound.length === 8 && s.bidders.length === 4, `run${run}: 8 items / 4 bidders`);

  while (s.phase !== "runEnd" && roundsPlayed < 30 && guard < 3000) {
    guard++;
    if (guard === 2999) { console.error("GUARD HIT:", JSON.stringify({ phase: s.phase, itemIndex: s.itemIndex, items: s.itemsThisRound.length, active: s.activeBidders.length, bidder: s.currentBidder, deal: !!s.deal, price: s.currentPrice, inAuction: s.playerInAuction, cash: s.cash, debt: s.debt })); break; }

    if (s.phase === "bidding") {
      if (s.deal) {
        if (s.deal.wonBy === "player") won++;
        s = afterDealContinue(s);
        continue;
      }
      if (s.currentBidder !== "player") { s = aiStep(s); continue; }
      if (!s.playerInAuction) {
        // 库存满或已出局时，轮到 player 不可能发生；防御：强制推进
        s = { ...s, activeBidders: s.activeBidders.filter((x) => x !== "player"), currentBidder: s.activeBidders[0] ?? null };
        if (s.currentBidder !== "player" && s.currentBidder !== null) s = aiStep(s);
        continue;
      }
      if (s.intel > 0 && s.playerBidRaises === 0) {
        s = playerIntel(s, Math.random() < 0.5 ? "authenticity" : "estimate");
      }
      const item = s.itemsThisRound[s.itemIndex];
      const smallPrice = Math.round((s.currentPrice * 1.05) / 100) * 100;
      const strongPrice = Math.round((s.currentPrice * 1.35) / 100) * 100;
      if (s.currentPrice < item.estimateMedian * 0.9 && canBidAt(s, smallPrice)) s = playerBid(s, "small");
      else if (s.playerBidRaises < 1 && s.currentPrice < item.estimateMedian * 1.25 && canBidAt(s, strongPrice)) s = playerBid(s, "strong");
      else s = playerBid(s, "exit");
      assertSane(s, `run${run} bid`);
    } else if (s.phase === "settlement") {
      let acted = false;
      for (const it of s.inventory) {
        if (!acted && !it.appraised && s.cash >= Math.round((it.estimateMedian * 0.05) / 100) * 100) {
          s = settlementAction(s, it.id, "appraise"); acted = true; break;
        }
      }
      if (!acted) {
        const pawnable = s.inventory.find((it) => !it.pawned && !it.appraised);
        if (pawnable) { s = settlementAction(s, pawnable.id, "pawn"); acted = true; }
      }
      if (!acted) {
        const sellable = s.inventory.find((it) => !it.pawned);
        if (sellable) { s = settlementAction(s, sellable.id, "sell"); acted = true; }
      }
      if (!acted) s = nextRound(s);
      assertSane(s, `run${run} settlement`);
      if (s.phase === "bidding") roundsPlayed++;
    }
  }
  totalRounds += s.auctionNumber;
  if (s.phase === "runEnd") naturalEnds++;
  console.log(`run${String(run).padStart(2)} -> ${s.phase.padEnd(9)} rounds=${String(s.auctionNumber).padStart(2)} Lv${s.level} cash=${s.cash} debt=${s.debt} peak=${s.peakNet} won=${won} ${s.endReason ?? ""}`);
  assert(s.cash >= 0 && s.debt >= 0, `run${run}: final money sane`);
  const result = buildRunResult(forceEndRun(s, "测试"));
  assert(result.peakNet >= 0 && result.level >= 1, `run${run}: result sane`);
}

// ---- 多元化扩展：模式 / 随机事件 / 委托 / 声望 ----
{
  const g0 = newGame({ mode: "sprint" });
  assert(g0.mode === "sprint" && g0.modeRound === 0 && g0.reputation === 0, "sprint newGame fields");
  assert(newGame().mode === "endless", "default mode endless");

  let s = beginRound(g0);
  assert(s.mode === "sprint", "sprint mode preserved");
  assert(s.modeRound === 1, "sprint beginRound modeRound=1");
  assert(s.openingEvent !== null && typeof s.openingEvent.id === "string" && s.openingEvent.title.length > 0, "openingEvent rolled");
  assert(s.roundStats !== undefined && s.roundStats.wonCount === 0, "roundStats initialized");
  assert(typeof judgeCommission(s) === "boolean", "judgeCommission returns boolean");

  let sprintGuard = 0;
  while (s.phase !== "runEnd" && sprintGuard < 5000) {
    sprintGuard++;
    if (s.phase === "bidding") {
      if (s.deal) { s = afterDealContinue(s); continue; }
      if (s.currentBidder !== "player") { s = aiStep(s); continue; }
      if (!s.playerInAuction) {
        s = { ...s, activeBidders: s.activeBidders.filter((x) => x !== "player"), currentBidder: s.activeBidders[0] ?? null };
        continue;
      }
      const item = s.itemsThisRound[s.itemIndex];
      const smallPrice = Math.round((s.currentPrice * 1.05) / 100) * 100;
      if (s.currentPrice < item.estimateMedian * 0.9 && canBidAt(s, smallPrice)) s = playerBid(s, "small");
      else s = playerBid(s, "exit");
    } else if (s.phase === "settlement") {
      let acted = false;
      for (const it of s.inventory) {
        if (!acted && !it.appraised && s.cash >= Math.round((it.estimateMedian * 0.05) / 100) * 100) {
          s = settlementAction(s, it.id, "appraise"); acted = true; break;
        }
      }
      if (!acted) {
        const sellable = s.inventory.find((it) => !it.pawned);
        if (sellable) { s = settlementAction(s, sellable.id, "sell"); acted = true; }
      }
      if (!acted) s = nextRound(s);
      assertSane(s, "sprint settlement");
    }
  }
  assert(s.phase === "runEnd", `sprint should end, got ${s.phase} (rounds=${s.auctionNumber}, modeRound=${s.modeRound})`);
  assert(s.mode === "sprint" && (s.modeRound ?? 0) <= 8, `sprint modeRound <= 8 (${s.modeRound})`);
  const sprintResult = buildRunResult(forceEndRun(s, "测试"));
  assert(sprintResult.mode === "sprint", "sprint result mode");
  assert(Number.isFinite(sprintResult.score) && sprintResult.score >= 0, "sprint result score finite");
  console.log(`sprint -> ${s.endReason ?? ""} rounds=${s.auctionNumber} modeRound=${s.modeRound} score=${Math.round(sprintResult.score)}`);
}

console.log(`\n${checks} checks, ${failures} failures, ${totalRounds} rounds, ${naturalEnds} natural run-ends`);
console.log(failures === 0 ? "ALL PASS" : "HAS FAILURES");
process.exit(failures === 0 ? 0 : 1);
