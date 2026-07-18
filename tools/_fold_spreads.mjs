import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('shots/12-spreads', { recursive: true });
const browser = await chromium.launch();

async function capture(viewport, tag) {
  const page = await browser.newPage({ viewport });
  await page.goto('http://localhost:4173/12-fold/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const sections = await page.$$('section.spread');
  for (let i = 0; i < sections.length; i++) {
    await sections[i].scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `shots/12-spreads/${tag}-s${i + 1}.png` });
  }
  await page.close();
}

await capture({ width: 1440, height: 900 }, 'desk');
await capture({ width: 390, height: 844 }, 'mob');
await browser.close();
console.log('done');
