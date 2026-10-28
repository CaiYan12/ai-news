import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";

// Optional historical comparison: AI_NEWS_OLD_DIST is the old site's dist root.
const oldRoot = process.env.AI_NEWS_OLD_DIST && resolve(process.env.AI_NEWS_OLD_DIST);
const newRoot = resolve("dist");
const output = resolve(process.env.AI_NEWS_EVIDENCE || "test-results/visual-matrix");
await mkdir(output, { recursive: true });
let historical = false;
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".xml": "application/xml", ".webp": "image/webp" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const root = historical ? oldRoot : newRoot;
  const relative = path === "/ai-news/" ? (historical ? "ai-news/index.html" : "index.html") : (historical ? path.slice(1) : path.replace(/^\/ai-news\//, ""));
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
    for (const style of ["card", "y2k", "pop", "newsprint90s", "dreamcore"]) {
      for (const scheme of ["light", "dark"]) {
        if (process.env.AI_NEWS_CASE && `${viewport.width}x${viewport.height}-${style}-${scheme}` !== process.env.AI_NEWS_CASE) continue;
        for (const version of oldRoot ? ["old", "new"] : ["new"]) {
          historical = version === "old";
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
            const id = `${viewport.width}x${viewport.height}-${style}-${scheme}-${view}-${version}`;
            await page.screenshot({path:resolve(output, `${id}.png`), fullPage:true, animations:"disabled"});
            const metrics = await page.evaluate(() => {
              const box = el => { const r=el.getBoundingClientRect(); const c=getComputedStyle(el); return {x:r.x,y:r.y,width:r.width,height:r.height,color:c.color,background:c.backgroundColor,font:c.fontFamily,fontSize:c.fontSize}; };
              return {title:document.title, bodyText:document.body.innerText, documentHeight:document.documentElement.scrollHeight, header:box(document.querySelector('header')), content:box(document.querySelector('[data-zoom-content]')), variant:document.querySelector('[data-juya-variant]')?.getAttribute('data-juya-variant'), refreshDisabled:document.querySelector('button[title="刷新"]')?.disabled};
            });
            results.push({id, metrics, errors:[...errors], imageUrls:[...imageUrls]});
          }
          await context.close();
        }
      }
    }
  }
  await writeFile(resolve(output,"metrics.json"), JSON.stringify(results,null,2));
  assert.equal(results.length, (process.env.AI_NEWS_CASE ? 2 : 40) * (oldRoot ? 2 : 1));
  assert.deepEqual(results.flatMap(r => r.errors.map(e => `${r.id}: ${e}`)), []);
  console.log(`PASS captured ${results.length} rendered views; evidence: ${output}`);
} finally { await browser.close(); await new Promise(r => server.close(r)); }
