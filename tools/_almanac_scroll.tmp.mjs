import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/15-almanac/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const sections = ['#fig1', '#fig2', '#fig3', '#fig4', '.colophon-section'];
for (const sel of sections) {
  await page.evaluate((s) => { document.querySelector(s).scrollIntoView({block:'start'}); }, sel);
  await page.waitForTimeout(1200);
  const name = sel.replace(/[#.]/g,'');
  await page.screenshot({ path: `shots/15-scroll-${name}.png` });
}
await browser.close();
