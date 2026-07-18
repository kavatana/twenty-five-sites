import { chromium } from 'playwright';
const browser = await chromium.launch();
const url = 'http://localhost:4173/20-gatsby/';
async function run(vp, tag) {
  const page = await browser.newPage({ viewport: vp });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const H = await page.evaluate(() => document.body.scrollHeight);
  const steps = Math.ceil(H / vp.height);
  for (let i = 1; i < steps; i++) {
    await page.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), i * vp.height * 0.95);
    await page.waitForTimeout(i === steps - 1 ? 1600 : 1000);
    await page.screenshot({ path: `shots/20-scroll-${tag}-${i}.png` });
  }
  if (errs.length) console.log(tag, 'ERRORS:', errs.join(' | '));
  await page.close();
}
await run({ width: 1440, height: 900 }, 'd');
await run({ width: 390, height: 844 }, 'm');

// hover test on suite cards (desktop)
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('suites').scrollIntoView());
await page.waitForTimeout(900);
const card = await page.$('.suite-card:nth-child(1)');
await card.hover();
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/20-hover-suite1.png' });
await page.close();

await browser.close();
console.log('done');
