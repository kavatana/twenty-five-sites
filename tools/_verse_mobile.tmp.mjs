import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:4173/18-verse/', { waitUntil: 'networkidle' });

async function shotAt(sel, name, wait=800){
  await page.evaluate((s)=>{ document.querySelector(s).scrollIntoView({behavior:'instant', block:'start'}); }, sel);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `shots/18v-mobile-${name}.png` });
}

await shotAt('#m1','m1', 800);
await shotAt('#m2','m2', 800);
await shotAt('#m3','m3', 1500);
await shotAt('#m4','m4-top', 800);

await page.evaluate(() => {
  const m4 = document.querySelector('#m4');
  window.scrollTo(0, m4.offsetTop + m4.offsetHeight*0.5);
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/18v-mobile-m4-mid.png' });

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/18v-mobile-footer.png' });

console.log('ERRORS:', JSON.stringify(errors));
await browser.close();
