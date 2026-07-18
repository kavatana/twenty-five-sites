// Shots of specific formation states + guide page for 09-corpus.
import { chromium } from 'playwright';

const base = 'http://localhost:4173/09-corpus/';
const out = process.argv[2] || 'shots/09-p3';
const browser = await chromium.launch();
const issues = [];

async function shoot(viewport, key, suffix, settle = 4200) {
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`[console.${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));
  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  if (key) await page.keyboard.press(key);
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${out}-${suffix}.png` });
  await page.close();
}

await shoot({ width: 1440, height: 900 }, '4', 'sigil');
await shoot({ width: 1440, height: 900 }, '3', 'lattice');
await shoot({ width: 390, height: 844 }, '4', 'sigil-mobile');

// guide page
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') issues.push(`[console.${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));
await page.goto(base + 'guide/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}-guide.png`, fullPage: true });
const mp = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mp.goto(base + 'guide/', { waitUntil: 'networkidle', timeout: 30000 });
await mp.waitForTimeout(1500);
await mp.screenshot({ path: `${out}-guide-mobile.png`, fullPage: true });

await browser.close();
console.log(issues.length ? 'ISSUES:\n' + [...new Set(issues)].join('\n') : 'CLEAN');
