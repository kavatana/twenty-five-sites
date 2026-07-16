// Scroll through the page at various fractions and screenshot each.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const [, , sitePath, outPrefix, viewportArg] = process.argv;
const url = `http://localhost:4173${sitePath}`;
mkdirSync(dirname(outPrefix), { recursive: true });
const viewport = viewportArg === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);

const scrollHeight = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
const fractions = [0, 0.08, 0.16, 0.24, 0.33, 0.42, 0.5, 0.58, 0.66, 0.75, 0.83, 0.92, 1.0];
for (const f of fractions) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(scrollHeight * f));
  await page.waitForTimeout(900);
  const tag = String(Math.round(f * 100)).padStart(3, '0');
  await page.screenshot({ path: `${outPrefix}-${tag}.png` });
}
await browser.close();
console.log('done, scrollHeight=', scrollHeight);
