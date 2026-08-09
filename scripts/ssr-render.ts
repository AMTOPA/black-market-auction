// SSR 渲染冒烟：用真实引擎状态渲染所有 UI 组件，抓渲染期崩溃
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import {
  newGame, beginRound, aiStep, playerBid, afterDealContinue,
  playerIntel, settlementAction, nextRound, buildRunResult,
} from "../src/game/engine";
import type { GameState } from "../src/game/types";

let failures = 0;
function check(name: string, fn: () => string) {
  try {
    const html = fn();
    if (html.length < 50) { failures++; console.error("FAIL:", name, "html too short"); }
    else console.log("ok:", name, `(${html.length} chars)`);
  } catch (e) {
    failures++;
    console.error("FAIL:", name, (e as Error).message);
  }
}

// 构造一个“拍卖中”状态（走几步 AI）
let s = beginRound(newGame());
for (let i = 0; i < 6; i++) {
  if (s.phase === "bidding" && !s.deal && s.currentBidder !== "player") s = aiStep(s);
  else break;
}
const biddingState = s;
check("HomeScreen(game)", () => renderToStaticMarkup(h(require("../src/components/HomeScreen").default, {
  game: biddingState, user: null, guestDaily: { claimed: false, streak: 1, amount: 3000, nextResetMs: 5000 },
  serverClaim: null, onStartNew: () => {}, onContinue: () => {}, onLeaderboard: () => {}, onOpenAuth: () => {},
  onLogout: () => {}, onClaimDaily: () => {}, onToggleMute: () => {}, muted: false,
})));
check("HomeScreen(no game)", () => renderToStaticMarkup(h(require("../src/components/HomeScreen").default, {
  game: null, user: null, guestDaily: null, serverClaim: null, onStartNew: () => {}, onContinue: () => {},
  onLeaderboard: () => {}, onOpenAuth: () => {}, onLogout: () => {}, onClaimDaily: () => {}, onToggleMute: () => {}, muted: false,
})));
check("AuctionScreen", () => renderToStaticMarkup(h(require("../src/components/AuctionScreen").default, {
  state: biddingState, onBid: () => {}, onIntel: () => {}, onDealContinue: () => {}, onAiTick: () => {}, onEndRun: () => {},
})));
check("HUD", () => renderToStaticMarkup(h(require("../src/components/HUD").default, { state: biddingState })));

// 构造结算状态：推进到 settlement
let s2 = biddingState;
let guard = 0;
while (s2.phase !== "settlement" && guard < 1000) {
  guard++;
  if (s2.deal) { s2 = afterDealContinue(s2); continue; }
  if (s2.phase !== "bidding") break;
  if (s2.currentBidder !== "player") { s2 = aiStep(s2); continue; }
  if (!s2.playerInAuction) {
    s2 = { ...s2, activeBidders: s2.activeBidders.filter((x) => x !== "player"), currentBidder: s2.activeBidders[0] ?? null };
    continue;
  }
  s2 = playerBid(s2, "exit");
}
if (s2.phase !== "settlement") {
  s2 = { ...s2, phase: "settlement", specialBuyer: null, currentBidder: null };
}
check("SettlementScreen", () => renderToStaticMarkup(h(require("../src/components/SettlementScreen").default, {
  state: s2, onAction: () => {}, onSpecial: () => {}, onNextRound: () => {}, onHome: () => {},
})));
check("RunEndScreen", () => renderToStaticMarkup(h(require("../src/components/RunEndScreen").default, {
  result: buildRunResult(forceEndState(s2)), user: { id: 1, username: "测试" }, submitted: true,
  onSubmitted: () => {}, onRestart: () => {}, onHome: () => {}, onLogin: () => {},
})));
check("AuthModal", () => renderToStaticMarkup(h(require("../src/components/AuthModal").default, { onClose: () => {}, onAuthed: () => {} })));
check("LeaderboardScreen", () => renderToStaticMarkup(h(require("../src/components/LeaderboardScreen").default, { user: null, onBack: () => {} })));

function forceEndState(g: GameState) {
  return { ...g, phase: "runEnd" as const, endReason: "测试结束" };
}

console.log(failures === 0 ? "SSR ALL PASS" : failures + " SSR FAILURES");
process.exit(failures === 0 ? 0 : 1);
