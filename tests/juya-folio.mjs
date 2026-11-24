import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import assert from "node:assert/strict";

const root = resolve("dist");
const output = resolve(process.env.AI_NEWS_EVIDENCE || "test-results/juya-folio");
await mkdir(output, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = pathname === "/ai-news/" ? "index.html" : pathname.replace(/^\/ai-news\//, "");
  const file = resolve(root, relative || "index.html");
  if (!file.startsWith(root + sep)) return res.writeHead(404).end();
  try { res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/ai-news/`;
const html = `<h1>橘鸦AI早报 2026-09-01</h1><h2>概览</h2><ul><li><a href="https://example.com/story">来源标题 ↗</a></li></ul><h2>要闻</h2><h3>图文次序验证 <code>#1</code></h3><blockquote>开篇导语</blockquote><p>第一段</p><p><img src="https://assets.juya.uk/one.png" alt="第一张图"></p><p>第二段</p><p><img src="https://assets.juya.uk/two.png" alt="第二张图"></p><p>第三段</p><p>相关链接：</p><ul><li><a href="https://example.com/ref">原文</a></li></ul>`;
const xmlEscape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const feed = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>橘鸦AI早报</title><item><title>2026-09-01</title><link>https://daily.juya.uk/issues/2026-09-01/</link><guid>https://daily.juya.uk/issues/2026-09-01/</guid><pubDate>Tue, 01 Sep 2026 01:36:00 GMT</pubDate><description>次序测试期号</description><content:encoded>${xmlEscape(html)}</content:encoded></item></channel></rss>`;
const image = await readFile("public/avatar.webp");
const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    for (const scheme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport, colorScheme: scheme, reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.addInitScript(() => localStorage.setItem("ai-daily:v1", JSON.stringify({ version: 1, settings: { themeMode: "system", juyaLightStyleId: "card", juyaDarkStyleId: "card", historyRetentionDays: 0 }, articles: [], history: {}, lastRefreshedAt: null })));
      await page.route("https://daily.juya.uk/rss.xml", route => route.fulfill({ status: 200, contentType: "application/xml", headers: { "access-control-allow-origin": "*" }, body: feed }));
      await page.route("https://assets.juya.uk/**", route => route.fulfill({ status: 200, contentType: "image/webp", body: image }));
      await page.goto(url);
      const item = page.locator(".juya-feed-item, article[role=button]").first();
      await item.waitFor();
      const expectedVariant = `folio-${scheme}`;
      assert.equal(await page.locator("[data-juya-variant]").first().getAttribute("data-juya-variant"), expectedVariant, "legacy card preference resolves to folio on the current color side");
      await page.waitForFunction(() => { const s = JSON.parse(localStorage.getItem("ai-daily:v1") || "null")?.settings; return s?.juyaLightStyleId === "folio" && s?.juyaDarkStyleId === "folio"; });
      assert.equal(await page.locator(".jyfolio-feed-masthead h1").innerText(), "橘鸦AI早报");
      await page.evaluate(() => document.fonts.ready);
      const id = `${viewport.width}-${scheme}`;
      await page.screenshot({ path: resolve(output, `${id}-feed.png`), fullPage: true, animations: "disabled" });
      await item.click();
      await page.waitForURL(/#\/issue\//);
      const issue = page.locator("[data-zoom-content] [data-juya-variant]");
      await issue.waitFor();
      assert.equal(await issue.getAttribute("data-juya-variant"), expectedVariant);
      const blocks = await page.locator(".juya-entry").first().locator(":scope > p:not(.juya-links-label), :scope > figure").evaluateAll(nodes => nodes.map(node => node.matches("figure") ? node.querySelector("img")?.alt : node.textContent?.trim()));
      assert.deepEqual(blocks, ["第一张图", "第一段", "第二段", "第二张图", "第三段"], "the lead image opens the article and remaining text/images follow their source order");
      assert.equal(await page.locator(".juya-overview a").getAttribute("target"), "_blank");
      await page.screenshot({ path: resolve(output, `${id}-reader.png`), fullPage: true, animations: "disabled" });
      await page.reload();
      await page.locator("[data-zoom-content] [data-juya-variant]").waitFor();
      assert.equal(await page.locator("[data-zoom-content] [data-juya-variant]").getAttribute("data-juya-variant"), expectedVariant, "the migrated side survives a restart on a direct reading route");
      await page.evaluate(() => localStorage.removeItem("ai-daily:v1"));
      await page.goto(url);
      await item.waitFor();
      assert.equal(await page.locator("[data-juya-variant]").first().getAttribute("data-juya-variant"), expectedVariant, "folio is the default when no side preference exists");
      await context.close();
    }
  }
  console.log(`PASS folio migration, ordered reading flow, both variants and widths; evidence: ${output}`);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
