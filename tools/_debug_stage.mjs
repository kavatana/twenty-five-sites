import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
await page.goto('http://localhost:4173/19-hearth/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.addStyleTag({ content: `
  .scaler{ transform: scale(2) !important; }
  .stage{ height: 1900px !important; overflow: visible !important; }
  .face.top, .face.side { opacity: 0 !important; }
  .face.front { background: magenta !important; outline: 4px solid lime; }
  .tree, .lantern, .well { display:none !important; }
` });
await page.waitForTimeout(200);
await page.screenshot({ path: '/Users/user/Vibe-Coding/25 2030_Website/tools/_debug_zoom2.png', fullPage: true });
await browser.close();
