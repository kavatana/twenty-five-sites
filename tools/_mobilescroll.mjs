import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const height = await page.evaluate(() => document.body.scrollHeight);
const step = 800;
let y = 0, i = 0;
while (y < height) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/10-p3-mscroll-${String(i).padStart(2,'0')}.png` });
  y += step; i++;
}
await browser.close();
