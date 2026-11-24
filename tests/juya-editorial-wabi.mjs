import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import assert from "node:assert/strict";

const root = resolve("dist");
const output = resolve(process.env.AI_NEWS_EVIDENCE || "test-results/juya-editorial-wabi");
await mkdir(output, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".xml": "application/xml", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = pathname === "/ai-news/" ? "index.html" : pathname.replace(/^\/ai-news\//, "");
  const file = resolve(root, relative || "index.html");
  if (!file.startsWith(root + sep)) return res.writeHead(404).end();
  try { res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
const chromiumBlockedPorts = new Set([6665, 6666, 6667, 6668, 6669, 6697, 10080]);
let serverPort;
do {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  serverPort = server.address().port;
  if (chromiumBlockedPorts.has(serverPort)) await new Promise(r => server.close(r));
} while (chromiumBlockedPorts.has(serverPort));
const url = `http://127.0.0.1:${serverPort}/ai-news/`;
const xmlEscape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const html = `<h1>橘鸦AI早报 2026-09-01</h1><h2>概览</h2><ul><li><a href="https://example.com/story">来源标题 ↗</a></li></ul><h2>要闻</h2><h3><a href="https://example.com/story">图文次序验证</a> <code>#1</code></h3><blockquote>开篇导语</blockquote><p><img src="https://assets.juya.uk/one.webp" alt="第一张图"></p><p>第一段</p><p><img src="https://assets.juya.uk/two.webp" alt="第二张图"></p><p>第二段</p><p>相关链接：</p><ul><li><a href="https://example.com/ref">原文</a></li></ul>`;
const malformed = `<h1>无法解析的条目</h1><p>通用阅读回退内容</p>`;
const feed = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>橘鸦AI早报</title><item><title>2026-09-01</title><link>https://daily.juya.uk/issues/2026-09-01/</link><guid>valid</guid><pubDate>Tue, 01 Sep 2026 01:36:00 GMT</pubDate><description>次序测试期号</description><content:encoded>${xmlEscape(html)}</content:encoded></item><item><title>2026-08-31</title><link>https://daily.juya.uk/issues/2026-08-31/</link><guid>fallback</guid><pubDate>Mon, 31 Aug 2026 01:36:00 GMT</pubDate><description>普通阅读回退</description><content:encoded>${xmlEscape(malformed)}</content:encoded></item></channel></rss>`;
const image = await readFile("public/avatar.webp");
const browser = await chromium.launch();
try {
  for (const style of ["editorial", "wabi"]) {
    for (const scheme of ["light", "dark"]) {
      for (const width of [1280, 390]) {
        const variant = `${style}-${scheme}`;
        const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion: "reduce" });
        const page = await context.newPage();
        page.on("pageerror", error => { throw error; });
        await page.clock.setFixedTime(new Date("2026-09-02T12:00:00Z"));
        await page.addInitScript(({ style }) => localStorage.setItem("ai-daily:v1", JSON.stringify({ version: 1, settings: { themeMode: "system", juyaLightStyleId: style, juyaDarkStyleId: style, historyRetentionDays: 0 }, articles: [], history: {}, lastRefreshedAt: null })), { style });
        await page.route("https://daily.juya.uk/rss.xml", route => route.fulfill({ status: 200, contentType: "application/xml", headers: { "access-control-allow-origin": "*" }, body: feed }));
        await page.route("https://assets.juya.uk/**", route => route.fulfill({ status: 200, contentType: "image/webp", body: image }));
        await page.goto(url);
        const cards = page.locator(".juya-feed-item, article[role=button]");
        await cards.first().waitFor();
        assert.equal(await page.locator("[data-juya-variant]").first().getAttribute("data-juya-variant"), variant, `${variant} is selected from persisted preferences`);
        await page.getByTitle("设置", { exact: true }).click();
        const side = scheme === "light" ? "亮色侧" : "暗色侧";
        const styleName = style === "editorial" ? "杂志编辑式" : "侘寂日杂式";
        await page.locator("label").filter({ hasText: side }).getByRole("button").click();
        const menu = page.locator('.menu-pop:not([data-closing="true"])').last();
        assert.ok(await menu.getByRole("button", { name: styleName, exact: true }).count(), `${style} can be selected on the ${scheme} side`);
        await menu.getByRole("button", { name: "关闭", exact: true }).click();
        const preferenceField = scheme === "light" ? "juyaLightStyleId" : "juyaDarkStyleId";
        await page.waitForFunction(({ preferenceField }) => JSON.parse(localStorage.getItem("ai-daily:v1") || "null")?.settings?.[preferenceField] === "off", { preferenceField });
        await page.locator("label").filter({ hasText: side }).getByRole("button").click();
        await page.locator('.menu-pop:not([data-closing="true"])').last().getByRole("button", { name: styleName, exact: true }).click();
        await page.waitForFunction(({ preferenceField, style }) => JSON.parse(localStorage.getItem("ai-daily:v1") || "null")?.settings?.[preferenceField] === style, { preferenceField, style });
        await page.waitForFunction(expected => document.querySelector(`[data-juya-variant="${expected}"]`), variant);
        await page.getByRole("dialog", { name: "设置" }).getByRole("button").first().click();
        await page.keyboard.press("Escape");
        assert.equal(await cards.first().locator(".juya-feed-title").innerText(), "2026-09-01");
        assert.equal(await page.locator(".juya-feed-item").count(), 2, "both issue cards remain available through the web feed shell");
        const favorite = page.locator(".juya-feed-item").first().getByTitle("收藏", { exact: true });
        await favorite.click();
        assert.equal(await page.locator(".juya-feed-item").first().getByTitle("取消收藏", { exact: true }).getAttribute("aria-pressed"), "true", "card actions update history without opening the issue");
        assert.doesNotMatch(page.url(), /#\/issue\//, "card actions do not trigger the enclosing issue action");
        await page.locator(".juya-feed-item").first().getByTitle("取消收藏", { exact: true }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${variant} feed has no horizontal overflow at ${width}px`);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: resolve(output, `${variant}-${width}-feed.png`), fullPage: true, animations: "disabled" });
        await cards.first().click();
        await page.waitForURL(/#\/issue\//);
        const issue = page.locator("[data-zoom-content] [data-juya-variant]");
        await issue.waitFor();
        assert.equal(await issue.getAttribute("data-juya-variant"), variant, `${variant} is applied on the reading page`);
        assert.equal(await page.locator(".juya-overview a").getAttribute("target"), "_blank", "overview links use the web-safe new-tab contract");
        assert.equal(await page.locator(".juya-entry h3 a").getAttribute("target"), "_blank", "entry links use the web-safe new-tab contract");
        const content = await page.locator(".juya-entry").first().locator("p:not(.juya-links-label), figure").evaluateAll(nodes => nodes.map(node => node.matches("figure") ? node.querySelector("img")?.alt : node.textContent?.trim()));
        assert.deepEqual(content, ["第一张图", "第一段", "第二张图", "第二段"], `${variant} keeps the opening image and recognized text/image sequence readable`);
        assert.ok(await page.locator(".juya-date-line, .wabi-reading-craft-date").count(), `${variant} shows a publication date in the reading masthead`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${variant} reader has no horizontal overflow at ${width}px`);
        await page.screenshot({ path: resolve(output, `${variant}-${width}-reader.png`), fullPage: true, animations: "disabled" });
        await page.reload();
        assert.equal(await page.locator("[data-zoom-content] [data-juya-variant]").getAttribute("data-juya-variant"), variant, "direct reading-route re-entry retains the persisted side preference");
        await page.getByRole("button", { name: "返回", exact: true }).click();
        await page.locator(".juya-feed-item").nth(1).click();
        await page.waitForURL(/#\/issue\//);
        assert.ok(await page.locator(".article-content").getByText("通用阅读回退内容").count(), "unrecognized issue content falls back to the generic reader");
        await context.close();
      }
    }
  }
  console.log(`PASS editorial/wabi × light/dark × feed/reader at 1280/390; persisted preferences, selector availability, ordered blocks, links and fallback; evidence: ${output}`);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
