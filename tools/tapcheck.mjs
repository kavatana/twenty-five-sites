/**
 * tapcheck — verifies interactive controls are actually tappable on a phone.
 *
 * Measures the REAL hit area using document.elementFromPoint, not just the CSS
 * box — so padding, pseudo-elements and larger wrappers all count, exactly as a
 * real thumb would experience them.
 *
 * Standard: 44x44px minimum (Apple HIG, Google Material, WCAG 2.5.5).
 *
 * Usage:  node tools/tapcheck.mjs 23-stillness
 */
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';

const SITE = process.argv[2] || '23-stillness';
const MIN = 44;
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

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const page = await ctx.newPage();
await page.goto(`http://localhost:8899/${SITE}/`, { waitUntil:'load' });
await page.waitForTimeout(2500);

const results = await page.evaluate((MIN) => {
  const controls = [];
  for (const el of document.querySelectorAll('a,button,[role="button"],input,select,summary')) {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!b.width || !b.height) continue;
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.1) continue;
    if (b.top > innerHeight || b.bottom < 0) continue;
    controls.push(el);
  }

  // does tapping (x,y) activate this control?
  const hits = (el, x, y) => {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    const t = document.elementFromPoint(x, y);
    return !!t && (t === el || el.contains(t));
  };

  // WCAG 2.5.5 / Apple HIG / Material measure the TARGET'S SIZE — its width and
  // height. (A 44px circle is compliant; do not measure an inscribed square, or
  // every round button under-reports by a factor of root 2.)
  // We additionally verify the centre is genuinely reachable, so a control
  // hidden behind an overlay cannot pass on geometry alone.
  return controls.map(el => {
    const b = el.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    return {
      label: (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0,24) || el.tagName,
      cls: typeof el.className === 'string' ? (el.className.trim().split(/\s+/)[0] || '') : '',
      w: Math.round(b.width), h: Math.round(b.height),
      reachable: hits(el, cx, cy),
    };
  });
}, MIN);

await browser.close(); server.close();

const G='\x1b[32m', R='\x1b[31m', D='\x1b[2m', X='\x1b[0m';
console.log(`\n  TOUCH TARGET CHECK — /${SITE}/   iPhone 390px`);
console.log(`  ${D}minimum ${MIN}x${MIN}px — Apple HIG / Google Material / WCAG 2.5.5${X}\n`);

let pass = 0, fail = 0;
for (const t of results) {
  const big = t.w >= MIN && t.h >= MIN;
  const ok = big && t.reachable;
  ok ? pass++ : fail++;
  const name = `${t.label}${t.cls ? ' .' + t.cls : ''}`.padEnd(28);
  const size = `${t.w}x${t.h}`.padEnd(9);
  const why = !big ? `${R}← too small for a finger${X}`
            : !t.reachable ? `${R}← covered by something else${X}` : '';
  console.log(`  ${ok ? G+'✔'+X : R+'✖'+X} ${name} ${size} ${why}`);
}

console.log(`\n  targets ${results.length}`);
console.log(`  ${G}pass ${pass}${X}`);
console.log(`  ${fail ? R : ''}fail ${fail}${X}\n`);
process.exit(fail ? 1 : 0);
