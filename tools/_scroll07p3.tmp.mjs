import { chromium } from 'playwright';
const browser = await chromium.launch();
const issues = [];
const out = '/Users/user/Vibe-Coding/25 2030_Website/shots/';
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') issues.push(m.text()); });
page.on('pageerror', (e) => issues.push(e.message));
await page.goto('http://localhost:4173/07-chromatic/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
for (const id of ['specs', 'pass', 'download', 'changelog']) {
  await page.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'start', behavior: 'instant' }), id);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: out + '07-p3-sec-' + id + '.png' });
}
const mp = await browser.newPage({ viewport: { width: 390, height: 844 } });
mp.on('console', (m) => { if (m.type() === 'error') issues.push('m: ' + m.text()); });
mp.on('pageerror', (e) => issues.push('m: ' + e.message));
await mp.goto('http://localhost:4173/07-chromatic/', { waitUntil: 'networkidle' });
await mp.waitForTimeout(1200);
for (const id of ['pass', 'changelog']) {
  await mp.evaluate((id) => document.getElementById(id).scrollIntoView({ block: 'start', behavior: 'instant' }), id);
  await mp.waitForTimeout(1300);
  await mp.screenshot({ path: out + '07-p3-msec-' + id + '.png' });
}
const gp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
gp.on('console', (m) => { if (m.type() === 'error') issues.push('g: ' + m.text()); });
gp.on('pageerror', (e) => issues.push('g: ' + e.message));
await gp.goto('http://localhost:4173/07-chromatic/guide/', { waitUntil: 'networkidle' });
await gp.waitForTimeout(1500);
await gp.screenshot({ path: out + '07-p3-guide.png' });
await browser.close();
console.log(issues.length ? 'ISSUES: ' + issues.join(' | ') : 'CLEAN');
