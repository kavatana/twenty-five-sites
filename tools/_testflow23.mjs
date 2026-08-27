import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const issues = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') issues.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:4173/23-stillness/', { waitUntil: 'load' });
await page.waitForTimeout(300);

// freeze performance.now() fully under manual control for deterministic testing
await page.evaluate(() => {
  window.__offset = performance.now();
  performance.now = () => window.__offset;
});

async function jump(ms) {
  await page.evaluate((v) => { window.__offset += v; }, ms);
  await page.waitForTimeout(120); // let one real rAF frame paint with the new fake time
}

await page.click('button[data-min="3"]');
await page.waitForTimeout(150);
await page.screenshot({ path: 'shots/23-flow-01-inhale-start.png' });

await jump(2000); // 2s into inhale (of 4s)
await page.screenshot({ path: 'shots/23-flow-02-inhale-mid.png' });

await jump(4000); // now 6s total -> 2s into hold (4-11s)
await page.screenshot({ path: 'shots/23-flow-03-hold.png' });

await jump(6000); // now 12s total -> 1s into exhale (11-19s)
await page.screenshot({ path: 'shots/23-flow-04-exhale-start.png' });

await jump(6000); // now 18s total -> near end of exhale
await page.screenshot({ path: 'shots/23-flow-05-exhale-end.png' });

await jump(19000 * 2); // jump 2 more full cycles -> breath counter should read higher
await page.screenshot({ path: 'shots/23-flow-06-cycle3.png' });

await jump(180000); // push well past 3-minute session end -> should finish gracefully at next inhale boundary
await page.waitForTimeout(200);
await page.screenshot({ path: 'shots/23-flow-07-just-ended.png' });

await page.waitForTimeout(2200); // real time for particle dissolve + completion fade (uses CSS transitions, real clock)
await page.screenshot({ path: 'shots/23-flow-08-complete.png' });

await page.click('#chimeToggle');
await page.click('.pal-dot[data-set="sea"]');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/23-flow-09-sea-chimeon.png' });

await page.click('#beginAgain');
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/23-flow-10-idle-again.png' });

// mobile check of active state
await page.setViewportSize({ width: 390, height: 844 });
await page.click('button[data-min="1"]');
await jump(6000);
await page.waitForTimeout(150);
await page.screenshot({ path: 'shots/23-flow-11-mobile-hold.png' });

await browser.close();

if (issues.length) {
  console.log('ISSUES:');
  for (const i of [...new Set(issues)]) console.log('  ' + i);
} else {
  console.log('CLEAN');
}
