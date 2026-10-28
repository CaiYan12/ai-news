import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import assert from "node:assert/strict";

// Run against the actual production build, with only the RSS boundary controlled.
const root = resolve("dist");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".xml": "application/xml", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = resolve(root, path === "/ai-news/" ? "index.html" : path.replace(/^\/ai-news\//, ""));
  if (!file.startsWith(root + sep)) return res.writeHead(404).end();
  try { const body = await readFile(file); res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" }).end(body); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/ai-news/`;
const live = "https://daily.juya.uk/rss.xml";
const snapshot = await readFile("public/snapshot/juya.xml");
const browser = await chromium.launch();
const records = [];
async function scenario(name, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const raw = { name, console: [], pageerror: [], requestfailed: [], requests: [] };
  records.push(raw);
  page.on("console", m => { if (m.type() === "error") raw.console.push(m.text()); });
  page.on("pageerror", e => raw.pageerror.push(e.message));
  page.on("requestfailed", r => raw.requestfailed.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on("request", r => raw.requests.push(r.url()));
  await page.clock.install({ time: new Date("2026-09-02T12:00:00Z") });
  // Keep remote snapshot images deterministic without blocking the feed or its fallback.
  await page.route("https://assets.juya.uk/**", r => r.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64") }));
  try { await run(page, raw); assert.deepEqual(raw.pageerror, []); assert.deepEqual(raw.requestfailed, []); }
  finally { await context.close(); }
}
const items = page => page.locator('.juya-feed-item, article[role="button"]');
const response = body => ({ status: 200, contentType: "application/xml", headers: { "access-control-allow-origin": "*" }, body });
async function choose(page, label, option) {
  await page.locator("label").filter({ hasText: label }).getByRole("button").click();
  const menu = page.locator('.menu-pop:not([data-closing="true"])').last();
  await menu.getByRole("button", { name: option, exact: true }).click();
  await menu.waitFor({ state: "hidden" });
}
try {
  await scenario("live manual refresh, cache and timer", async (page, raw) => {
    let count = 0;
    await page.route(live, r => { count++; return r.fulfill(response(snapshot)); });
    await page.goto(url); await items(page).first().waitFor();
    await page.getByTitle("刷新", { exact: true }).waitFor({ state: "visible" });
    await page.waitForFunction(() => !document.querySelector('button[title="刷新"]').disabled);
    assert.equal(count, 1);
    assert.equal(await page.locator(`header span[title="${live}"]`).count(), 1);
    await page.getByTitle("刷新", { exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('button[title="刷新"]').disabled);
    assert.equal(count, 2);
    await page.clock.fastForward(400);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ai-daily:v1")));
    assert.equal(state.articles[0].sourceId, "juya-daily");
    await page.getByTitle("设置", { exact: true }).click();
    await choose(page, "定时刷新间隔", "关闭");
    await page.clock.fastForward(31 * 60 * 1000); assert.equal(count, 2);
    await choose(page, "定时刷新间隔", "15 分钟");
    await page.clock.fastForward(15 * 60 * 1000);
    await page.waitForFunction(() => !document.querySelector('button[title="刷新"]').disabled);
    assert.equal(count, 3);
    await page.clock.fastForward(400);
    let release;
    await page.unroute(live);
    await page.route(live, async r => { count++; await new Promise(resolve => { release = resolve; }); await r.fulfill(response(snapshot)); });
    const reload = page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector('button[title="刷新"]').disabled);
    await items(page).first().waitFor();
    assert.equal(count, 4); release(); await reload;
    await page.waitForFunction(() => !document.querySelector('button[title="刷新"]').disabled);
    assert.deepEqual(raw.console, []);
  });
  await scenario("live failure to snapshot", async (page, raw) => {
    await page.route(live, r => r.fulfill({ status: 503, body: "offline", headers: { "access-control-allow-origin": "*" } }));
    await page.goto(url); await items(page).first().waitFor();
    assert.deepEqual(raw.requests.filter(x => x.includes("snapshot/juya.xml")).map(x => new URL(x).pathname), ["/ai-news/snapshot/juya.xml"]);
    assert.match(await page.locator("header").innerText(), /离线快照/);
    await items(page).first().click(); await page.locator("[data-zoom-content]").waitFor();
    assert.ok((await page.locator("[data-zoom-content]").innerText()).trim().length > 20);
    assert.deepEqual(raw.console, ["Failed to load resource: the server responded with a status of 503 (Service Unavailable)", "[feed] 实时抓取失败： HTTP 503"]);
  });
  await scenario("both fail", async (page, raw) => {
    await page.route(live, r => r.fulfill({ status: 503, body: "offline", headers: { "access-control-allow-origin": "*" } }));
    await page.route("**/ai-news/snapshot/juya.xml", r => r.fulfill({ status: 404, body: "missing" }));
    await page.goto(url);
    await page.getByText("抓取失败，请检查网络后重试").waitFor();
    await page.waitForFunction(() => !document.querySelector('button[title="刷新"]').disabled);
    assert.equal(await items(page).count(), 0);
    assert.match(await page.locator("header").innerText(), /抓取失败/);
    assert.deepEqual(raw.console, ["Failed to load resource: the server responded with a status of 503 (Service Unavailable)", "[feed] 实时抓取失败： HTTP 503", "Failed to load resource: the server responded with a status of 404 (Not Found)"]);
  });
  const malicious = `<?xml version="1.0"?><rss><channel><item><title>Security fixture</title><guid>security-fixture</guid><link>https://example.test/original</link><pubDate>Tue, 01 Sep 2026 00:00:00 GMT</pubDate><description><![CDATA[<p>Safe body</p><script>window.pwned=1</script><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" onerror="window.pwned=2"><iframe src="https://example.test/iframe"></iframe><form><input></form><p style="color:red">Text</p><a href="javascript:alert(1)">bad</a><a href="https://example.test/body">body link</a>]]></description></item></channel></rss>`;
  for (const mode of ["unstructured", "style off"]) await scenario(`generic ${mode}`, async (page, raw) => {
    await page.route(live, r => r.fulfill(response(mode === "unstructured" ? malicious : snapshot)));
    await page.goto(url); await items(page).first().waitFor();
    if (mode === "style off") {
      await page.getByTitle("设置", { exact: true }).click();
      await choose(page, "亮色侧", "关闭"); await page.keyboard.press("Escape");
    }
    await items(page).first().click(); await page.locator(".reader-body .article-content").waitFor();
    if (mode === "unstructured") {
      const body = page.locator(".article-content");
      assert.match(await body.innerText(), /Safe body/);
      assert.equal(await body.locator("script,iframe,form,input,[style],[onerror],[onload],a[href^='javascript:']").count(), 0);
      assert.equal(await page.evaluate(() => window.pwned), undefined);
      await page.evaluate(() => { window.__opened = []; window.open = (...args) => { window.__opened.push(args); return null; }; });
      await body.getByText("body link").click();
      await page.getByTitle("在新标签打开原文").click();
      assert.deepEqual(await page.evaluate(() => window.__opened), [["https://example.test/body", "_blank", "noopener,noreferrer"], ["https://example.test/original", "_blank", "noopener,noreferrer"]]);
    }
    assert.deepEqual(raw.console, []);
  });
  console.log("PASS all feed scenarios");
} finally {
  console.log("RAW_BROWSER_EVENTS " + JSON.stringify(records, null, 2));
  await browser.close(); await new Promise(r => server.close(r));
}
