import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(e.message));
await page.goto('http://localhost:4173/06-descent/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// scroll to jelly encounter
await page.evaluate(() => {
  const el = document.querySelector('.jelly').closest('section');
  window.scrollTo(0, el.offsetTop + el.offsetHeight / 2 - innerHeight / 2);
});
await page.waitForTimeout(1600);
// move mouse (lamp) then fire the alarm burst
await page.mouse.move(500, 450);
await page.waitForTimeout(600);
await page.mouse.click(410, 470); // on the jelly bell
await page.waitForTimeout(650);   // mid-burst
await page.screenshot({ path: 'shots/06-p2v2-burst.png' });

// parallax var present?
const par = await page.evaluate(() =>
  [...document.querySelectorAll('.ghost-num')].map((g) => g.style.getPropertyValue('--par')).filter(Boolean).length
);

// trieste morse
await page.evaluate(() => {
  const el = document.querySelector('.trieste').closest('section');
  window.scrollTo(0, el.offsetTop + el.offsetHeight / 2 - innerHeight / 2);
});
await page.waitForTimeout(1500);
const box = await page.locator('.trieste').boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/06-p2v2-morse.png' });

// ascent streaks: click return to surface, capture mid-flight
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(1200);
await page.locator('#ascend').click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/06-p2v2-ascent.png' });

console.log('parallaxed ghosts:', par, '| errors:', errs.length ? errs : 'none');
await browser.close();
