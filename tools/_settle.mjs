import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.evaluate(() => window.scrollTo(0, document.querySelector('#herbarium').offsetTop - 100));
await page.waitForTimeout(3500);
await page.screenshot({ path: 'shots/10-p3-herbarium-settled.png' });
await browser.close();
