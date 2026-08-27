/**
 * makecards — renders on-screen text as transparent 1080x1920 PNGs for ffmpeg
 * overlay. (This ffmpeg build has no drawtext/libfreetype.)
 */
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = '/private/tmp/claude-501/-Users-user-Vibe-Coding-25-2030-Website/a78c2df3-6a3b-4bb9-948f-53434c20f5bd/scratchpad/cards';
fs.mkdirSync(OUT, { recursive: true });

const BASE = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1080px;height:1920px;background:transparent;
    font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;
    display:flex;flex-direction:column;}
  .hook{position:absolute;left:70px;right:70px;top:150px;
    font-weight:800;font-size:86px;line-height:1.02;letter-spacing:-.02em;
    text-transform:uppercase;color:#fff;
    text-shadow:0 4px 30px rgba(0,0,0,.85),0 0 70px rgba(0,0,0,.6);}
  .hook em{font-style:normal;color:#FF5A5A}
  .badge{position:absolute;left:70px;top:470px;
    font-size:24px;font-weight:700;letter-spacing:.22em;color:#fff;
    border:2px solid rgba(255,255,255,.75);border-radius:999px;
    padding:12px 26px;text-transform:uppercase;
    text-shadow:0 2px 12px rgba(0,0,0,.8);}
  .card{position:absolute;inset:0;background:rgba(10,14,28,.86);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:0 90px;gap:34px;}
  .card h1{font-size:78px;font-weight:800;line-height:1.05;color:#fff;
    text-transform:uppercase;letter-spacing:-.01em}
  .card .free{font-size:96px;font-weight:800;color:#E7B84F;text-transform:uppercase}
  .card .sub{font-size:38px;font-weight:600;color:rgba(255,255,255,.9);letter-spacing:.04em}
  .card .brand{position:absolute;bottom:150px;left:0;right:0;
    font-size:30px;font-weight:600;color:rgba(255,255,255,.72);letter-spacing:.02em}
`;

const cards = {
  'hook': `<div class="hook">This button is<br><em>9 pixels</em> wide.<br>Your finger is 44.</div>
           <div class="badge">AI-native workflow / 01</div>`,
  'missed': `<div class="hook">Aimed at it.<br><em>Missed.</em></div>`,
  'nine': `<div class="hook">Nine controls.<br><em>None</em> big enough<br>to press.</div>`,
  'cta': `<div class="card">
            <h1>Full fix &rarr; verify<br>session</h1>
            <div class="free">Free in ABC</div>
            <div class="sub">Link in first comment</div>
            <div class="brand">Not just offshore. A team. AI-native from day one.</div>
          </div>`,
  'fixed': `<div class="hook">Same dots.<br><em>Now tappable.</em></div>`,
  'skill': `<div class="card">
            <h1>Your value isn't<br>typing fast.</h1>
            <div class="sub">It's knowing 9 pixels is too small &mdash;<br>and catching when the agent is wrong.</div>
            <div class="brand">Not just offshore. A team. AI-native from day one.</div>
          </div>`,
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1080,height:1920}, deviceScaleFactor:1 });
const page = await ctx.newPage();
for (const [name, html] of Object.entries(cards)) {
  await page.setContent(`<style>${BASE}</style>${html}`);
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
  console.log('card →', name);
}
await browser.close();
