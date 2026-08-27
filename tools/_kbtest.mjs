import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.querySelector('.packet').scrollIntoView());
await page.waitForTimeout(300);
// Tab to the first packet via keyboard focus
await page.evaluate(() => document.querySelector('.packet').focus());
await page.waitForTimeout(200);
let t1 = await page.evaluate(() => getComputedStyle(document.querySelector('.packet .packet-inner')).transform);
console.log('after focus:', t1);
await page.keyboard.press('Enter');
await page.waitForTimeout(1000);
let t2 = await page.evaluate(() => getComputedStyle(document.querySelector('.packet .packet-inner')).transform);
let cls = await page.evaluate(() => document.querySelector('.packet').className);
console.log('after Enter (expect flip back to front):', t2, cls);
await browser.close();
