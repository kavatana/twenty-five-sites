import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:4173/10-verdant/', { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
const info = await page.evaluate(() => {
  const out = {};
  for (const id of ['spec-yarrow','spec-poppy','spec-fern']) {
    const svg = document.getElementById(id);
    const paths = svg.querySelectorAll('path.draw');
    let maxDelay = 0, maxDur=0;
    paths.forEach(p=>{
      const dd = parseFloat(p.style.getPropertyValue('--dd'))||0;
      const dur = parseFloat(p.style.transitionDuration)||0;
      if (dd+dur > maxDelay+maxDur) { maxDelay=dd; maxDur=dur; }
    });
    out[id] = { count: paths.length, maxDelay, maxDur, totalFinish: maxDelay+maxDur };
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
