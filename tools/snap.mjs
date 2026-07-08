#!/usr/bin/env node
// snap.mjs — screenshot + console-error harness for iteration passes.
// Usage: node tools/snap.mjs <path> <outPrefix> [waitMs]
//   <path>      site path on the local server, e.g. /01-aurelia/
//   <outPrefix> output prefix, e.g. shots/01-pass1  → 01-pass1-desktop.png etc.
//   [waitMs]    extra settle time after load (default 2500; animations need it)
// Emits: <prefix>-desktop.png (1440x900), <prefix>-desktop-late.png (t+3s),
//        <prefix>-mobile.png (390x844), plus console/page errors on stdout.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const [, , sitePath, outPrefix, waitArg] = process.argv;
if (!sitePath || !outPrefix) {
  console.error('usage: node tools/snap.mjs <path> <outPrefix> [waitMs]');
  process.exit(2);
}
const wait = Number(waitArg ?? 2500);
const url = `http://localhost:4173${sitePath}`;
mkdirSync(dirname(outPrefix), { recursive: true });

const browser = await chromium.launch();
const issues = [];
async function shoot(viewport, suffix, extraWait = 0) {
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning')
      issues.push(`[console.${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => issues.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => {
    const f = r.failure()?.errorText ?? '';
    if (!f.includes('ERR_ABORTED')) issues.push(`[requestfailed] ${r.url()} ${f}`);
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  } catch {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch((e) =>
      issues.push(`[nav] ${e.message}`)
    );
  }
  await page.waitForTimeout(wait + extraWait);
  await page.screenshot({ path: `${outPrefix}-${suffix}.png` });
  await page.close();
}

await shoot({ width: 1440, height: 900 }, 'desktop');
await shoot({ width: 1440, height: 900 }, 'desktop-late', 3000);
await shoot({ width: 390, height: 844 }, 'mobile');
await browser.close();

if (issues.length) {
  console.log('ISSUES:');
  for (const i of [...new Set(issues)]) console.log('  ' + i);
  process.exit(1);
} else {
  console.log('CLEAN: no console errors, page errors, or failed requests.');
}
