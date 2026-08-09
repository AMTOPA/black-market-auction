// 增强版 SSR 检查：渲染真实状态，抓 React 重复 key 警告 + 断言新布局类存在
import { renderToStaticMarkup } from "react-dom/server";
import { createElement as h } from "react";
import { newGame, beginRound, aiStep, playerBid, afterDealContinue, nextRound, buildRunResult } from "../src/game/engine";
import type { GameState } from "../src/game/types";

const warnings: string[] = [];
const origError = console.error;
console.error = (...args: unknown[]) => {
  const msg = args.map(String).join(" ");
  if (/same key|unique/i.test(msg)) warnings.push(msg.slice(0, 200));
  origError(...args);
};

let failures = 0;
function check(name: string, fn: () => string, requiredClasses: string[] = []) {
  try {
    const html = fn();
    if (html.length < 50) { failures++; console.error("FAIL:", name, "html too short"); }
    for (const cls of requiredClasses) {
      if (!html.includes(cls)) { failures++; console.error("FAIL:", name, "missing class", cls); }
    }
    console.log("ok:", name, `(${html.length} chars)`);
  } catch (e) {
    failures++;
    console.error("FAIL:", name, (e as Error).message);
  }
}

// 拍卖中状态：推进若干 AI 步，制造多条日志与多个买家
let s = beginRound(newGame());
for (let i = 0; i < 30 && s.phase === "bidding" && !s.deal; i++) {
  if (s.currentBidder !== "player") { s = aiStep(s); continue; }
  s = playerBid(s, "small");
}
const bidding = {
  ...s,
  openingEvent: { id: "op-test", kind: "opening" as const, title: "神秘注资", text: "一位出资人汇入周转金。", outcome: "现金 +6,000" },
  commission: { id: "c-test", kind: "win_any" as const, title: "暗线委托：一件入袋", desc: "本场至少拍下一件藏品", reward: 2000, rep: 3 },
};
check("AuctionScreen", () => renderToStaticMarkup(h(require("../src/components/AuctionScreen").default, {
  state: bidding, onBid: () => {}, onIntel: () => {}, onDealContinue: () => {}, onAiTick: () => {}, onEndRun: () => {},
})), ["spotlight-card", "item-icon lg", "bid-btn-lg standard", "bidder-row", "intel-btn", "clue-item", "event-banner", "commission-card", "round-type-badge"]);
check("HUD", () => renderToStaticMarkup(h(require("../src/components/HUD").default, { state: bidding })), ["hud-stat", "hud-sep", "hud-ico", "rep-chip", "mode-badge", "identity-chip"]);

// 结算状态
let s2 = bidding;
let guard = 0;
while (s2.phase !== "settlement" && guard < 2000) {
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
if (s2.phase !== "settlement") s2 = { ...s2, phase: "settlement", currentBidder: null };
s2 = { ...s2, totals: { roundProfit: 1200, soldCount: 1, soldRevenue: 3000, storageFees: 200, interestPaid: 100, appraisalCosts: 0, pawnProceeds: 0, specialSales: 0, commissionReward: 0, interestEarned: 0 } };
const s2b = {
  ...s2,
  settlementEvent: { id: "st-test", kind: "settlement" as const, title: "匿名委托", text: "藏家送来佣金。", outcome: "现金 +5,000" },
  commission: { id: "c-test2", kind: "win_any" as const, title: "暗线委托：一件入袋", desc: "本场至少拍下一件藏品", reward: 2000, rep: 3 },
};
check("SettlementScreen", () => renderToStaticMarkup(h(require("../src/components/SettlementScreen").default, {
  state: s2b, onAction: () => {}, onSpecial: () => {}, onNextRound: () => {}, onHome: () => {},
})), ["stage-main", "stage-side", "item-card", "market-grid", "news-item", "event-banner", "commission-card", "breakdown-card"]);

// 结算后进入下一场（验证跨场不炸）
let s3 = nextRound(s2);
check("Settlement->NextRound bidding", () => renderToStaticMarkup(h(require("../src/components/AuctionScreen").default, {
  state: s3, onBid: () => {}, onIntel: () => {}, onDealContinue: () => {}, onAiTick: () => {}, onEndRun: () => {},
})), ["spotlight-card"]);

// 终局
const ended = { ...s3, phase: "runEnd" as const, endReason: "测试结束" };
check("RunEndScreen", () => renderToStaticMarkup(h(require("../src/components/RunEndScreen").default, {
  result: buildRunResult(ended), user: { id: 1, username: "测试" }, submitted: true,
  onSubmitted: () => {}, onRestart: () => {}, onHome: () => {}, onLogin: () => {},
})), ["section-title"]);

// 居中确认弹窗渲染
check("ConfirmDialog", () => renderToStaticMarkup(h(require("../src/components/ConfirmDialog").ConfirmDialog, {
  options: { title: "就此落槌", message: "确定结束本轮并清算成绩吗？", confirmText: "结束并清算", tone: "danger" },
  onConfirm: () => {}, onCancel: () => {},
})), ["confirm-modal", "confirm-title", "confirm-message", "confirm-actions"]);

// ItemIcon 全类别渲染
check("ItemIcon all categories", () => {
  const { ItemIcon, EmblemMark, RankMedal, CoinIcon } = require("../src/components/ItemIcon");
  const cats: string[] = ["绘画", "珠宝", "古币", "武器", "酒", "手稿", "雕塑", "奇物"];
  return cats.map((c) => renderToStaticMarkup(h(ItemIcon, { category: c, size: "lg" }))).join("") +
    renderToStaticMarkup(h(EmblemMark, {})) + renderToStaticMarkup(h(RankMedal, { rank: 1 })) +
    renderToStaticMarkup(h(RankMedal, { rank: 2 })) + renderToStaticMarkup(h(RankMedal, { rank: 3 })) +
    renderToStaticMarkup(h(RankMedal, { rank: 5 })) + renderToStaticMarkup(h(CoinIcon, {}));
}, ["item-icon lg", "rank-badge r1", "rank-badge"]);

console.error = origError;
console.log("React duplicate-key warnings:", warnings.length);
warnings.forEach((w) => console.log("  WARN:", w));
console.log(failures === 0 && warnings.length === 0 ? "SSR-VISUAL ALL PASS" : "SSR-VISUAL FAILURES: " + failures + " warnings: " + warnings.length);
process.exit(failures === 0 && warnings.length === 0 ? 0 : 1);
