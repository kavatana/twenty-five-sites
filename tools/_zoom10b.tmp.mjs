import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(()=>{ document.querySelector('.specimen')?.scrollIntoView({block:'start'}); window.scrollBy(0,-150); });
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/10-p3-specimen-full.png' });
await browser.close();
