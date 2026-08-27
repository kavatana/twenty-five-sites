import { chromium } from 'playwright';

const dir = '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad';
const errors = [];
const browser = await chromium.launch();

// --- 1) desktop tilt test: capture at different cursor positions ---
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto('http://localhost:4173/12-fold/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.mouse.move(200, 450, { steps: 10 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/tilt-left.png` });

  await page.mouse.move(1240, 450, { steps: 20 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${dir}/tilt-right.png` });

  const tiltVal = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tiltX'));
  console.log('tiltX at right position:', tiltVal);

  // --- 2) Pip hover reaction ---
  await page.evaluate(() => document.querySelector('#s1').scrollIntoView({behavior:'instant', block:'start'}));
  await page.waitForTimeout(600);
  const pipBox = await page.locator('.pip-s1').boundingBox();
  await page.mouse.move(pipBox.x + pipBox.width/2, pipBox.y + pipBox.height/2, { steps: 5 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${dir}/pip-hover.png` });

  // --- 3) flower hover reaction ---
  await page.evaluate(() => document.querySelector('#s4').scrollIntoView({behavior:'instant', block:'start'}));
  await page.waitForTimeout(1200);
  const flowerBox = await page.locator('.f2 .head').boundingBox();
  await page.mouse.move(flowerBox.x + flowerBox.width/2, flowerBox.y + flowerBox.height/2, { steps: 5 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${dir}/flower-hover.png` });

  await page.close();
}

// --- 4) mobile: verify dc3 no longer collides with badge on spread II ---
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto('http://localhost:4173/12-fold/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#s2').scrollIntoView({behavior:'instant', block:'start'}));
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${dir}/mobile-s2-fixed.png` });
  await page.close();
}

console.log('ERRORS:', JSON.stringify(errors));
await browser.close();
