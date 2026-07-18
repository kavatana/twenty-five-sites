import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
for (let y=0; y<=3900; y+=300) {
  await page.evaluate((y)=> window.scrollTo(0,y), y);
  await page.waitForTimeout(200);
}
await page.waitForTimeout(3000);
await page.evaluate(()=> window.scrollTo(0, 3550));
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/10-p3-specimen-full4.png' });
await browser.close();
