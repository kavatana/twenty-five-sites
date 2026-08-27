import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const issues = [];
page.on('console', m => { if (m.type()==='error') issues.push(m.text()); });
page.on('pageerror', e => issues.push(e.message));
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const state = await page.evaluate(() => {
  const ambient = document.getElementById('ambient');
  const cursor = document.getElementById('cursor-dot');
  const vinePaths = [...document.querySelectorAll('.vine-path')].map(p => getComputedStyle(p).strokeDashoffset);
  const tips = document.querySelectorAll('.vine-tip').length;
  const hand = document.querySelector('#wheel .hand-g');
  const handAnim = hand ? getComputedStyle(hand).animationName : 'n/a';
  return {
    ambientInDOM: !!ambient,
    cursorDisplay: cursor ? getComputedStyle(cursor).display : 'n/a',
    vinePaths, tips, handAnim
  };
});
console.log(JSON.stringify(state, null, 2));
console.log('console/page issues:', issues);
await page.screenshot({ path: 'shots/10-p3-reduced.png' });
await browser.close();
