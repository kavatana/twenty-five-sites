import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
const vals = await page.evaluate(() => {
  const grab = sel => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : 'MISSING'; };
  return {
    eyebrow: grab('.hero .eyebrow'),
    plateNo: grab('.plate-no'),
    creedCite: grab('.creed cite'),
    packetLatin: grab('.packet-latin'),
    specimenCommon: grab('.specimen-label .common'),
    closingMeta: grab('.closing-meta'),
  };
});
console.log(vals);
await browser.close();
