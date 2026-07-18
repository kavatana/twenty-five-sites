import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/18-verse/', { waitUntil: 'networkidle' });

async function shotAt(sel, name, wait=800){
  await page.evaluate((s)=>{ document.querySelector(s).scrollIntoView({behavior:'instant', block:'start'}); }, sel);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `shots/18v-${name}.png` });
}

await shotAt('#hero','hero-fresh', 500);
await shotAt('#m1','m1-gravity', 800);
await shotAt('#m2','m2-magnet', 800);
await shotAt('#m3','m3-assembly', 1500);
await shotAt('#m4','m4-erosion-top', 800);

// scroll deep into m4 (340vh track) to see erosion mid/late
await page.evaluate(() => {
  const m4 = document.querySelector('#m4');
  const top = m4.offsetTop;
  const height = m4.offsetHeight;
  window.scrollTo(0, top + height*0.5);
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/18v-m4-erosion-mid.png' });

await page.evaluate(() => {
  const m4 = document.querySelector('#m4');
  const top = m4.offsetTop;
  const height = m4.offsetHeight;
  window.scrollTo(0, top + height*0.9);
});
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/18v-m4-erosion-late.png' });

// footer
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/18v-footer.png' });

await browser.close();
console.log('done');
