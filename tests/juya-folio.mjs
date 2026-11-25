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
const html = `<h1>橘鸦AI早报 2026-09-01</h1><h2>概览</h2>
<ul>
  <li><a href="https://example.com/story">来源标题 ↗</a> <code>#1</code></li>
  <li>按标题定位</li>
  <li><a href="https://example.com/overview-only">只有概览提供来源 ↗</a></li>
  <li><a href="https://example.com/ambiguous">编号重复 ↗</a> <code>#3</code></li>
  <li><a href="https://example.com/story">线索冲突 ↗</a> <code>#3</code></li>
  <li><a href="https://example.com/missing">同号但内容不同 ↗</a> <code>#1</code></li>
  <li><a href="//example.com/relative">仅有协议相对来源 ↗</a></li>
  <li>仅有概览标题</li>
</ul>
<h2>要闻</h2>
<h3><a href="https://example.com/story">图文次序验证</a> <code>#1</code></h3>
<blockquote>开篇导语</blockquote><p>第一段</p><p><img src="https://assets.juya.uk/one.png" alt="第一张图"></p>
<p>第二段</p><p><img src="https://assets.juya.uk/two.png" alt="第二张图"></p><p>第三段</p>
<p>相关链接：</p><ul><li><a href="https://example.com/ref">原文</a></li></ul>
<h2>模型发布</h2>
<h3>按标题定位</h3><p>正文没有编号或来源，也能通过标题定位。</p>
<h3>只有概览提供来源</h3><p>从概览匹配后，仍可到正文查看来源。</p>
<h3>第一条同号新闻 <code>#3</code></h3><p>同号新闻一的正文。</p>
<h3>第二条同号新闻 <code>#3</code></h3><p>${"同号新闻二的正文。".repeat(100)}</p>`;
const xmlEscape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const feed = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>橘鸦AI早报</title><item><title>2026-09-01</title><link>https://daily.juya.uk/issues/2026-09-01/</link><guid>https://daily.juya.uk/issues/2026-09-01/</guid><pubDate>Tue, 01 Sep 2026 01:36:00 GMT</pubDate><description>次序测试期号</description><content:encoded>${xmlEscape(html)}</content:encoded></item></channel></rss>`;
const image = await readFile("public/avatar.webp");
const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    for (const scheme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport, colorScheme: scheme, reducedMotion: viewport.width === 390 ? "reduce" : "no-preference",
      });
      const page = await context.newPage();
      await page.addInitScript(() => localStorage.setItem("ai-daily:v1", JSON.stringify({ version: 1, settings: { themeMode: "system", juyaLightStyleId: "card", juyaDarkStyleId: "card", historyRetentionDays: 0 }, articles: [], history: {}, lastRefreshedAt: null })));
      await page.route("https://daily.juya.uk/rss.xml", route => route.fulfill({ status: 200, contentType: "application/xml", headers: { "access-control-allow-origin": "*" }, body: feed }));
      let imageDelay;
      await page.route("https://assets.juya.uk/**", async route => {
        if (imageDelay) {
          await imageDelay;
          await route.fulfill({
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="1300"/>',
          });
        } else {
          await route.fulfill({ status: 200, contentType: "image/webp", body: image });
        }
      });
      await context.route("https://example.com/**", route => route.fulfill({ body: "来源页面" }));
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
      const feedUrl = page.url();
      await item.click();
      await page.waitForURL(/#\/issue\//);
      const issue = page.locator("[data-zoom-content] [data-juya-variant]");
      await issue.waitFor();
      assert.equal(await issue.getAttribute("data-juya-variant"), expectedVariant);
      const blocks = await issue.locator(".juya-entry").first().evaluate(entry =>
        [...entry.children].filter(node => node.matches("p:not(.juya-links-label), figure"))
          .map(node => node.matches("figure") ? node.querySelector("img")?.alt : node.textContent?.trim()));
      assert.deepEqual(blocks, ["第一张图", "第一段", "第二段", "第二张图", "第三段"], "the lead image opens the article and remaining text/images follow their source order");
      await page.screenshot({ path: resolve(output, `${id}-reader.png`), fullPage: true, animations: "disabled" });
      const issueUrl = page.url();
      const overviewTitle = issue.getByRole("button", { name: "来源标题", exact: true });
      assert.equal(await overviewTitle.count(), 1, "the linked overview title offers in-page navigation");
      await overviewTitle.press("Enter");
      const heading = issue.getByRole("heading", { name: /图文次序验证/, level: 3 });
      assert.equal(await heading.evaluate(element => element === document.activeElement), true, "the jump focuses the matching heading");
      assert.equal(page.url(), issueUrl, "the jump retains the issue URL");
      const overview = issue.locator(".juya-overview");
      const matchedTitle = overview.getByRole("button", { name: "按标题定位", exact: true });
      await matchedTitle.click();
      const matchedHeading = issue.getByRole("heading", { name: "按标题定位", level: 3, exact: true });
      assert.equal(await matchedHeading.evaluate(element => element === document.activeElement), true, "an entry without a number or source can match by title");
      await page.waitForFunction(() => {
        const heading = document.activeElement;
        const header = document.querySelector("[data-reader-header]");
        const box = heading.getBoundingClientRect();
        return box.top > header.getBoundingClientRect().bottom && box.bottom <= window.innerHeight;
      });
      assert.equal(await overview.getByRole("button", { name: "只有概览提供来源", exact: true }).count(), 1);
      const overviewOnlyEntry = issue.locator(".juya-entry").filter({ has: page.getByRole("heading", { name: "只有概览提供来源", level: 3 }) });
      const preservedSource = overviewOnlyEntry.getByRole("link", { name: "查看来源" });
      assert.equal(await preservedSource.getAttribute("href", { timeout: 2000 }), "https://example.com/overview-only");
      for (const [title, href] of [
        ["编号重复", "https://example.com/ambiguous"],
        ["线索冲突", "https://example.com/story"],
        ["同号但内容不同", "https://example.com/missing"],
        ["仅有协议相对来源", "//example.com/relative"],
        ["仅有概览标题", null],
      ]) {
        const item = overview.getByRole("listitem").filter({ hasText: title });
        assert.ok(await item.getByText(title, { exact: true }).isVisible(), `${title} stays visible`);
        assert.equal(await item.getByRole("button").count(), 0, `${title} offers no ambiguous jump`);
        const sources = item.getByRole("link");
        assert.equal(await sources.count(), href ? 1 : 0, `${title} only offers a source link when available`);
        if (href) {
          assert.equal(await sources.innerText(), "查看来源");
          assert.equal(await sources.getAttribute("href"), href);
        }
      }
      for (const [link, href] of [
        [overview.getByRole("link", { name: /查看来源.*编号重复/ }), "https://example.com/ambiguous"],
        [heading.getByRole("link", { name: "图文次序验证" }), "https://example.com/story"],
        [issue.locator(".juya-links").getByRole("link", { name: "原文" }), "https://example.com/ref"],
        [preservedSource, "https://example.com/overview-only"],
      ]) {
        const [sourcePage] = await Promise.all([context.waitForEvent("page"), link.click()]);
        await sourcePage.waitForURL(href);
        await sourcePage.close();
        assert.equal(page.url(), issueUrl, "sources open in another tab");
      }
      await page.goBack();
      await item.waitFor();
      assert.equal(page.url(), feedUrl, "one browser Back returns to the feed after multiple jumps");
      await page.goForward();
      await issue.waitFor();
      await page.reload();
      await page.locator("[data-zoom-content] [data-juya-variant]").waitFor();
      assert.equal(await page.locator("[data-zoom-content] [data-juya-variant]").getAttribute("data-juya-variant"), expectedVariant, "the migrated side survives a restart on a direct reading route");
      if (viewport.width === 390 && scheme === "light") {
        let releaseImages;
        imageDelay = new Promise(resolveImages => { releaseImages = resolveImages; });
        try {
          await page.reload({ waitUntil: "domcontentloaded" });
          await matchedTitle.click();
          releaseImages();
          await page.waitForFunction(() => {
            const images = [...document.querySelectorAll(".juya-entry img")];
            return images.length === 2 && images.every(image => image.complete && image.naturalHeight === 1300);
          });
          await page.evaluate(() => new Promise(next => requestAnimationFrame(() => requestAnimationFrame(next))));
          const landing = await matchedHeading.evaluate(element => {
            const heading = element.getBoundingClientRect();
            const toolbar = document.querySelector("[data-reader-header]").getBoundingClientRect();
            return { top: heading.top, bottom: heading.bottom, toolbarBottom: toolbar.bottom, viewportBottom: window.innerHeight };
          });
          assert.ok(landing.top > landing.toolbarBottom && landing.bottom <= landing.viewportBottom,
            `delayed images keep the target in view: ${JSON.stringify(landing)}`);
        } finally {
          releaseImages();
        }
      }
      await page.evaluate(() => localStorage.removeItem("ai-daily:v1"));
      await page.goto(url);
      await item.waitFor();
      assert.equal(await page.locator("[data-juya-variant]").first().getAttribute("data-juya-variant"), expectedVariant, "folio is the default when no side preference exists");
      await context.close();
    }
  }
  console.log(`PASS folio migration, reading flow, overview navigation, sources, late images and browser Back; evidence: ${output}`);
} finally {
  await browser.close();
  await new Promise(r => server.close(r));
}
