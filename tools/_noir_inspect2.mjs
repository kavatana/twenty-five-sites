import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/14-noir/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// scroll window to lookbook section, then pan the shelf
await page.evaluate(() => document.getElementById('sec-lookbook').scrollIntoView());
await page.waitForTimeout(300);
await page.evaluate(() => { document.getElementById('lookbook').scrollLeft = 900; });
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/14-inspect-lookbook2.png' });

// hover a look caption / link invert test isolated
await page.goto('http://localhost:4173/14-noir/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.getElementById('sec-footer').scrollIntoView());
await page.waitForTimeout(300);
const link = page.locator('.foot-nav a[href="guide/"]');
await link.hover();
await page.waitForTimeout(700);
const style = await link.evaluate((el) => {
  const after = getComputedStyle(el, '::after');
  return { transform: after.transform, bg: after.backgroundColor, mix: after.mixBlendMode };
});
console.log('link ::after style on hover:', style);
await page.screenshot({ path: 'shots/14-inspect-link-hover2.png' });

// check entrance: reload and screenshot at t=0 vs t=300ms vs t=1500ms
await page.goto('http://localhost:4173/14-noir/', { waitUntil: 'commit' });
await page.screenshot({ path: 'shots/14-inspect-t0.png' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/14-inspect-t1500.png' });

await browser.close();
