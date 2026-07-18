import { chromium } from 'playwright';
const browser = await chromium.launch();
const url = 'http://localhost:4173/10-verdant/';
async function run(vp, tag) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `shots/10-bottom-${tag}.png` });
  await page.close();
}
await run({ width: 1440, height: 900 }, 'd');
await run({ width: 390, height: 844 }, 'm');
await browser.close();
console.log('done');
