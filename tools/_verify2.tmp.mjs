import { chromium } from 'playwright';

const dir = '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/12-fold/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);

// confirm the eye element's transform changes while :hover is active
const before = await page.evaluate(() => {
  const eye = document.querySelector('.pip-s1 .eye.l');
  return getComputedStyle(eye).transform;
});
console.log('eye transform before hover:', before);

const box = await page.locator('.pip-s1').boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + box.height*0.55, { steps: 8 });
await page.waitForTimeout(150);
const duringMid = await page.evaluate(() => {
  const eye = document.querySelector('.pip-s1 .eye.l');
  const smile = document.querySelector('.pip-s1 .smile');
  const matched = document.querySelector('.pip-s1').matches(':hover');
  return { eyeTransform: getComputedStyle(eye).transform, smileWidth: getComputedStyle(smile).width, hoverMatch: matched };
});
console.log('during hover (150ms):', JSON.stringify(duringMid));
await page.screenshot({ path: `${dir}/pip-hover2.png` });

await page.waitForTimeout(150);
const duringLate = await page.evaluate(() => {
  const smile = document.querySelector('.pip-s1 .smile');
  return { smileWidth: getComputedStyle(smile).width };
});
console.log('during hover (300ms):', JSON.stringify(duringLate));
await page.screenshot({ path: `${dir}/pip-hover3.png` });

await browser.close();
