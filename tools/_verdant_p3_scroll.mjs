import { chromium } from 'playwright';

const url = 'http://localhost:4173/10-verdant/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const issues = [];
page.on('console', (m) => { if (m.type()==='error'||m.type()==='warning') issues.push(`[console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const sections = ['#catalog', '#calendar', '#herbarium', 'footer'];
for (const sel of sections) {
  const el = await page.$(sel);
  if (!el) { console.log('missing', sel); continue; }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  const name = sel.replace('#','').replace(/[^a-z]/gi,'');
  await page.screenshot({ path: `/Users/user/Vibe-Coding/25 2030_Website/shots/10-p3-${name}.png` });
}

await page.close();
await browser.close();
if (issues.length) { console.log('ISSUES:'); for (const i of [...new Set(issues)]) console.log(' '+i); }
else console.log('CLEAN');
