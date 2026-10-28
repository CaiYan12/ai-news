import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import assert from "node:assert/strict";
const root = resolve(process.env.AI_NEWS_DIST || "dist");
const types = {".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".xml":"application/xml", ".webp":"image/webp"};
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = pathname === "/ai-news/" ? (process.env.AI_NEWS_DIST ? "ai-news/index.html" : "index.html") : (process.env.AI_NEWS_DIST ? pathname.replace(/^\//, "") : pathname.replace(/^\/ai-news\//, ""));
  const file = resolve(root, relative);
  if (!file.startsWith(root + sep)) { res.writeHead(404).end(); return; }
  try { const body = await readFile(file); res.writeHead(200, {"content-type": types[extname(file)] || "application/octet-stream"}).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/ai-news/`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1280,height:900}, reducedMotion:"reduce"});
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.clock.install({time: new Date("2026-09-02T12:00:00Z")});
  await page.addInitScript(() => {
    const add = window.addEventListener;
    window.__hashListeners = 0;
    window.addEventListener = function(type, ...args) {
      if (type === "hashchange") window.__hashListeners++;
      return add.call(this, type, ...args);
    };
    const interval = window.setInterval;
    window.__intervals = 0;
    window.setInterval = function(...args) { window.__intervals++; return interval.apply(this, args); };
  });
  let requests = 0;
  await page.route("https://daily.juya.uk/rss.xml", async route => { requests++; await route.fulfill({status:200, contentType:"application/xml", headers:{"access-control-allow-origin":"*"}, body:await readFile("public/snapshot/juya.xml")}); });
  const response = await page.goto(url); assert.equal(response.status(), 200);
  assert.equal(await page.title(), process.env.AI_NEWS_DIST ? "AI 日报 - WindowsIt's Music Club" : "AI 日报");
  await page.waitForSelector('.juya-feed-item, article[role="button"]');
  assert.equal(requests, 1, "one initial feed fetch");
  assert.equal(await page.evaluate(() => window.__hashListeners), 1, "one hash listener");
  assert.ok(await page.evaluate(() => window.__intervals) <= 1, "at most one refresh timer");
  assert.equal(await page.locator('header a[href="/"]').count(), 1);
  await page.locator('.juya-feed-item, article[role="button"]').first().click();
  await page.waitForURL(/#\/issue\//);
  const detail = page.url();
  assert.equal(new URL(detail).hash, "#/issue/" + encodeURIComponent("https://daily.juya.uk/issues/2026-09-01/"));
  await page.waitForSelector('[data-zoom-content]');
  assert.ok((await page.locator('[data-zoom-content]').innerText()).trim().length > 20);
  await page.screenshot({path:process.env.T1_SCREENSHOT || "tests/journey.png"});
  await page.getByRole("button", {name:"返回", exact:true}).click();
  await page.waitForURL(/#\/$/);
  await page.waitForSelector('.juya-feed-item, article[role="button"]');
  const direct = await browser.newPage();
  await direct.clock.install({time: new Date("2026-09-02T12:00:00Z")});
  await direct.route("https://daily.juya.uk/rss.xml", async route => route.fulfill({status:200,contentType:"application/xml",headers:{"access-control-allow-origin":"*"},body:await readFile("public/snapshot/juya.xml")}));
  await direct.goto(detail); await direct.waitForSelector('[data-zoom-content]');
  assert.ok((await direct.locator('[data-zoom-content]').innerText()).trim().length > 20);
  assert.deepEqual(errors, []);
  const snapshot = await browser.newPage();
  await snapshot.route("https://daily.juya.uk/rss.xml", route => route.fulfill({status:503,body:"unavailable",headers:{"access-control-allow-origin":"*"}}));
  const snapshotRequests = [];
  snapshot.on("request", req => { if (req.url().includes("snapshot/juya.xml")) snapshotRequests.push(new URL(req.url()).pathname); });
  await snapshot.goto(url, {waitUntil:"domcontentloaded"});
  await snapshot.waitForSelector('.juya-feed-item, article[role="button"]');
  assert.deepEqual(snapshotRequests, ["/ai-news/snapshot/juya.xml"]);
  assert.match(await snapshot.locator("header").innerText(), /离线快照/);
  const nojs = await browser.newPage({javaScriptEnabled:false}); await nojs.goto(url);
  assert.match(await nojs.locator("body").innerText(), /JavaScript/);
  if (!process.env.AI_NEWS_DIST) assert.equal(await page.locator('noscript').count(), 0);
  console.log("PASS production list → detail → back → direct link, no-JS takeover, single initialization and snapshot URL");
} finally { await browser.close(); await new Promise(r => server.close(r)); }
