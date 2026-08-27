import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/12-fold/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const dir = '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad';

for (const sel of ['#s2','#s3','#s4','#s5']) {
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({behavior:'instant', block:'start'}), sel);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${dir}/mobile-${sel.slice(1)}.png` });
}

console.log('ERRORS:', JSON.stringify(errors));
await browser.close();
