import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const url = 'http://localhost:4173/17-reverie/';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const sections = ['#found', '#stairs', '#rooms', '#checkin', '.site-foot'];
for (const sel of sections) {
  await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (el) el.scrollIntoView({ block: 'center' });
  }, sel);
  await page.waitForTimeout(900);
  const name = sel.replace('#', '').replace('.', '');
  await page.screenshot({ path: `shots/17-p2-scroll-${name}.png` });
}

// hover states
await page.evaluate(() => document.querySelector('#rooms').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(300);
const card = await page.$('.room-card.r2');
if (card) {
  const box = await card.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/17-p2-hover-room.png' });
}

await page.evaluate(() => document.querySelector('#checkin').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(300);
const dial = await page.$('#dialFace');
if (dial) {
  const box = await dial.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/17-p2-hover-dial.png' });
}

const btn = await page.$('.checkin-btn');
if (btn) {
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/17-p2-hover-btn.png' });
}

// mobile full-page
const mpage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mpage.goto(url, { waitUntil: 'networkidle' });
await mpage.waitForTimeout(1000);
await mpage.screenshot({ path: 'shots/17-p2-mobile-full.png', fullPage: true });

await browser.close();
console.log('done');
