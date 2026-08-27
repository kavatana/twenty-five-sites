import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/15-almanac/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.evaluate(() => { document.querySelector('#fig4').scrollIntoView({block:'start'}); });
for (let i=0;i<5;i++){
  await page.waitForTimeout(700);
  const state = await page.evaluate(() => {
    const photon = document.querySelector('.photon');
    const rings = Array.from(document.querySelectorAll('.tring')).map(r => ({r: r.getAttribute('r'), lit: r.classList.contains('lit')}));
    return { cy: photon.getAttribute('cy'), rings };
  });
  console.log(JSON.stringify(state));
}
await browser.close();
