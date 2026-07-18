import { chromium } from 'playwright';

const browser = await chromium.launch();

// full page desktop
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:4173/11-kowloon/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'shots/11-p2-full-desktop.png', fullPage: true });

  // hover a card
  const card = page.locator('.card').nth(1);
  await card.hover();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'shots/11-p2-card-hover.png' }).catch(()=>{});

  await page.close();
}

// full page mobile
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://localhost:4173/11-kowloon/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'shots/11-p2-full-mobile.png', fullPage: true });
  await page.close();
}

await browser.close();
console.log('done');
