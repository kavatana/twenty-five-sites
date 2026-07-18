import { chromium } from 'playwright';
const browser = await chromium.launch();
const url = 'http://localhost:4173/14-noir/';
async function run(vp, tag, fracs) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  // scroll page so the lookbook section is centered in viewport
  await page.evaluate(() => {
    document.getElementById('sec-lookbook').scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(400);
  for (const f of fracs) {
    await page.evaluate((frac) => {
      const lb = document.getElementById('lookbook');
      lb.scrollLeft = (lb.scrollWidth - lb.clientWidth) * frac;
    }, f);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `shots/14-lb2-${tag}-${f}.png` });
  }
  await page.close();
}
await run({ width: 1440, height: 900 }, 'd', [0.5, 1]);
await run({ width: 390, height: 844 }, 'm', [0.5, 1]);
await browser.close();
console.log('done');
