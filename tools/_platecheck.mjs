import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const state = await page.evaluate(() => {
  const svg = document.getElementById('hero-plate');
  const drawn = svg.classList.contains('drawn');
  const paths = [...svg.querySelectorAll('.draw')];
  const offsets = paths.map(p => getComputedStyle(p).strokeDashoffset);
  const washes = [...svg.querySelectorAll('.wash')];
  const washOpacities = washes.map(w => getComputedStyle(w).opacity);
  return { drawn, total: paths.length, offsets, washCount: washes.length, washOpacities };
});
console.log(JSON.stringify(state, null, 2));
await browser.close();
