import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto('http://localhost:4173/12-fold/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/12-reduced.png' });
// check computed opacity of a mote element
const op = await page.$eval('.motes i', (el) => getComputedStyle(el).opacity);
console.log('mote opacity (reduced motion):', op);
await page.click('.curl');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/12-reduced-afterclick.png' });
console.log(JSON.stringify(logs));
await browser.close();
