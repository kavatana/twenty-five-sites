import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const url = 'http://localhost:4173/17-reverie/';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const sections = ['.note-card', '#found', '#stairs', '#rooms', '#checkin', '.site-foot'];
for (const sel of sections) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.scrollIntoView({ block: 'center' });
  }, sel);
  await page.waitForTimeout(700);
  const name = sel.replace('#', '').replace('.', '');
  await page.screenshot({ path: `shots/17-p2-m-${name}.png` });
}

await browser.close();
console.log('done');
