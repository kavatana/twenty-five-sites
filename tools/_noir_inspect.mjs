import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const issues = [];
page.on('console', (m) => { if (m.type() === 'error') issues.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));
await page.goto('http://localhost:4173/14-noir/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

await page.screenshot({ path: 'shots/14-inspect-full-desktop.png', fullPage: true });

// scroll to lookbook mid
await page.evaluate(() => {
  document.getElementById('lookbook').scrollLeft = 700;
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/14-inspect-lookbook.png' });

// scroll to manifesto
await page.evaluate(() => document.getElementById('sec-manifesto').scrollIntoView());
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/14-inspect-manifesto.png' });

// scroll to footer
await page.evaluate(() => document.getElementById('sec-footer').scrollIntoView());
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/14-inspect-footer.png' });

// hover a look
await page.evaluate(() => document.getElementById('lookbook').scrollTo({left:0}));
await page.waitForTimeout(300);
await page.hover('.foot-nav a[href="guide/"]');
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/14-inspect-link-hover.png' });

console.log('issues:', issues);
await browser.close();
