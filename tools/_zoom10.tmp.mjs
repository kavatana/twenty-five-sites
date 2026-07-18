import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const el = await page.$('.herbarium, #herbarium, [class*=herbarium]');
const box = await page.evaluate(() => {
  const specs = document.querySelectorAll('.specimen');
  if (!specs.length) return null;
  const r = specs[0].getBoundingClientRect();
  return {x:r.x,y:r.y,w:r.width,h:r.height, top: window.scrollY};
});
console.log(box);
await page.evaluate(()=>{ document.querySelector('.specimen')?.scrollIntoView({block:'center'}); });
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/10-p3-specimen-zoom.png', clip: {x: 100, y: 300, width: 500, height: 700} });
await browser.close();
