import { chromium } from 'playwright';
const browser = await chromium.launch();
async function run(vp, tag, steps) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto('http://localhost:4173/07-chromatic/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const h = await page.evaluate(() => document.body.scrollHeight);
  console.log(tag, 'scrollHeight', h);
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round((h - vp.height) * (i / steps)));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `shots/07-scan-${tag}-${i}.png` });
  }
  await page.close();
}
await run({ width: 1440, height: 900 }, 'd', 5);
await run({ width: 390, height: 844 }, 'm', 5);
await browser.close();
