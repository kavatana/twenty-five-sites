import { chromium } from 'playwright';
const browser = await chromium.launch();

async function run(viewport, tag) {
  const page = await browser.newPage({ viewport });
  const msgs = [];
  page.on('console', m => { if (m.type()==='error' || m.type()==='warning') msgs.push(`[${m.type()}] `+m.text()); });
  page.on('pageerror', e => msgs.push('pageerror: '+e.message));
  await page.goto('http://localhost:4173/01-aurelia/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const sections = ['#compositions', '#accords', '#maison', 'footer'];
  for (const sel of sections) {
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    }, sel);
    await page.waitForTimeout(900);
    const name = sel.replace(/[^a-z]/gi,'');
    await page.screenshot({ path: `shots/01-p3-scroll-${tag}-${name}.png` });
  }
  console.log(tag, 'console issues:', msgs);
  await page.close();
}

await run({ width: 1440, height: 900 }, 'desktop');
await run({ width: 390, height: 844 }, 'mobile');
await browser.close();
