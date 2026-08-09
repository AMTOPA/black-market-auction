// 浏览器冒烟测试：真实 Chrome + Next.js，验证完整游戏流程无崩溃/无 console error
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.BASE_URL || "http://localhost:3456";
mkdirSync("_shots", { recursive: true });

const errors = [];
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1360, height: 920 } });
page.on("console", (msg) => { if (msg.type() === "error") errors.push("[console] " + msg.text()); });
page.on("pageerror", (err) => errors.push("[pageerror] " + String(err)));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(name) {
  try { await page.screenshot({ path: `_shots/${name}.png` }); console.log("shot:", name); } catch (e) { console.log("shot fail:", name, String(e)); }
}

async function clickButton(label, timeout = 5000) {
  try {
    await page.getByRole("button", { name: new RegExp(label) }).first().click({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function dismissDeal() {
  try {
    const vis = await page.getByRole("button", { name: /继续/ }).first().isVisible().catch(() => false);
    if (vis) { await page.getByRole("button", { name: /继续/ }).first().click(); await sleep(500); return true; }
  } catch {}
  return false;
}

let failed = false;
function check(cond, msg) {
  if (!cond) { failed = true; console.log("FAIL:", msg); }
  else console.log("ok:", msg);
}

// 1) 首页
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
check((await page.content()).includes("黑市拍卖行"), "首页加载");
await shot("01-home");

// 2) 新游戏
let started = false;
for (const label of ["签下第一本账簿", "继续经营", "另开新局"]) {
  if (await clickButton(label, 3000)) { started = true; break; }
}
check(started, "开始新局");
await page.waitForTimeout(1500);

// 3) 拍卖页
const hasAuction = (await page.content()).includes("LOT") || (await page.content()).includes("起拍价") || (await page.content()).includes("当前叫价");
check(hasAuction, "进入拍卖页");
await shot("02-auction");

// 4) 自动玩 2 场（简单策略）
for (let round = 0; round < 2; round++) {
  let settlementSeen = false;
  for (let i = 0; i < 100 && !settlementSeen; i++) {
    const content = await page.content();
    if (content.includes("场后结算") || content.includes("进入下一场") || content.includes("本场盈亏明细")) {
      settlementSeen = true;
      break;
    }
    // 成交揭示 -> 继续
    const deal = await page.getByRole("button", { name: /继续/ }).first().isVisible().catch(() => false);
    if (deal) { await page.getByRole("button", { name: /继续/ }).first().click(); await sleep(600); continue; }
    // 情报点够 -> 第一件拍品用一次
    if (i === 0) {
      const ib = page.getByRole("button", { name: /调查真伪/ }).first().isEnabled().catch(() => false);
      if (ib) { await page.getByRole("button", { name: /调查真伪/ }).first().click().catch(() => {}); await sleep(300); }
    }
    // 快速策略：轮到玩家就立刻退出（AI 之间快速成交），以尽快进入结算
    const exitBtn = await page.getByRole("button", { name: /退出/ }).first().isEnabled().catch(() => false);
    if (exitBtn) { await page.getByRole("button", { name: /退出/ }).first().click(); }
    await sleep(700);
  }
  if (!settlementSeen) console.log("warn: round", round, "did not reach settlement within iterations");
  await page.waitForTimeout(1000);
  if (round === 0) await shot("03-settlement");
  const next = await clickButton("进入下一场", 4000);
  if (!next) console.log("warn: 进入下一场 not found");
  await page.waitForTimeout(1200);
}

// 5) 结束本轮 -> 终局页（直接 DOM 点击，绕开 overlay 拦截）
await page.waitForTimeout(400);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const b = btns.find((x) => x.textContent.includes("结束本轮") && !x.closest(".overlay"));
  if (b) b.click();
});
await page.waitForTimeout(700);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll(".overlay button")];
  const b = btns.find((x) => x.textContent.includes("结束本轮"));
  if (b) b.click();
});
await page.waitForTimeout(1500);
const hasEnd = (await page.content()).includes("本轮落槌") || (await page.content()).includes("最终清算");
check(hasEnd, "终局页");
await shot("04-runend");

// 6) 回主页
await clickButton("返回主页", 3000).catch(() => {});
await page.waitForTimeout(1200);
const hasHome = (await page.content()).includes("今夜账簿") || (await page.content()).includes("每日挑战");
check(hasHome, "回主页");
await shot("05-home-after");

// 7) 排行榜
await clickButton("查看地下富豪榜", 3000).catch(() => {});
await page.waitForTimeout(1200);
const hasLB = (await page.content()).includes("富豪榜") || (await page.content()).includes("榜单");
check(hasLB, "排行榜页");
await shot("06-leaderboard");

// console errors
const realErrors = errors.filter((e) => !/favicon|net::|ERR_/.test(e));
check(realErrors.length === 0, "无 console/page error: " + (realErrors.slice(0, 5).join(" | ") || "(none)"));

await browser.close();
console.log(realErrors.length === 0 && !failed ? "BROWSER SMOKE PASS" : "BROWSER SMOKE FAIL");
process.exit(realErrors.length === 0 && !failed ? 0 : 1);
