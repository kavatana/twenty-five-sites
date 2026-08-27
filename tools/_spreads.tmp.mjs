import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4173/12-fold/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const dir = '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad';

for (const sel of ['#s1','#s2','#s3','#s4','#s5']) {
  await page.evaluate((s) => document.querySelector(s).scrollIntoView({behavior:'instant', block:'start'}), sel);
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${dir}/spread-${sel.slice(1)}.png` });
}

// hover test on sun dangle
await page.evaluate(() => document.querySelector('#s1').scrollIntoView({behavior:'instant', block:'start'}));
await page.waitForTimeout(800);
const box = await page.locator('.sunrig .dangle').boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
await page.waitForTimeout(300);
await page.screenshot({ path: `${dir}/hover-sun.png` });

// curl click test
await page.click('.curl', { force: true });
await page.waitForTimeout(400);
await page.screenshot({ path: `${dir}/curl-click.png` });

console.log('ERRORS:', JSON.stringify(errors));
await browser.close();
