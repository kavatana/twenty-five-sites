import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const issues = [];
page.on('console', (m) => { if (m.type()==='error'||m.type()==='warning') issues.push(`[console.${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const height = await page.evaluate(() => document.body.scrollHeight);
console.log('page height', height);
const steps = 6;
for (let i=0;i<steps;i++){
  const y = Math.round((height - 900) * (i/(steps-1)));
  await page.evaluate((y)=>window.scrollTo(0,y), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `shots/10-p3-scroll-${i}.png` });
}
console.log('issues', issues);
await browser.close();
