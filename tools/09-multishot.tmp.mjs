// 09-multishot.mjs — click through all 4 formations and screenshot at desktop + mobile
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outDir = process.argv[2] || 'shots';
mkdirSync(outDir, { recursive: true });
const url = 'http://localhost:4173/09-corpus/';

const browser = await chromium.launch();

async function run(viewport, tag) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3200); // let spawn settle
  for (let f = 0; f < 4; f++) {
    await page.click(`.fbtn[data-f="${f}"]`);
    await page.waitForTimeout(2600); // let morph complete + settle
    await page.screenshot({ path: `${outDir}/09-multi-${tag}-f${f}.png` });
  }
  await page.close();
}

await run({ width: 1440, height: 900 }, 'desktop');
await run({ width: 390, height: 844 }, 'mobile');
await browser.close();
console.log('done');
