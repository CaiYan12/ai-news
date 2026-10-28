import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";

const historical=Boolean(process.env.AI_NEWS_OLD_DIST), root = resolve(process.env.AI_NEWS_OLD_DIST || "dist"), output = resolve(process.env.AI_NEWS_EVIDENCE || "test-results/navigation-motion");
await mkdir(output,{recursive:true});
const mime = {".html":"text/html",".js":"text/javascript",".css":"text/css",".xml":"application/xml",".webp":"image/webp"};
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const file=resolve(root,path==="/ai-news/"?(historical?"ai-news/index.html":"index.html"):(historical?path.slice(1):path.replace(/^\/ai-news\//,"")));
  if(!file.startsWith(root+sep)) return res.writeHead(404).end();
  try {res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"}).end(await readFile(file));} catch {res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const url=`http://127.0.0.1:${server.address().port}/ai-news/`;
const feed=await readFile("public/snapshot/juya.xml"), image=await readFile("public/avatar.webp");
const browser=await chromium.launch();
const evidence=[];
try {
  for(const width of [1280,390]) for(const mode of ["normal","reduce","unsupported"]) {
    const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:mode==="reduce"?"reduce":"no-preference"});
    const page=await context.newPage(), errors=[];
    page.on("pageerror", e=>errors.push(`pageerror: ${e.message}`));
    page.on("console", m=>{if(m.type()==="error")errors.push(`console: ${m.text()}`);});
    page.on("requestfailed",r=>errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
    await page.clock.setFixedTime(new Date("2026-09-02T12:00:00Z"));
    await page.addInitScript((unsupported)=>{
      window.__motion={frames:[],events:[],rejections:[],transitions:[]};
      window.addEventListener("unhandledrejection",e=>window.__motion.rejections.push(String(e.reason)));
      window.addEventListener('hashchange',()=>window.__motion.transitions.push({event:'hashchange',hash:location.hash,time:performance.now()}));
      const original=document.startViewTransition?.bind(document);
      if(original&&!unsupported){let id=0;document.startViewTransition=(callback)=>{const n=++id;const log=(event,reason)=>window.__motion.transitions.push({id:n,event,hash:location.hash,time:performance.now(),reason:reason&&String(reason)});log('start');const vt=original(()=>{log('callback');return callback();});vt.ready.then(()=>log('ready'),e=>log('ready-rejected',e));vt.finished.then(()=>log('finished'),e=>log('finished-rejected',e));return vt;};}
      for(const event of ["animationstart","animationend","animationcancel","transitionrun","transitionend","transitioncancel"]) document.addEventListener(event,e=>window.__motion.events.push({type:event,name:e.animationName||e.propertyName,time:performance.now()}),true);
      if(unsupported) Object.defineProperty(document,"startViewTransition",{value:undefined,configurable:true});
      const sample=()=>{const content=document.querySelector('[data-zoom-content]'); window.__motion.frames.push({t:performance.now(),hash:location.hash,text:content?.innerText?.slice(0,120)||"",visible:!!content && content.getBoundingClientRect().height>0}); if(window.__motion.frames.length<600) requestAnimationFrame(sample);};
      requestAnimationFrame(sample);
    },mode==="unsupported");
    await page.route("https://daily.juya.uk/rss.xml",r=>r.fulfill({status:200,contentType:"application/xml",headers:{"access-control-allow-origin":"*"},body:feed}));
    await page.route("**/*",r=>r.request().resourceType()==="image" && !r.request().url().startsWith(url)?r.fulfill({status:200,contentType:"image/webp",body:image}):r.fallback());
    await page.goto(url); const item=page.locator('.juya-feed-item, article[role="button"]').first(); await item.waitFor();
    let controlledTrace=null;
    if(process.env.AI_NEWS_HOLD_TRANSITION && mode==='normal'){
      await page.evaluate(()=>{const original=document.startViewTransition.bind(document);let release;const gate=new Promise(r=>release=r);window.__releaseTransition=release;let once=true;document.startViewTransition=callback=>original(async()=>{if(once){once=false;window.__motion.transitions.push({event:'held',hash:location.hash,time:performance.now()});await gate;const result=callback();window.__releasedCallback=true;return result;}return callback();});});
      await item.click();await page.waitForURL(/#\/issue\//);await page.waitForFunction(()=>window.__motion.transitions.some(x=>x.event==='held'));await page.goBack();await page.waitForURL(/#\/$/);await page.waitForFunction(()=>window.__motion.transitions.some(x=>x.event==='hashchange'&&x.hash==='#/'));await page.evaluate(()=>window.__releaseTransition());await page.waitForFunction(()=>window.__releasedCallback);
      try {await item.waitFor({timeout:5000});}catch(e){await page.screenshot({path:resolve(output,`${width}-${mode}-held-failure.png`)});evidence.push({width,mode,failure:String(e),url:page.url(),body:await page.locator('body').innerText(),dom:await page.evaluate(()=>({header:document.querySelector('header')?.innerText,toolbar:document.querySelector('.view-nav')?.innerText,content:document.querySelector('[data-zoom-content]')?.innerText,clock:Date.now()})),motion:await page.evaluate(()=>window.__motion),errors});throw e;}
      controlledTrace=await page.evaluate(()=>({url:location.href,motion:window.__motion,toolbar:document.querySelector('.view-nav')?.innerText||null,list:document.querySelector('.juya-feed-item, article[role="button"]')?.innerText||null}));await page.screenshot({path:resolve(output,`${width}-${mode}-held-success.png`)});
      const issueHash=controlledTrace.motion.transitions.find(x=>x.event==='held').hash;
      await page.evaluate(hash=>{location.hash=hash;},issueHash);await page.waitForURL(/#\/issue\//);
      try {await page.getByTitle('在新标签打开原文').waitFor({timeout:5000});}catch(e){await page.screenshot({path:resolve(output,`${width}-${mode}-repeat-target-failure.png`)});evidence.push({width,mode,failure:String(e),phase:'repeat-target',url:page.url(),body:await page.locator('body').innerText(),motion:await page.evaluate(()=>window.__motion),errors});throw e;}
      controlledTrace.afterRepeat=await page.evaluate(()=>({url:location.href,motion:window.__motion,toolbar:document.querySelector('.view-nav')?.innerText||null}));await page.screenshot({path:resolve(output,`${width}-${mode}-repeat-target-success.png`)});
      await page.getByRole('button',{name:'返回',exact:true}).click();await page.waitForURL(/#\/$/);await item.waitFor();
    }
    const cdp=await context.newCDPSession(page), captures=[], writes=[];
    const ackErrors=[];const onFrame=event=>{const index=captures.length;captures.push({index,metadata:event.metadata});writes.push(writeFile(resolve(output,`${width}-${mode}-frame-${String(index).padStart(3,'0')}.jpg`),Buffer.from(event.data,'base64')));void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(e=>ackErrors.push(e.message));};cdp.on('Page.screencastFrame',onFrame);
    await cdp.send('Page.startScreencast',{format:'jpeg',quality:80,everyNthFrame:1});
    await item.click(); await page.waitForURL(/#\/issue\//); await page.getByTitle('在新标签打开原文').waitFor();
    const detail=page.url(); await page.screenshot({path:resolve(output,`${width}-${mode}-detail.png`)});
    await page.reload(); await page.getByTitle('在新标签打开原文').waitFor(); assert.equal(page.url(),detail);
    await page.getByRole("button",{name:"返回",exact:true}).click(); await page.waitForURL(/#\/$/); await item.waitFor();
    await item.click(); await page.waitForURL(/#\/issue\//); await page.goBack(); await page.waitForURL(/#\/$/); await page.goForward(); await page.waitForURL(/#\/issue\//);
    // Exercise interruptions without waiting for intermediate transitions to settle.
    await page.evaluate(()=>{const issue=location.hash; location.hash="#/"; setTimeout(()=>location.hash=issue,0); setTimeout(()=>location.hash="#/",1);});
    await page.waitForURL(/#\/$/); try {await item.waitFor({timeout:5000});} catch(e) {await page.screenshot({path:resolve(output,`${width}-${mode}-failure.png`)});evidence.push({width,mode,failure:String(e),url:page.url(),body:await page.locator('body').innerText(),dom:await page.evaluate(()=>({header:document.querySelector('header')?.innerText,toolbar:document.querySelector('.view-nav')?.innerText,content:document.querySelector('[data-zoom-content]')?.innerText,clock:Date.now()})),motion:await page.evaluate(()=>window.__motion),errors,captures,ackErrors});throw e;}
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const motion=await page.evaluate(()=>window.__motion);
    await page.screenshot({path:resolve(output,`${width}-${mode}-final.png`)});
    await cdp.send('Page.stopScreencast');cdp.off('Page.screencastFrame',onFrame);await Promise.all(writes);
    evidence.push({width,mode,detail,motion,errors,captures,ackErrors,controlledTrace});
    await context.close();
    assert.deepEqual(errors,[],`${mode} browser errors`);
    assert.deepEqual(motion.rejections,[],`${mode} unhandled rejections`);
    assert.ok(motion.frames.some(f=>f.visible && f.text),`${mode} rendered content`);
    const firstVisible=motion.frames.findIndex(f=>f.visible && f.text);
    assert.ok(motion.frames.slice(firstVisible).every(f=>f.visible && f.text),`${mode} blank frame after detail initialized`);
    console.log(`PASS ${width} ${mode}: direct reload, back/forward, rapid route sequence`);
  }
} finally {
  await writeFile(resolve(output,"motion.json"),JSON.stringify(evidence,null,2));
  await browser.close(); await new Promise(r=>server.close(r));
}
