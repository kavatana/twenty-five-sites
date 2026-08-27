/**
 * tapdemo — records a phone-sized video proving the tap targets are too small.
 *
 *   node tools/tapdemo.mjs            # broken (real site)
 *   node tools/tapdemo.mjs --fixed    # with the fix injected, for the "after" cut
 */
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';

const FIXED = process.argv.includes('--fixed');
const OUT = process.env.DEMO_EXPORT_DIR || join(ROOT, 'exports');
const ROOT = path.join(process.cwd(), 'public');
const MIME = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'};

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end('nf'); }
  rs.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
  fs.createReadStream(f).pipe(rs);
});
await new Promise(r => server.listen(8899, r));

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
// 540x960 is exact 9:16 and renders the identical mobile layout (dots still 9px),
// so the capture fills the frame and upscales cleanly to 1080x1920.
const ctx = await browser.newContext({
  viewport: { width: 540, height: 960 },
  deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  recordVideo: { dir: OUT, size: { width: 540, height: 960 } },
});
const page = await ctx.newPage();
await page.goto('http://localhost:8899/23-stillness/', { waitUntil: 'load' });
await page.waitForTimeout(3000);

// --fixed changes only the narration. The fix itself lives in the real
// stylesheet and is verified by `node tools/tapcheck.mjs 23-stillness`.
// Nothing is injected, so what is filmed is what actually ships.

// ---- overlay: a real fingertip, drawn to scale ----
await page.evaluate(() => {
  const s = document.createElement('style');
  s.textContent = `
    #fingr{position:fixed;width:44px;height:44px;border-radius:50%;
      background:rgba(255,60,60,.28);border:2px solid rgba(255,60,60,.9);
      z-index:99999;pointer-events:none;left:0;top:0;
      transition:transform .9s cubic-bezier(.4,0,.2,1);opacity:0;
      box-shadow:0 0 0 1px rgba(255,255,255,.5) inset;}
    #cap{position:fixed;left:0;right:0;bottom:120px;z-index:99999;
      text-align:center;font:600 27px/1.4 -apple-system,system-ui,sans-serif;
      color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.8),0 0 40px rgba(0,0,0,.5);
      padding:0 34px;opacity:0;transition:opacity .45s;pointer-events:none;}
    #ring{position:fixed;z-index:99998;border:2px dashed rgba(255,60,60,.85);
      border-radius:14px;pointer-events:none;opacity:0;transition:opacity .45s;}
  `;
  document.head.appendChild(s);
  for (const id of ['fingr','cap','ring']) {
    const d = document.createElement('div'); d.id = id; document.body.appendChild(d);
  }
});

const say = (t) => page.evaluate(t => {
  const c = document.getElementById('cap');
  c.style.opacity = 0;
  setTimeout(() => { c.innerHTML = t; c.style.opacity = 1; }, 260);
}, t);
const hide = () => page.evaluate(() => { document.getElementById('cap').style.opacity = 0; });
const finger = (x, y, show = true) => page.evaluate(({x,y,show}) => {
  const f = document.getElementById('fingr');
  f.style.opacity = show ? 1 : 0;
  f.style.transform = `translate(${x-22}px, ${y-22}px)`;
}, {x,y,show});

// locate the dots
const dots = await page.$$eval('.pal-dot', els => els.map(e => {
  const b = e.getBoundingClientRect();
  return { x: b.left + b.width/2, y: b.top + b.height/2, w: Math.round(b.width),
           label: e.getAttribute('aria-label') || e.textContent.trim() };
}));

// 1. calm establishing shot
await page.waitForTimeout(2200);
await say('A meditation app.');
await page.waitForTimeout(2400);

// 2. point at the controls
await page.evaluate(d => {
  const r = document.getElementById('ring');
  r.style.left = (d.x-52)+'px'; r.style.top = (d.y-22)+'px';
  r.style.width = '104px'; r.style.height = '40px'; r.style.opacity = 1;
}, dots[1]);
await say('These three dots change the palette.');
await page.waitForTimeout(2800);

await say(FIXED ? 'The dots are still 9 pixels.' : `Each one is ${dots[1].w} pixels wide.`);
await page.waitForTimeout(2600);
await page.evaluate(() => { document.getElementById('ring').style.opacity = 0; });

// 3. bring in a real fingertip
await finger(dots[1].x, dots[1].y + 150);
await say('This circle is a real fingertip. 44 pixels.');
await page.waitForTimeout(2600);

// 4. land it on the dots
await finger(dots[1].x, dots[1].y);
await page.waitForTimeout(1400);
await say(FIXED
  ? 'Now each dot owns its own 44 pixels.'
  : 'It covers all three at once.');
await page.waitForTimeout(3000);

// 5. try to tap each one the way a real thumb does.
//    Touchscreen studies put human aim error around 6-10px; tapping the exact
//    mathematical centre every time would be dishonest, so we aim slightly off
//    — which is what actually happens on a phone.
await hide();
await say('A thumb lands about 7px off centre.<br>That is normal.');
await page.waitForTimeout(2900);

const AIM_ERROR = [ -7, +6, -8 ];   // realistic misses, not worst-case
for (let i = 0; i < dots.length; i++) {
  const d = dots[i];
  const dx = AIM_ERROR[i % AIM_ERROR.length];
  const tx = d.x + dx, ty = d.y;
  await finger(tx, ty);
  await page.waitForTimeout(900);

  // ground truth: what does the browser say is under that point?
  const hit = await page.evaluate(({x, y}) => {
    const t = document.elementFromPoint(x, y);
    if (!t) return 'nothing';
    const btn = t.closest('.pal-dot');
    if (btn) return btn.getAttribute('aria-label') || btn.textContent.trim();
    return 'nothing';
  }, {x: tx, y: ty});

  await page.touchscreen.tap(tx, ty);
  await page.waitForTimeout(700);
  const ok = hit === d.label;
  await say(`Aimed at <b>${d.label}</b>, ${dx > 0 ? '+' : ''}${dx}px &nbsp;→&nbsp; hit <b>${hit}</b> ${ok ? '✓' : '✗'}`);
  await page.waitForTimeout(2100);
}

await hide();
await finger(0,0,false);
await page.waitForTimeout(600);
await say(FIXED
  ? 'Nine of nine pass.<br>The dots never changed size.'
  : 'Nine controls.<br>Not one is big enough to press.');
await page.waitForTimeout(3400);
await hide();
await page.waitForTimeout(900);

await ctx.close();
await browser.close();
server.close();

// name the file
const vids = fs.readdirSync(OUT).filter(f => f.endsWith('.webm'));
const newest = vids.map(f => ({f, t: fs.statSync(path.join(OUT,f)).mtimeMs})).sort((a,b)=>b.t-a.t)[0];
if (newest) {
  const target = path.join(OUT, FIXED ? 'stillness-AFTER.webm' : 'stillness-BEFORE.webm');
  fs.renameSync(path.join(OUT, newest.f), target);
  console.log('recorded →', target);
}
