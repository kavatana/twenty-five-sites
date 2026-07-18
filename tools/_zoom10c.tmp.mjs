import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(()=> window.scrollTo(0, 3750));
await page.waitForTimeout(700);
await page.screenshot({ path: 'shots/10-p3-specimen-full2.png' });
await browser.close();
