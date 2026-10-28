import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
const [first,second]=process.argv.slice(2);
if(!first||!second)throw new Error('Pass two PNG paths');
const a=(await readFile(first)).toString('base64'),b=(await readFile(second)).toString('base64');
const browser=await chromium.launch(),page=await browser.newPage();
try{const result=await page.evaluate(async({a,b})=>{const load=s=>new Promise((ok,err)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=err;i.src=`data:image/png;base64,${s}`;});const [x,y]=await Promise.all([load(a),load(b)]);if(x.width!==y.width||x.height!==y.height)return {sizes:[[x.width,x.height],[y.width,y.height]]};const c=document.createElement('canvas');c.width=x.width;c.height=x.height;const k=c.getContext('2d');k.drawImage(x,0,0);const p=k.getImageData(0,0,c.width,c.height).data;k.clearRect(0,0,c.width,c.height);k.drawImage(y,0,0);const q=k.getImageData(0,0,c.width,c.height).data;const pixels=[];for(let i=0;i<p.length;i+=4)if(p[i]!==q[i]||p[i+1]!==q[i+1]||p[i+2]!==q[i+2]||p[i+3]!==q[i+3]){const n=i/4;pixels.push([n%c.width,Math.floor(n/c.width),Array.from(p.slice(i,i+4)),Array.from(q.slice(i,i+4))]);}return {sizes:[[x.width,x.height],[y.width,y.height]],differentPixels:pixels.length,pixels};},{a,b});console.log(JSON.stringify(result,null,2));}finally{await browser.close();}
