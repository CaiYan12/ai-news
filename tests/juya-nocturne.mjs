import { chromium } from "playwright";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import assert from "node:assert/strict";

const root = resolve("dist");
const output = resolve(process.env.AI_NEWS_EVIDENCE || "test-results/juya-nocturne");
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
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/ai-news/`;
const xmlEscape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const html = `<h1>橘鸦AI早报 2026-09-01</h1><h2>概览</h2><ul><li><a href="https://example.com/story">来源标题 ↗</a></li></ul><h2>要闻</h2><h3><a href="https://example.com/story">图文次序验证</a> <code>#1</code></h3><blockquote>开篇导语</blockquote><p>第一段</p><p><img src="https://assets.juya.uk/one.webp" alt="第一张图"></p><p>第二段</p><p><img src="https://assets.juya.uk/two.webp" alt="第二张图"></p><p>第三段</p><p>相关链接：</p><ul><li><a href="https://example.com/ref">原文</a></li></ul>`;
const feed = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>橘鸦AI早报</title><item><title>2026-09-01</title><link>https://daily.juya.uk/issues/2026-09-01/</link><guid>https://daily.juya.uk/issues/2026-09-01/</guid><pubDate>Tue, 01 Sep 2026 01:36:00 GMT</pubDate><description>次序测试期号</description><content:encoded>${xmlEscape(html)}</content:encoded></item></channel></rss>`;
const image = await readFile("public/avatar.webp");
const browser = await chromium.launch();
try {
  for (const width of [1280, 390]) {
    for (const scheme of ["light", "dark"]) {
      const reduced = width === 390 && scheme === "dark";
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: scheme, reducedMotion: reduced ? "reduce" : "no-preference" });
      const page = await context.newPage();
      page.on("pageerror", error => { throw error; });
      await page.clock.setFixedTime(new Date("2026-09-02T12:00:00Z"));
      await page.route("https://daily.juya.uk/rss.xml", route => route.fulfill({ status: 200, contentType: "application/xml", headers: { "access-control-allow-origin": "*" }, body: feed }));
      await page.route("https://assets.juya.uk/**", route => route.fulfill({ status: 200, contentType: "image/webp", body: image }));
      await page.goto(url);
      const item = page.locator(".juya-feed-item, article[role=button]").first();
      await item.waitFor();
      const emptyDefault = scheme === "light" ? "folio-light" : "nocturne-dark";
      assert.equal(await page.locator("[data-juya-variant]").first().getAttribute("data-juya-variant"), emptyDefault, "empty preferences default light to folio and dark to nocturne");
      await page.waitForFunction(() => localStorage.getItem("ai-daily:v1") !== null);
      const settings = await page.evaluate(() => JSON.parse(localStorage.getItem("ai-daily:v1")).settings);
      assert.equal(settings.juyaLightStyleId, "folio");
      assert.equal(settings.juyaDarkStyleId, "nocturne");
      await page.getByTitle("设置", { exact: true }).click();
      const side = scheme === "light" ? "亮色侧" : "暗色侧";
      await page.locator("label").filter({ hasText: side }).getByRole("button").click();
      const menu = page.locator('.menu-pop:not([data-closing="true"])').last();
      assert.ok(await menu.getByRole("button", { name: "暗夜精修式", exact: true }).count(), `nocturne is available on ${side}`);
      if (scheme === "light") await menu.getByRole("button", { name: "暗夜精修式", exact: true }).click();
      else await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => {
        const settings = JSON.parse(localStorage.getItem("ai-daily:v1") || "null")?.settings;
        return settings?.juyaLightStyleId === (matchMedia("(prefers-color-scheme: dark)").matches ? "folio" : "nocturne") && settings?.juyaDarkStyleId === "nocturne";
      });
      const variant = scheme === "light" ? "nocturne-light" : "nocturne-dark";
      await page.waitForFunction(expected => document.querySelector(`[data-juya-variant="${expected}"]`), variant);
      const rootNode = page.locator(`[data-juya-variant="${variant}"]`).first();
      const scene = rootNode.locator(".juya-scene");
      assert.equal(await scene.getAttribute("aria-hidden"), "true");
      assert.equal(await scene.evaluate(node => getComputedStyle(node).pointerEvents), "none");
      for (const layer of ["nebula", "dust", "stars"]) assert.ok(await rootNode.locator(`.juya-scene-${layer}`).count());
      assert.notEqual(await rootNode.locator(".juya-scene-stars").evaluate(node => getComputedStyle(node).backgroundImage), "none");
      if (reduced) assert.equal(await rootNode.locator(".juya-scene-dust").evaluate(node => getComputedStyle(node).animationName), "none");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no horizontal overflow");
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: resolve(output, `${width}-${scheme}-feed.png`), fullPage: true, animations: "disabled" });
      await item.click();
      await page.waitForURL(/#\/issue\//);
      await page.getByRole("button", { name: "返回", exact: true }).waitFor();
      const issue = page.locator("[data-zoom-content] [data-juya-variant]");
      await issue.waitFor();
      assert.equal(await issue.getAttribute("data-juya-variant"), variant);
      assert.equal(await page.locator(".juya-entry").count(), 1, (await issue.evaluate(node => node.outerHTML)).slice(0, 1600));
      assert.equal(await page.locator(".juya-overview a").getAttribute("target"), "_blank");
      assert.equal(await page.locator(".juya-entry h3 a").getAttribute("target"), "_blank");
      await page.screenshot({ path: resolve(output, `${width}-${scheme}-reader.png`), fullPage: true, animations: "disabled" });
      await page.reload();
      await page.getByRole("button", { name: "返回", exact: true }).waitFor();
      const persistedVariant = page.locator(`[data-zoom-content] .juya-root[data-juya-variant="${variant}"]`);
      assert.equal(await persistedVariant.count(), 1, await page.locator("[data-zoom-content]").innerHTML());
      await context.close();
    }
  }
  const snapshotFeed = await readFile("public/snapshot/juya.xml");
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem("ai-daily:v1", JSON.stringify({ version: 1, settings: { themeMode: "system", juyaLightStyleId: "nocturne", juyaDarkStyleId: "nocturne" }, articles: [], history: {}, lastRefreshedAt: null })));
    await page.clock.setFixedTime(new Date("2026-09-02T12:00:00Z"));
    await page.route("https://daily.juya.uk/rss.xml", route => route.fulfill({ status: 200, contentType: "application/xml", headers: { "access-control-allow-origin": "*" }, body: snapshotFeed }));
    await page.route("https://assets.juya.uk/**", route => route.fulfill({ status: 200, contentType: "image/webp", body: image }));
    await page.goto(url);
    await page.locator(".juya-feed-item, article[role=button]").first().waitFor();
    const variant = `nocturne-${scheme}`;
    assert.equal(await page.locator("[data-juya-variant]").first().getAttribute("data-juya-variant"), variant);
    await page.screenshot({ path: resolve(output, `1280-${scheme}-snapshot-list.png`), fullPage: true, animations: "disabled" });
    await context.close();
  }
  console.log(`PASS nocturne defaults, both selectors, feed/reader, widths, and reduced motion; evidence: ${output}`);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
