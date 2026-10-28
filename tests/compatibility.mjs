import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import assert from "node:assert/strict";

// AI_NEWS_OLD_DIST points to the old site's dist (which contains ai-news/).
// Without it, exercise the new build across restarts; no old checkout is required.
const oldRoot = process.env.AI_NEWS_OLD_DIST && resolve(process.env.AI_NEWS_OLD_DIST);
const newRoot = resolve(process.env.AI_NEWS_NEW_DIST || "dist");
let old = Boolean(oldRoot);
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".xml": "application/xml", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const root = old ? oldRoot : newRoot;
  const relative = pathname === "/ai-news/" ? (old ? "ai-news/index.html" : "index.html") : (old ? pathname.replace(/^\//, "") : pathname.replace(/^\/ai-news\//, ""));
  const file = resolve(root, relative || (old ? "ai-news/index.html" : "index.html"));
  if (!file.startsWith(root + sep)) return res.writeHead(404).end();
  try { const body = await readFile(file); res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" }).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/ai-news/`;
const feed = await readFile("public/snapshot/juya.xml");
const guid = "https://daily.juya.uk/issues/2026-09-01/";
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
async function newPage() {
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date("2026-09-02T12:00:00Z"));
  await page.route("https://daily.juya.uk/rss.xml", route => route.fulfill({ status: 200, contentType: "application/xml", headers: { "access-control-allow-origin": "*" }, body: feed }));
  page.on("pageerror", error => { throw error; });
  return page;
}
const list = page => page.locator('.juya-feed-item, article[role="button"]').first();
async function ready(page) { await page.goto(url); await list(page).waitFor(); }
async function stored(page) { return page.evaluate(() => JSON.parse(localStorage.getItem("ai-daily:v1"))); }
async function waitSaved(page, check) { await page.waitForFunction(check, null, { timeout: 10000 }); }
async function choose(page, label, value) {
  await page.locator("label").filter({ hasText: label }).getByRole("button").click();
  const menu = page.locator('.menu-pop:not([data-closing="true"])').last();
  await menu.getByRole("button", { name: value, exact: true }).click();
  await menu.waitFor({ state: "hidden" });
}
try {
  for (const cache of [true, false]) {
    old = Boolean(oldRoot);
    await context.clearCookies();
    let page = await newPage();
    await ready(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await list(page).waitFor();
    await list(page).getByTitle("收藏", { exact: true }).click();
    await list(page).getByTitle("稍后阅读", { exact: true }).click();
    await list(page).getByTitle("标记为已读", { exact: true }).click();
    await page.getByTitle("设置", { exact: true }).click();
    await page.getByRole("button", { name: "亮色", exact: true }).click();
    await choose(page, "亮色主题", "Claude Design");
    await choose(page, "亮色侧", "关闭");
    await choose(page, "暗色侧", "关闭");
    await page.getByRole("dialog").getByRole("button", { name: "3 列" }).click();
    await page.getByLabel("历史保留天数（0 = 不限制）").fill("0");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "放大", exact: true }).click();
    await waitSaved(page, () => {
      const s = JSON.parse(localStorage.getItem("ai-daily:v1") || "null");
      return s?.history["https://daily.juya.uk/issues/2026-09-01/"]?.read && s.settings.uiZoom === 1.05;
    });
    let before = await stored(page);
    assert.equal(before.version, 1); assert.ok(before.articles.length);
    assert.deepEqual(Object.keys(before).sort(), ["articles", "history", "lastRefreshedAt", "settings", "version"]);
    assert.deepEqual([before.history[guid].read, before.history[guid].favorite, before.history[guid].readLater], [true, true, true]);
    if (!cache) await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("ai-daily:v1")); s.articles = []; localStorage.setItem("ai-daily:v1", JSON.stringify(s)); });
    await page.close(); old = false;
    page = await newPage(); await ready(page);
    await list(page).getByTitle("取消收藏").waitFor();
    await list(page).getByTitle("移出稍后阅读").waitFor();
    await list(page).getByTitle("标记为未读").waitFor();
    await page.getByTitle("设置", { exact: true }).click();
    assert.match(await page.getByRole("dialog").innerText(), /Claude Design/);
    assert.equal(await page.getByLabel("历史保留天数（0 = 不限制）").inputValue(), "0");
    assert.match(await page.locator("label").filter({ hasText: "亮色侧" }).innerText(), /亮色侧\s+关闭/);
    assert.match(await page.locator("label").filter({ hasText: "暗色侧" }).innerText(), /暗色侧\s+关闭/);
    await page.keyboard.press("Escape");
    assert.match(await page.getByLabel("内容缩放").innerText(), /105%/);
    await list(page).getByTitle("取消收藏").click();
    await list(page).getByTitle("移出稍后阅读").click();
    await list(page).getByTitle("标记为未读").click();
    await waitSaved(page, () => { const h = JSON.parse(localStorage.getItem("ai-daily:v1") || "null")?.history["https://daily.juya.uk/issues/2026-09-01/"]; return h && !h.read && !h.favorite && !h.readLater; });
    const written = await stored(page);
    assert.deepEqual(Object.keys(written).sort(), ["articles", "history", "lastRefreshedAt", "settings", "version"]);
    assert.equal(written.version, 1);
    assert.equal(written.history[guid].guid, guid);
    assert.equal(written.settings.juyaLightStyleId, "off");
    assert.equal(written.settings.juyaDarkStyleId, "off");
    assert.equal(written.settings.layout.gridColumns, 3);
    await page.reload(); await list(page).waitFor();
    await list(page).getByTitle("收藏", { exact: true }).waitFor();
    await page.close(); old = Boolean(oldRoot);
    page = await newPage(); await ready(page);
    await list(page).getByTitle("收藏", { exact: true }).waitFor();
    await list(page).getByTitle("稍后阅读", { exact: true }).waitFor();
    await list(page).getByTitle("标记为已读", { exact: true }).waitFor();
    const after = await stored(page);
    assert.equal(after.version, 1); assert.equal(after.settings.lightThemeId, "claude-design");
    assert.equal(after.settings.layout.gridColumns, 3); assert.equal(after.settings.uiZoom, 1.05);
    await page.getByTitle("设置", { exact: true }).click();
    await page.getByRole("button", { name: /清除本地数据/ }).click();
    assert.ok(await page.getByRole("button", { name: "确认清除并重载" }).isVisible());
    await page.getByRole("button", { name: "取消", exact: true }).click();
    assert.ok((await stored(page)).history[guid]);
    await page.getByRole("button", { name: /清除本地数据/ }).click();
    await page.getByRole("button", { name: "确认清除并重载" }).click();
    await list(page).waitFor();
    await page.getByTitle("设置", { exact: true }).click();
    assert.equal(await page.getByLabel("历史保留天数（0 = 不限制）").inputValue(), "30");
    await page.keyboard.press("Escape");
    await list(page).getByTitle("收藏", { exact: true }).waitFor();
    await page.close();
    console.log(`PASS ${oldRoot ? "old → new → old" : "new restart"}, cache ${cache ? "present" : "absent"}, state and clear confirmation/cancel`);
  }
  for (const version of oldRoot ? ["old", "new"] : ["new"]) {
    old = version === "old";
    let page = await newPage(); await ready(page);
    await waitSaved(page, () => Boolean(localStorage.getItem("ai-daily:v1")));
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("ai-daily:v1"));
      const expired = { ...s.articles[0], guid: "https://example.test/expired", pubDate: "2020-01-01T00:00:00Z", title: "Expired retention fixture" };
      s.settings.historyRetentionDays = 30;
      s.articles.push(expired);
      s.history[expired.guid] = { guid: expired.guid, read: true, favorite: true, readLater: true, readAt: "2020-01-01T00:00:00Z" };
      localStorage.setItem("ai-daily:v1", JSON.stringify(s));
    });
    await page.reload(); await list(page).waitFor();
    await waitSaved(page, () => { const s = JSON.parse(localStorage.getItem("ai-daily:v1") || "null"); return s && !s.articles.some(a => a.guid === "https://example.test/expired") && !s.history["https://example.test/expired"]; });
    assert.equal(await page.getByText("Expired retention fixture").count(), 0);
    await page.close();
    page = await newPage();
    await page.addInitScript(() => {
      Storage.prototype.getItem = function () { throw new DOMException("blocked", "SecurityError"); };
      Storage.prototype.setItem = function () { throw new DOMException("blocked", "SecurityError"); };
    });
    await ready(page);
    await list(page).getByTitle("收藏", { exact: true }).click();
    await list(page).getByTitle("取消收藏", { exact: true }).waitFor();
    await page.close();
    console.log(`PASS ${version}: expiry pruning and storage unavailable in-memory interaction`);
  }
} finally { await browser.close(); await new Promise(r => server.close(r)); }
