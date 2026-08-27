import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outDir = 'shots/24-rooms';
mkdirSync(outDir, { recursive: true });

const rooms = ['room-entrance','room-rotary','room-typewriter','room-modem','room-degauss','room-projector','room-telegraph','room-shop'];

const browser = await chromium.launch();
const issues = [];

async function run(viewport, tag) {
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => { if (m.type()==='error'||m.type()==='warning') issues.push(`[${tag} console.${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => issues.push(`[${tag} pageerror] ${e.message}`));
  await page.goto('http://localhost:4173/24-relic/', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  for (const id of rooms) {
    await page.evaluate((rid) => {
      document.getElementById(rid).scrollIntoView({ behavior: 'auto', inline: 'start', block: 'start' });
    }, id);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${outDir}/${tag}-${id}.png`, animations: 'disabled' });
  }
  await page.close();
}

await run({ width: 1440, height: 900 }, 'desktop');
await run({ width: 390, height: 844 }, 'mobile');
await browser.close();

if (issues.length) {
  console.log('ISSUES:');
  for (const i of [...new Set(issues)]) console.log('  ' + i);
} else {
  console.log('CLEAN');
}
