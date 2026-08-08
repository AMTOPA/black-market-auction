// 高手模拟 v2：情报只买真品 + 市场择时 + 特殊买家必卖
import {
  newGame, beginRound, aiStep, playerBid, afterDealContinue, playerIntel,
  settlementAction, acceptSpecialBuyer, nextRound, computeNetAssets, canBidAt,
} from "../src/game/engine";
import type { GameState } from "../src/game/types";

function simulate(): { peak: number; rounds: number; level: number } {
  let s = beginRound(newGame());
  let peak = 0;
  let guard = 0;
  let rounds = 0;
  while (s.phase !== "runEnd" && rounds < 40 && guard < 8000) {
    guard++;
    if (s.phase === "bidding") {
      if (s.deal) { s = afterDealContinue(s); continue; }
      if (s.currentBidder !== "player") { s = aiStep(s); continue; }
      if (!s.playerInAuction) { s = aiStep(s); continue; }
      const item = s.itemsThisRound[s.itemIndex];
      if (s.intel > 0 && s.playerBidRaises === 0) {
        const before = s.biddingLog.length;
        s = playerIntel(s, "authenticity");
        const added = s.biddingLog.slice(before).map(l => l.text).join(" ");
        const genuine = added.includes("多方线索指向真品");
        const fake = added.includes("多条线索指向赝品") || added.includes("有较高概率是高仿");
        if (!genuine || fake) { s = playerBid(s, "exit"); continue; }
        const p = Math.round((s.currentPrice * 1.05) / 100) * 100;
        if (s.currentPrice < item.estimateMedian * 0.8 && canBidAt(s, p)) s = playerBid(s, "small");
        else s = playerBid(s, "exit");
        continue;
      }
      const p = Math.round((s.currentPrice * 1.05) / 100) * 100;
      if (s.currentPrice < item.estimateMedian * 0.7 && canBidAt(s, p)) s = playerBid(s, "small");
      else s = playerBid(s, "exit");
    } else if (s.phase === "settlement") {
      let acted = false;
      // 1) 特殊买家必卖
      if (s.specialBuyer) {
        const match = s.inventory.find((it) => it.category === s.specialBuyer!.wantCategory);
        if (match) { s = acceptSpecialBuyer(s, match.id); acted = true; }
      }
      // 2) 鉴定候选（真品疑云：先鉴定一件现金够的）
      if (!acted) {
        for (const it of s.inventory) {
          if (!it.appraised && !it.pawned && s.cash >= Math.round((it.estimateMedian * 0.05) / 100) * 100) {
            s = settlementAction(s, it.id, "appraise"); acted = true; break;
          }
        }
      }
      // 3) 行情好（>=0.95）就卖已鉴定的；行情差就持有
      if (!acted) {
        const good = s.inventory.find((it) => it.appraised && !it.pawned && (s.market[it.category] ?? 1) >= 0.95);
        if (good) { s = settlementAction(s, good.id, "sell"); acted = true; }
      }
      // 4) 库存快满且无操作时，低价也要卖一件
      if (!acted && s.inventory.length >= 5) {
        const sell = s.inventory.find((it) => !it.pawned);
        if (sell) { s = settlementAction(s, sell.id, "sell"); acted = true; }
      }
      // 5) 抵押一件未鉴定的换现金
      if (!acted) {
        const pawn = s.inventory.find((it) => !it.pawned && !it.appraised);
        if (pawn) { s = settlementAction(s, pawn.id, "pawn"); acted = true; }
      }
      if (!acted) {
        s = nextRound(s);
        if (s.phase === "bidding") rounds++;
      }
      const net = computeNetAssets(s);
      if (net > peak) peak = net;
    }
  }
  return { peak, rounds: s.auctionNumber, level: s.level };
}

let sumPeak = 0;
let reached2 = 0, reached3 = 0;
const peaks: number[] = [];
for (let i = 0; i < 40; i++) {
  const r = simulate();
  sumPeak += r.peak;
  peaks.push(r.peak);
  if (r.level >= 2) reached2++;
  if (r.level >= 3) reached3++;
}
peaks.sort((a, b) => b - a);
console.log(`avg peak = ${Math.round(sumPeak / 40)}, median = ${peaks[20]}, top5 = ${peaks.slice(0, 5).join(",")}`);
console.log(`Lv2+: ${reached2}/40, Lv3+: ${reached3}/40`);
