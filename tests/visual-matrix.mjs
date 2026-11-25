import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";

// Historical comparisons must pair the old site with an explicit pre-theme web build.
const oldDist = process.env.AI_NEWS_OLD_DIST;
const preThemeDist = process.env.AI_NEWS_PRE_THEME_DIST;
if (Boolean(oldDist) !== Boolean(preThemeDist)) {
  throw new Error("Historical visual comparison requires both AI_NEWS_OLD_DIST and AI_NEWS_PRE_THEME_DIST.");
}
const historicalComparison = Boolean(oldDist && preThemeDist);
const oldRoot = historicalComparison ? resolve(oldDist) : null;
const preThemeRoot = historicalComparison ? resolve(preThemeDist) : null;
if (historicalComparison && oldRoot === preThemeRoot) {
  throw new Error("AI_NEWS_OLD_DIST and AI_NEWS_PRE_THEME_DIST must point to different dist roots.");
}
const currentRoot = resolve("dist");
const currentStyles = ["folio", "y2k", "pop", "newsprint90s", "synthwave", "nocturne", "editorial", "wabi"];
const historicalStyles = ["card", "y2k", "pop", "newsprint90s", "dreamcore"];
const styles = historicalComparison ? historicalStyles : currentStyles;
const currentVariantIds = ["folio-light", "folio-dark", "y2k-light", "y2k-dark", "pop-light", "pop-dark", "newsprint90s-light", "newsprint90s-dark", "synthwave-light", "synthwave-dark", "nocturne-light", "nocturne-dark", "editorial-light", "editorial-dark", "wabi-light", "wabi-dark"];
const versions = historicalComparison ? ["old", "pre-theme"] : ["current"];
const caseFilter = process.env.AI_NEWS_CASE ? new Set(process.env.AI_NEWS_CASE.split(",").map(value => value.trim()).filter(Boolean)) : null;
const output = resolve(process.env.AI_NEWS_EVIDENCE || "test-results/visual-matrix");
await mkdir(output, { recursive: true });
let activeVersion = "current";
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".xml": "application/xml", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const usesOldSiteLayout = activeVersion === "old";
  const root = activeVersion === "old" ? oldRoot : activeVersion === "pre-theme" ? preThemeRoot : currentRoot;
  const relative = path === "/ai-news/" ? (usesOldSiteLayout ? "ai-news/index.html" : "index.html") : (usesOldSiteLayout ? path.slice(1) : path.replace(/^\/ai-news\//, ""));
  const file = resolve(root, relative);
  if (!file.startsWith(root + sep)) return res.writeHead(404).end();
  try { res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/ai-news/`;
const feed = await readFile("public/snapshot/juya.xml");
const image = await readFile("public/avatar.webp");
const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of [{width:1280,height:900}, {width:390,height:844}]) {
    for (const style of styles) {
      for (const scheme of ["light", "dark"]) {
        if (caseFilter && !caseFilter.has(`${viewport.width}x${viewport.height}-${style}-${scheme}`)) continue;
        for (const version of versions) {
          activeVersion = version;
          const context = await browser.newContext({viewport, colorScheme:scheme, reducedMotion:"reduce"});
          const page = await context.newPage();
          const errors = [], imageUrls = [];
          page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
          page.on("console", msg => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });
          page.on("requestfailed", req => errors.push(`requestfailed: ${req.url()} ${req.failure()?.errorText}`));
          await page.clock.setFixedTime(new Date("2026-09-02T12:00:00Z"));
          await page.addInitScript(({style, scheme}) => {
            localStorage.setItem("ai-daily:v1", JSON.stringify({version:1,settings:{themeMode:scheme,juyaLightStyleId:style,juyaDarkStyleId:style,historyRetentionDays:0},articles:[],history:{},lastRefreshedAt:null}));
          }, {style, scheme});
          await page.route("https://daily.juya.uk/rss.xml", route => route.fulfill({status:200,contentType:"application/xml",headers:{"access-control-allow-origin":"*"},body:feed}));
          await page.route("**/*", route => {
            const request = route.request();
            if (request.resourceType() === "image" && /^https?:/.test(request.url()) && !request.url().startsWith(url)) {
              imageUrls.push(request.url());
              return route.fulfill({status:200,contentType:"image/webp",body:image});
            }
            return route.fallback();
          });
          await page.goto(url);
          await page.locator('.juya-feed-item, article[role="button"]').first().waitFor();
          await page.evaluate(() => document.fonts.ready);
          for (const view of ["list", "detail"]) {
            if (view === "detail") {
              await page.locator('.juya-feed-item, article[role="button"]').first().click();
              await page.waitForURL(/#\/issue\//);
              await page.locator('[data-zoom-content] [data-juya-variant]').first().waitFor();
            }
            const variant = await page.locator('[data-juya-variant]').first().getAttribute('data-juya-variant');
            assert.equal(variant, `${style}-${scheme}`);
            if (!historicalComparison) assert.ok(currentVariantIds.includes(variant), `current mode covers a registered variant: ${variant}`);
            if (!historicalComparison && view === "list") {
              assert.ok(await page.locator(".juya-feed").isVisible(), `${style}-${scheme} list has a visible feed anchor`);
              assert.ok(await page.locator(".juya-feed-item").first().isVisible(), `${style}-${scheme} list has a visible issue anchor`);
              assert.ok((await page.locator(".juya-feed-item").first().innerText()).trim().length > 0, `${style}-${scheme} list issue anchor has content`);
            } else if (!historicalComparison) {
              assert.ok(await page.locator(".juya-issue").isVisible(), `${style}-${scheme} detail has a visible issue anchor`);
              assert.ok((await page.locator(".juya-masthead h1").first().innerText()).trim().length > 0, `${style}-${scheme} detail masthead has a title`);
              assert.ok(await page.locator(".juya-overview a[href^='https://']").count() > 0, `${style}-${scheme} detail preserves an outbound overview link`);
            }
            const imageState = await page.locator("[data-juya-variant] img").evaluateAll(images => images.map(img => ({src:img.currentSrc || img.src, complete:img.complete, naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight})));
            if (!historicalComparison) {
              assert.ok(imageState.length > 0, `${style}-${scheme} ${view} renders image anchors`);
              assert.ok(imageState.some(image => image.complete && image.naturalWidth > 0 && image.naturalHeight > 0), `${style}-${scheme} ${view} decodes at least one image: ${JSON.stringify(imageState)}`);
            }
            let headingContrast = null;
            if (style === "synthwave" || (style === "y2k" && scheme === "dark")) {
              assert.equal(await page.locator('.juya-scene').count(), 1, `${style}-${scheme} scene in ${view}`);
              assert.equal(await page.locator('.juya-scene-sun, .juya-scene-stars').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).animationName === "none")), true, `${style}-${scheme} honors reduced motion`);
            }
            if (style === "y2k" && scheme === "light") {
              headingContrast = await page.evaluate((view) => {
                const heading = document.querySelector(view === "list" ? ".jyy2k-feed-masthead h1" : ".juya-masthead h1");
                if (!heading) throw new Error(`Missing Y2K ${view} masthead heading`);
                const root = heading.closest("[data-juya-variant]");
                if (!root) throw new Error("Missing Y2K variant root");
                const rgb = (color) => {
                  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
                  const values = hex
                    ? (hex.length === 3 ? [...hex].map((channel) => Number.parseInt(channel + channel, 16)) : hex.match(/.{2}/g).map((channel) => Number.parseInt(channel, 16)))
                    : color.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
                  if (!values || values.length < 3) throw new Error(`Unparseable color: ${color}`);
                  return values.map((value) => value / 255 <= .04045 ? value / 255 / 12.92 : ((value / 255 + .055) / 1.055) ** 2.4);
                };
                const luminance = (color) => { const [r, g, b] = rgb(color); return .2126 * r + .7152 * g + .0722 * b; };
                const ratio = (foreground, background) => { const [a, b] = [luminance(foreground), luminance(background)].sort((x, y) => y - x); return (a + .05) / (b + .05); };
                const headingStyle = getComputedStyle(heading), tokens = getComputedStyle(root);
                const foreground = headingStyle.color;
                const backgrounds = [tokens.getPropertyValue("--jy-card").trim(), tokens.getPropertyValue("--jy-lead-bg").trim()];
                return { foreground, backgroundImage: headingStyle.backgroundImage, cardRatio: ratio(foreground, backgrounds[0]), leadRatio: ratio(foreground, backgrounds[1]) };
              }, view);
              assert.equal(headingContrast.backgroundImage, "none", `Y2K light ${view} masthead uses solid accessible text`);
              assert.ok(headingContrast.cardRatio >= 3, `Y2K light ${view} heading contrast against card: ${JSON.stringify(headingContrast)}`);
              assert.ok(headingContrast.leadRatio >= 3, `Y2K light ${view} heading contrast against lead surface: ${JSON.stringify(headingContrast)}`);
            }
            if (style === "y2k" && scheme === "light") assert.equal(await page.locator('.juya-scene').count(), 0, `y2k-light keeps its static star texture in ${view}`);
            if (style === "nocturne" && scheme === "light") {
              const mist = await page.locator(".juya-scene-dust").evaluate(node => {
                const pseudo = getComputedStyle(node, "::after");
                return {animationName:pseudo.animationName, animationDuration:pseudo.animationDuration, reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches};
              });
              assert.equal(mist.reducedMotion, true, "nocturne-light is inspected under reduced motion");
              assert.equal(mist.animationName, "none", `nocturne-light mist ::after honors reduced motion in ${view}: ${JSON.stringify(mist)}`);
            }
            if (style === "nocturne" && scheme === "dark") {
              const sceneMotion = await page.locator(".juya-scene-stars").evaluate(node => ({stars:getComputedStyle(node).animationName, starsAfter:getComputedStyle(node, "::after").animationName, dust:getComputedStyle(node.parentElement.querySelector(".juya-scene-dust")).animationName}));
              assert.deepEqual(sceneMotion, {stars:"none", starsAfter:"none", dust:"none"}, `nocturne-dark scene decoration honors reduced motion in ${view}: ${JSON.stringify(sceneMotion)}`);
              if (view === "detail") {
                const aurora = await page.locator(".juya-masthead").evaluate(node => ["::before", "::after"].map(pseudo => ({pseudo, animationName:getComputedStyle(node, pseudo).animationName})));
                assert.ok(aurora.every(layer => layer.animationName === "none"), `nocturne-dark reading masthead layers honor reduced motion: ${JSON.stringify(aurora)}`);
              }
            }
            if (style === "pop") {
              if (view === "list") {
                assert.equal(await page.locator(".jypop-feed-masthead h1").textContent(), "橘鸦AI早报", `pop ${scheme} feed masthead shows source identity`);
                assert.ok(await page.locator(".jypop-feed-masthead-strip[aria-hidden='true']").count(), `pop ${scheme} feed masthead has decorative Ben-Day strip`);
                assert.equal(await page.locator(".jypop-feed-masthead-domain").textContent(), "daily.juya.uk", `pop ${scheme} feed masthead shows source host`);
              }
            }
            if (style === "newsprint90s") {
              if (view === "list") {
                assert.equal(await page.locator(".jynews-feed-masthead h1").textContent(), "橘鸦AI早报", `newsprint90s ${scheme} feed masthead shows source identity`);
                assert.equal(await page.locator(".jynews-feed-masthead-domain").textContent(), "daily.juya.uk", `newsprint90s ${scheme} feed masthead shows source host`);
              } else {
                assert.ok(await page.locator(".juya-date-line").textContent(), `newsprint90s ${scheme} issue masthead shows published date`);
                assert.ok(await page.locator(".juya-masthead-weekday").textContent(), `newsprint90s ${scheme} issue masthead shows published weekday`);
                assert.ok(await page.locator(".juya-masthead-title").textContent(), `newsprint90s ${scheme} issue masthead shows issue title`);
                const columns = await page.locator(".juya-entry-columns").first().evaluate(node => getComputedStyle(node).columnCount);
                assert.equal(columns, viewport.width >= 900 ? "2" : "1", `newsprint90s ${scheme} ${viewport.width}px reading columns reflow`);
              }
            }
            if (viewport.width === 390) assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${style}-${scheme} has no horizontal page overflow in ${view}`);
            const id = `${viewport.width}x${viewport.height}-${style}-${scheme}-${view}-${version}`;
            await page.screenshot({path:resolve(output, `${id}.png`), fullPage:true, animations:"disabled"});
            if (view === "list") {
              const firstItem = page.locator(".juya-feed-item").first();
              await firstItem.locator('[title="收藏"]').click();
              assert.equal(await page.locator(".juya-feed-item").count(), 10, `${style}-${scheme} favorite action does not open the issue`);
              assert.equal(await firstItem.locator('[title="取消收藏"]').count(), 1, `${style}-${scheme} favorite action updates in place`);
              if (viewport.width === 390) await page.getByRole("button", { name: /筛选/ }).click();
              await page.getByRole("button", { name: /稍后读/ }).click();
              await page.locator(".juya-feed-empty").waitFor();
              assert.match(await page.locator(".juya-feed-empty").innerText(), /暂无内容/);
              assert.equal(await page.locator(".jypop-feed-masthead h1, .jynews-feed-masthead h1").count(), style === "pop" || style === "newsprint90s" ? 1 : 0, `${style}-${scheme} feed masthead remains visible with empty results`);
              await page.locator("button").filter({ hasText: /^全部/ }).first().click();
              await page.locator(".juya-feed-item").first().waitFor();
            }
            const metrics = await page.evaluate(() => {
              const box = el => { const r=el.getBoundingClientRect(); const c=getComputedStyle(el); return {x:r.x,y:r.y,width:r.width,height:r.height,color:c.color,background:c.backgroundColor,font:c.fontFamily,fontSize:c.fontSize}; };
              const images = [...document.querySelectorAll('[data-juya-variant] img')].map(img => ({src:img.currentSrc || img.src, complete:img.complete, naturalWidth:img.naturalWidth, naturalHeight:img.naturalHeight}));
              return {title:document.title, bodyText:document.body.innerText, documentHeight:document.documentElement.scrollHeight, horizontalOverflow:document.documentElement.scrollWidth > window.innerWidth, anchors:document.querySelectorAll('[data-juya-variant] a[href]').length, images, header:box(document.querySelector('header')), content:box(document.querySelector('[data-zoom-content]')), variant:document.querySelector('[data-juya-variant]')?.getAttribute('data-juya-variant'), refreshDisabled:document.querySelector('button[title="刷新"]')?.disabled};
            });
            results.push({id, metrics, headingContrast, errors:[...errors], imageUrls:[...imageUrls]});
          }
          await context.close();
        }
      }
    }
  }
  await writeFile(resolve(output,"metrics.json"), JSON.stringify(results,null,2));
  assert.equal(results.length, (caseFilter ? caseFilter.size * 2 : (historicalComparison ? 40 : 64)) * versions.length);
  assert.deepEqual(results.flatMap(r => r.errors.map(e => `${r.id}: ${e}`)), []);
  console.log(`PASS captured ${results.length} rendered views; evidence: ${output}`);
} finally { await browser.close(); await new Promise(r => server.close(r)); }
