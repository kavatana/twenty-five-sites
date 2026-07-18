import { chromium } from 'playwright';

const browser = await chromium.launch();
const issues = [];

// 1. Heat soak test — check for the buffer-accumulation bug
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') issues.push(`[console] ${m.text()}`); });
  page.on('pageerror', e => issues.push(`[pageerror] ${e.message}`));
  await page.goto('http://localhost:4173/21-vapor/', { waitUntil: 'networkidle' });
  await page.click('button[data-mode="heat"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad/vapor-heat-early.png' });
  await page.waitForTimeout(7000);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad/vapor-heat-late.png' });
  await page.close();
}

// 2. Reduced motion path
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') issues.push(`[console-reduced] ${m.text()}`); });
  page.on('pageerror', e => issues.push(`[pageerror-reduced] ${e.message}`));
  await page.goto('http://localhost:4173/21-vapor/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad/vapor-reduced-a.png' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad/vapor-reduced-b.png' });
  await page.click('button[data-mode="heat"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad/vapor-reduced-heat.png' });
  await ctx.close();
}

// 3. Guide page
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { if (m.type() === 'error') issues.push(`[console-guide] ${m.text()}`); });
  page.on('pageerror', e => issues.push(`[pageerror-guide] ${e.message}`));
  await page.goto('http://localhost:4173/21-vapor/guide/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/ac7140fd-2d0f-4dc1-ad9e-2f07ababb55a/scratchpad/vapor-guide.png', fullPage: true });
  await page.close();
}

await browser.close();
console.log(issues.length ? 'ISSUES:\n' + issues.join('\n') : 'CLEAN');
