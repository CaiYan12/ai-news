import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const dir=resolve(process.argv[2] || "test-results/visual-matrix");
const data=JSON.parse(await readFile(resolve(dir,"metrics.json"),"utf8"));
const browser=await chromium.launch(); const page=await browser.newPage();
const pairs=[];
try {
  for(const old of data.filter(x=>x.id.endsWith("-old"))) {
    const id=old.id.slice(0,-4), current=data.find(x=>x.id===`${id}-new`);
    if(!current) throw new Error(`Missing ${id}-new`);
    const a=(await readFile(resolve(dir,`${old.id}.png`))).toString("base64");
    const b=(await readFile(resolve(dir,`${current.id}.png`))).toString("base64");
    const pixels=await page.evaluate(async({a,b})=>{
      const load=s=>new Promise((ok,fail)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=fail;i.src=`data:image/png;base64,${s}`;});
      const [x,y]=await Promise.all([load(a),load(b)]);
      if(x.width!==y.width||x.height!==y.height)return {oldSize:[x.width,x.height],newSize:[y.width,y.height],differentPixels:null};
      const c=document.createElement('canvas');c.width=x.width;c.height=x.height;const ctx=c.getContext('2d');ctx.drawImage(x,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(y,0,0);const q=ctx.getImageData(0,0,c.width,c.height).data;let count=0,minX=c.width,minY=c.height,maxX=0,maxY=0,outsideHeader=0,extra=[];for(let i=0;i<p.length;i+=4)if(p[i]!==q[i]||p[i+1]!==q[i+1]||p[i+2]!==q[i+2]||p[i+3]!==q[i+3]){count++;const n=i/4,px=n%c.width,py=Math.floor(n/c.width);minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);if(py>=100)outsideHeader++;if(c.width===1280&&px<1100)extra.push([px,py,Array.from(p.slice(i,i+4)),Array.from(q.slice(i,i+4))]);}return {oldSize:[x.width,x.height],newSize:[y.width,y.height],differentPixels:count,totalPixels:c.width*c.height,bounds:[minX,minY,maxX,maxY],outsideFirst100px:outsideHeader,extra};
    },{a,b});
    const keys=["bodyText","documentHeight","header","content","variant","refreshDisabled","title"];
    const metricDifferences=Object.fromEntries(keys.filter(k=>JSON.stringify(old.metrics[k])!==JSON.stringify(current.metrics[k])).map(k=>[k,{old:old.metrics[k],new:current.metrics[k]}]));
    pairs.push({id,pixels,metricDifferences});
  }
  await writeFile(resolve(dir,"comparison.json"),JSON.stringify(pairs,null,2));
  assert.equal(pairs.length,process.env.AI_NEWS_CASE ? 2 : 40,"historical comparison requires matching old/new pairs");
  for(const pair of pairs){
    assert.notEqual(pair.pixels.differentPixels,null,`${pair.id}: screenshot dimensions`);
    assert.equal(pair.pixels.outsideFirst100px,0,`${pair.id}: pixels differ below header area`);
    assert.deepEqual(Object.keys(pair.metricDifferences).sort(),['refreshDisabled','title'],`${pair.id}: rendered metrics`);
    assert.deepEqual(pair.metricDifferences.refreshDisabled,{old:true,new:false},`${pair.id}: approved refresh correction`);
  }
  console.log(`Compared ${pairs.length} pairs; ${pairs.filter(p=>p.pixels.differentPixels===0).length} pixel-identical; ${pairs.filter(p=>p.pixels.differentPixels===null).length} differing image dimensions`);
} finally {await browser.close();}
