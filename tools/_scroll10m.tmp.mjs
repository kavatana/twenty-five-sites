import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const height = await page.evaluate(() => document.body.scrollHeight);
console.log('page height', height);
const steps = 8;
for (let i=0;i<steps;i++){
  const y = Math.round((height - 844) * (i/(steps-1)));
  await page.evaluate((y)=>window.scrollTo(0,y), y);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `shots/10-p3-mob-scroll-${i}.png` });
}
await browser.close();
