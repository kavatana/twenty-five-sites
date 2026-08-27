import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/10-p3-full-desktop.png', fullPage: true });
await page.close();

const page2 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page2.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page2.waitForTimeout(1500);
await page2.screenshot({ path: 'shots/10-p3-full-mobile.png', fullPage: true });
await page2.close();
await browser.close();
