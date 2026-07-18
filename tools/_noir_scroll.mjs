import { chromium } from 'playwright';
const browser = await chromium.launch();
const url = 'http://localhost:4173/14-noir/';
async function run(vp, tag) {
  const page = await browser.newPage({ viewport: vp });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const H = await page.evaluate(() => document.body.scrollHeight);
  const steps = Math.ceil(H / vp.height);
  for (let i = 1; i < steps; i++) {
    await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), i * vp.height * 0.94);
    await page.waitForTimeout(i === steps - 1 ? 1400 : 900);
    await page.screenshot({ path: `shots/14-scroll-${tag}-${i}.png` });
  }
  // also scroll the horizontal lookbook shelf to the end for a mid-lookbook proof
  const lbBox = await page.evaluate(() => {
    const lb = document.getElementById('lookbook');
    if (!lb) return null;
    lb.scrollLeft = lb.scrollWidth * 0.4;
    return true;
  });
  if (lbBox) {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `shots/14-scroll-${tag}-lb-mid.png` });
  }
  if (errs.length) console.log(tag, 'ERRORS:', errs.join(' | '));
  await page.close();
}
await run({ width: 1440, height: 900 }, 'd');
await run({ width: 390, height: 844 }, 'm');
await browser.close();
console.log('done');
