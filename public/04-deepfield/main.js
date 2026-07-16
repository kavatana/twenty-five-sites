/* DEEPFIELD STATION — console engine. One rAF drives everything. */
(() => {
'use strict';

const $ = (id) => document.getElementById(id);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 980px)').matches;
const COARSE = matchMedia('(pointer: coarse)').matches;

/* touch rigs get touch language — "click" reads wrong under a thumb */
{ const h = $('m-hint'); if (h) h.textContent = COARSE ? 'TAP FIELD TO POINT DISH' : 'CLICK FIELD TO POINT DISH'; }

/* ── seeded PRNG (mulberry32) ──────────────────────────────────────── */
function mulberry32(seed){
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const easeIO = (t) => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
const lerp = (a, b, t) => a + (b - a) * t;
const pad = (n, w) => String(Math.floor(Math.abs(n))).padStart(w, '0');

/* ── palette (mirrors CSS vars; canvas needs raw values) ───────────── */
const GREEN = [51, 255, 102], AMBER = [255, 176, 0];
let alertMix = 0;               // 0 = phosphor, 1 = amber
const tint = (a, boost = 0) => {
  const r = lerp(GREEN[0], AMBER[0], alertMix) + boost;
  const g = lerp(GREEN[1], AMBER[1], alertMix) + boost;
  const b = lerp(GREEN[2], AMBER[2], alertMix) + boost;
  return (al) => `rgba(${r|0},${g|0},${b|0},${al})`;
};

/* ── catalog ───────────────────────────────────────────────────────── */
const CATALOG = {
  ANDROMEDA: { name:'M31',      full:'M31 · NGC 224 · ANDROMEDA', ra: 0.7122, dec:  41.27, fx:.70, fy:.30 },
  M31:       null, // alias, filled below
  CRAB:      { name:'M1',       full:'M1 · SN 1054 REMNANT',      ra: 5.5755, dec:  22.01, fx:.24, fy:.60 },
  VEGA:      { name:'VEGA',     full:'ALPHA LYR · MAG 0.03',      ra:18.6156, dec:  38.78, fx:.47, fy:.16 },
  ANOMALY:   { name:'DF-1978A', full:'DF-1978A · UNCATALOGUED',   ra:17.7614, dec: -29.01, fx:.62, fy:.72 },
};
CATALOG.M31 = CATALOG.ANDROMEDA;

/* ── global console clock (pauses when tab hidden) ─────────────────── */
let conT = 0;                    // seconds since console-on
let running = false;

/* ══ STARFIELD ══════════════════════════════════════════════════════ */
const sky = $('sky');
const ctx = sky.getContext('2d');
let cols = 0, rows = 0, cw = 8, ch = 15, stars = [], grat = [];

const ret = {                    // reticle state
  fx:.70, fy:.30, fromX:.70, fromY:.30, toX:.70, toY:.30,
  ra:.7122, dec:41.27, fromRa:.7122, fromDec:41.27, toRa:.7122, toDec:41.27,
  t0:-9, dur:6, tgt:CATALOG.ANDROMEDA, slewing:false,
};

function buildSky(){
  const hold = sky.parentElement;
  const w = hold.clientWidth, h = hold.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  sky.width = Math.round(w * dpr); sky.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const fs = MOBILE ? 13 : 15;
  ctx.font = `${fs}px VT323, monospace`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  cw = Math.max(6, ctx.measureText('M').width);
  ch = fs;
  cols = Math.floor(w / cw); rows = Math.floor(h / ch);
  const rnd = mulberry32(1978);
  // dense unresolved background field — this is a DEEP field survey, the
  // glyph grid should read as thousands of faint sources, not a dozen dots.
  const n = Math.floor(cols * rows / (MOBILE ? 9.5 : 6.5));
  stars = [];
  for (let i = 0; i < n; i++){
    const t = rnd();
    stars.push({
      x: rnd() * cols, y: rnd() * rows,
      // pyramid distribution: mostly unresolved haze (0), fewer catalogued
      // points (1), rarer bright ones (2), the odd landmark source (3)
      tier: t > .99 ? 3 : t > .93 ? 2 : t > .62 ? 1 : 0,
      ph: rnd() * Math.PI * 2, sp: .3 + rnd() * 1.4,
    });
  }
  // faint RA/DEC graticule — instrument-grade grid under the field
  grat = [];
  const gcols = MOBILE ? 3 : 5, grows = MOBILE ? 3 : 4;
  for (let i = 1; i < gcols; i++) grat.push({ v:true, at: Math.round(cols * i / gcols) });
  for (let j = 1; j < grows; j++) grat.push({ v:false, at: Math.round(rows * j / grows) });
}

function slewTo(tgt, dur = 7){
  ret.fromX = ret.fx; ret.fromY = ret.fy; ret.toX = tgt.fx; ret.toY = tgt.fy;
  ret.fromRa = ret.ra; ret.fromDec = ret.dec; ret.toRa = tgt.ra; ret.toDec = tgt.dec;
  ret.t0 = conT; ret.dur = RM ? .01 : dur; ret.tgt = tgt; ret.slewing = true;
}

function fmtRA(h){
  h = ((h % 24) + 24) % 24;
  const hh = Math.floor(h), m = (h - hh) * 60, mm = Math.floor(m), ss = Math.floor((m - mm) * 60);
  return `${pad(hh,2)}h${pad(mm,2)}m${pad(ss,2)}s`;
}
function fmtDEC(d){
  const s = d < 0 ? '−' : '+', a = Math.abs(d);
  return `${s}${pad(a,2)}°${pad((a - Math.floor(a)) * 60, 2)}′`;
}

/* ── click-to-point: the operator can aim the dish directly at the field ─ */
let hover = null;                // {fx,fy} while the pointer sits over the map
function hoverFromEvent(e){
  const r = sky.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
  if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
  return { fx, fy };
}
function fieldRADEC(fx, fy){                       // flavor mapping, not real astrometry
  return { ra: (fx * 23.9 + 0.15) % 24, dec: 68 - fy * 116 };
}
function slewToPoint(fx, fy){
  if (body.classList.contains('alert')) return;    // don't fight the alarm's own slew
  const { ra, dec } = fieldRADEC(fx, fy);
  const tgt = { name:'MANUAL', full:`MANUAL POINT · ${fmtRA(ra)} ${fmtDEC(dec)}`, ra, dec, fx, fy };
  const az0 = (190 + ret.fx*60).toFixed(1), az1 = (190 + fx*60).toFixed(1);
  const el0 = (63 - ret.fy*35).toFixed(1), el1 = (63 - fy*35).toFixed(1);
  slewTo(tgt, 5);
  $('m-tgt').textContent = 'MANUAL';
  $('m-mode').textContent = 'SLEW';
  log('TRACK', `OPERATOR SLEW: AZ ${az0} → ${az1} · EL ${el0} → ${el1}. MANUAL POINT.`);
  userBusyUntil = conT + 25;
}
sky.addEventListener('mousemove', (e) => { hover = hoverFromEvent(e); });
sky.addEventListener('mouseleave', () => { hover = null; });
sky.addEventListener('click', (e) => {
  const h = hoverFromEvent(e);
  if (h) slewToPoint(h.fx, h.fy);
});

const STAR_CHARS = [['.','.','.'], ['·','·','.'], ['+','·','+'], ['*','+','*']];
const STAR_ALPHA = [.16, .32, .58, .95];
const STAR_TWINKLE = [.12, .35, .55, .55];

function drawSky(t){
  const w = sky.width / Math.min(devicePixelRatio||1,2);
  const h = sky.height / Math.min(devicePixelRatio||1,2);
  ctx.clearRect(0, 0, w, h);
  const c = tint();

  // slow field drift — the sky never stops
  const drift = RM ? 0 : t * .22;

  // instrument graticule, under everything — barely-there grid so the field
  // reads as surveyed space, not a random scatter
  ctx.fillStyle = c(.05);
  for (const g of grat){
    if (g.v){ for (let y = 0; y < rows; y += 2) ctx.fillText(':', g.at * cw + cw/2, y * ch + ch/2); }
    else{ for (let x = 0; x < cols; x += 2) ctx.fillText('·', x * cw + cw/2, g.at * ch + ch/2); }
  }

  for (const s of stars){
    const amp = STAR_TWINKLE[s.tier];
    const tw = RM ? .75 : .5 + .5 * Math.sin(t * s.sp + s.ph);
    const gx = (s.x - drift % cols + cols) % cols;
    const px = gx * cw + cw/2, py = s.y * ch + ch/2;
    const set = STAR_CHARS[s.tier];
    const chr = set[tw > .7 ? 0 : tw > .35 ? 1 : 2];
    const al = STAR_ALPHA[s.tier] * (1 - amp + amp * tw);
    ctx.fillStyle = c(al);
    ctx.fillText(chr, px, py);
  }

  // reticle slew
  let k = Math.min(1, (t - ret.t0) / ret.dur);
  if (k >= 1 && ret.slewing){ ret.slewing = false; onSlewDone(); }
  const e = easeIO(Math.max(0, k));
  ret.fx = lerp(ret.fromX, ret.toX, e); ret.fy = lerp(ret.fromY, ret.toY, e);
  ret.ra = lerp(ret.fromRa, ret.toRa, e); ret.dec = lerp(ret.fromDec, ret.toDec, e);

  const cx = Math.round(ret.fx * cols), cy = Math.round(ret.fy * rows);
  // idle guide dither — while tracking (not slewing) the sensor head never
  // sits dead still: a small continuous sub-cell nudge, same texture as the
  // GUIDE DRIFT telemetry reading. Rails stay on the fixed instrument grid;
  // only the live crosshair/brackets/label ride the jitter.
  const idle = !RM && !ret.slewing;
  const jx = idle ? Math.sin(t*.6)*2.2 + Math.sin(t*1.7+1.1)*1.1 : 0;
  const jy = idle ? Math.sin(t*.8+.4)*1.6 + Math.sin(t*2.1+2.3)*.8 : 0;
  const pcx = cx * cw + cw/2 + jx, pcy = cy * ch + ch/2 + jy;
  const rc = tint(30);

  // crosshair rails with a gap around center
  ctx.fillStyle = rc(.5);
  for (let x = 0; x < cols; x++)
    if (Math.abs(x - cx) > 4) ctx.fillText('─', x * cw + cw/2, pcy);
  for (let y = 0; y < rows; y++)
    if (Math.abs(y - cy) > 2) ctx.fillText('│', pcx, y * ch + ch/2);

  // corner brackets + center
  ctx.fillStyle = rc(.95);
  ctx.fillText('┌', pcx - 3*cw, pcy - 2*ch); ctx.fillText('┐', pcx + 3*cw, pcy - 2*ch);
  ctx.fillText('└', pcx - 3*cw, pcy + 2*ch); ctx.fillText('┘', pcx + 3*cw, pcy + 2*ch);
  const pulse = RM ? 1 : .6 + .4 * Math.sin(t * 3.1);
  ctx.fillStyle = rc(pulse);
  ctx.fillText('+', pcx, pcy);

  // label
  ctx.textAlign = 'left';
  ctx.fillStyle = rc(.9);
  ctx.fillText(`${ret.slewing ? 'SLEW' : 'TRK'} ${ret.tgt.name}`, pcx + 4*cw, pcy - 2*ch);
  ctx.textAlign = 'center';

  // anomaly beacon during alert
  if (alertMix > .04){
    const a = CATALOG.ANOMALY;
    const ax = a.fx * cols * cw + cw/2, ay = a.fy * rows * ch + ch/2;
    const ph = RM ? 1 : (t * 2.4) % 1;
    ctx.fillStyle = `rgba(255,176,0,${(.95 - ph * .6) * alertMix})`;
    ctx.fillText(['·','+','*','#'][Math.floor((RM ? 2 : t * 6) % 4)], ax, ay);
    ctx.strokeStyle = `rgba(255,176,0,${(.6 - ph * .55) * alertMix})`;
    ctx.beginPath(); ctx.arc(ax, ay, 6 + ph * 26, 0, 7); ctx.stroke();
  }

  // point-and-click targeting preview — invites the cursor onto the field.
  // suppressed when it would sit on top of the live reticle (e.g. right
  // after a slew lands where the cursor is already resting).
  const hoverNearLive = hover && Math.hypot(hover.fx*cols - cx, hover.fy*rows - cy) < 3;
  if (hover && !hoverNearLive && alertMix < .5){
    const hpx = hover.fx * cols * cw, hpy = hover.fy * rows * ch;
    const hc = tint();
    ctx.strokeStyle = hc(.42);
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(hpx - 2.4*cw, hpy - 1.4*ch, 4.8*cw, 2.8*ch);
    ctx.setLineDash([]);
    ctx.fillStyle = hc(.6);
    ctx.textAlign = 'left';
    ctx.fillText('CLICK TO SLEW', hpx + 2.8*cw, hpy + 1.9*ch);
    ctx.textAlign = 'center';
  }
}

function onSlewDone(){
  log('TRACK', `SLEW COMPLETE. ${ret.tgt.name} CENTERED. GUIDE STAR LOCKED.`);
  $('m-mode').textContent = 'TRK';
}

/* ══ TELEMETRY ══════════════════════════════════════════════════════ */
let photons = 8146902331;
let rate = 1240, rateMul = 1, drift = .0042, snr = 12.4;
const sparkHist = new Array(34).fill(.3);
const BLOCKS = '▁▂▃▄▅▆▇█';
let telClock = 0, sparkClock = 0;

function tickTelemetry(dt, t){
  rateMul += ((body.classList.contains('alert') ? 5.12 : 1) - rateMul) * Math.min(1, dt * 1.4);
  const jitter = 1 + .06 * Math.sin(t * 1.7) + .04 * Math.sin(t * 4.3 + 1);
  rate = 1240 * rateMul * jitter;
  photons += rate * dt;

  telClock += dt;
  if (telClock < (RM ? 1 : .12)) return;
  telClock = 0;

  $('t-count').textContent = Math.floor(photons).toLocaleString('en-US');
  $('t-rate').textContent = Math.round(rate).toLocaleString('en-US');
  $('t-az').textContent = (190 + ret.fx * 60).toFixed(3);
  $('t-el').textContent = (63 - ret.fy * 35).toFixed(3);
  drift = Math.max(-.02, Math.min(.02, drift + (Math.random() - .5) * .0016));
  $('t-drift').textContent = (drift >= 0 ? '+' : '−') + Math.abs(drift).toFixed(4);
  $('t-temp').textContent = (6.02 + Math.sin(t * .21) * .013).toFixed(2);
  $('t-bus').textContent = (28.4 + Math.sin(t * .43 + 2) * .06).toFixed(1);
  snr += ((body.classList.contains('alert') ? 31.7 : 12.4) - snr) * .08 + (Math.random() - .5) * .3;
  $('t-snr').textContent = snr.toFixed(1);
  const fill = Math.max(0, Math.min(1, snr / 40));
  const cells = 22, on = Math.round(fill * cells);
  $('t-snrbar').textContent = ' [' + '█'.repeat(on) + '░'.repeat(cells - on) + '] /40';

  sparkClock += 1;
  if (sparkClock >= (RM ? 1 : 3)){
    sparkClock = 0;
    sparkHist.push(Math.max(0, Math.min(1, (rate / 1240 - .8) / 5)));
    sparkHist.shift();
    $('t-spark').textContent = ' ' + sparkHist.map(v => BLOCKS[Math.min(7, Math.floor(v * 8))]).join('');
  }
}

/* ══ CLOCKS ═════════════════════════════════════════════════════════ */
const MET0 = (73 * 86400) + (14 * 3600) + (22 * 60) + 7; // 073:14:22:07 at console-on
let clockAcc = 1;
function tickClocks(dt){
  clockAcc += dt;
  if (clockAcc < 1) return;
  clockAcc = 0;
  const d = new Date();
  $('utc').textContent = `${pad(d.getUTCHours(),2)}:${pad(d.getUTCMinutes(),2)}:${pad(d.getUTCSeconds(),2)}`;
  $('met').textContent = fmtMET(MET0 + conT);
}
function fmtMET(s){
  return `${pad(s/86400,3)}:${pad((s%86400)/3600,2)}:${pad((s%3600)/60,2)}:${pad(s%60,2)}`;
}

/* ══ EVENT LOG ══════════════════════════════════════════════════════ */
const logEl = $('log');
function log(who, msg, hot = false){
  const row = document.createElement('div');
  row.className = 'll' + (hot ? ' hot' : '');
  row.innerHTML = `<span class="met">${fmtMET(MET0 + conT).slice(0,9)}</span><span class="who">${who}</span><span class="msg"></span>`;
  row.querySelector('.msg').textContent = msg;
  logEl.appendChild(row);
  while (logEl.children.length > 40) logEl.removeChild(logEl.firstChild);
}

const AMBIENT = [
  ['TRACK','GUIDE STAR STEADY. DRIFT INSIDE BOX.'],
  ['SYS','CRYO LOOP B HOLDING 6.0 K. NO EXCURSIONS.'],
  ['CAPCOM','DEEPFIELD, HOUSTON. READBACK CORRECT.'],
  ['SYS','TAPE DECK 2 AT 41 PCT. CHANGE-OUT AT 0800 LOCAL.'],
  ['TRACK','PHOTON RATE STEADY. SKY IS QUIET.'],
  ['SYS','SHROUD DELTA-T 0.4 K. THERMAL NOMINAL.'],
  ['CAPCOM','COPY FRAME DUMP. DATA LOOKS GOOD DOWN HERE.'],
  ['TRACK','SIDEREAL RATE TRIM +0.002. ACCEPTED.'],
  ['SYS','X-BAND MARGIN 6.2 DB. LOCK SOLID.'],
  ['CAPCOM','WEATHER AT THE RIDGE: CLEAR, 40 KNOTS, COLD.'],
];
let nextAmbient = 6, lastAmbient = -1;

/* ══ COMMAND TERMINAL ═══════════════════════════════════════════════ */
const body = document.body;
const cmdout = $('cmdout'), cmdtext = $('cmdtext'), cmdinput = $('cmdinput');
const cmdSR = $('cmdout-sr');
const jobs = [];                 // typing jobs, run in order
let userBusyUntil = -99;

/* announce a finished response to assistive tech once, as whole text —
   the visible typewriter runs at up to 900 cps, far too fast to expose to
   a screen reader; this reads the settled line instead of every keystroke */
function srAnnounce(text){
  cmdSR.textContent = '';
  requestAnimationFrame(() => { cmdSR.textContent = text; });
}

function outLine(cls = 'resp'){
  const div = document.createElement('div');
  div.className = cls;
  cmdout.appendChild(div);
  while (cmdout.children.length > 26) cmdout.removeChild(cmdout.firstChild);
  return div;
}
function typeLines(lines, cls = 'resp', cps = 420){
  jobs.push({ kind:'type', lines: lines.slice(), cls, cps, el:null, li:0, acc:0 });
}
function pauseJob(sec){ jobs.push({ kind:'pause', left: sec }); }
function doJob(fn){ jobs.push({ kind:'do', fn }); }
function scanJob(){ jobs.push({ kind:'scan', p:0, el:null }); }

function tickJobs(dt){
  if (!jobs.length) return;
  const j = jobs[0];
  if (j.kind === 'pause'){ j.left -= dt; if (j.left <= 0) jobs.shift(); return; }
  if (j.kind === 'do'){ jobs.shift(); j.fn(); return; }
  if (j.kind === 'scan'){
    if (!j.el) j.el = outLine('resp');
    j.p = Math.min(1, j.p + dt / (RM ? .2 : 2.4));
    const cells = 24, on = Math.round(j.p * cells);
    j.el.textContent = `INTEGRATING [${'█'.repeat(on)}${'░'.repeat(cells - on)}] ${String(Math.round(j.p*100)).padStart(3)}%`;
    if (j.p >= 1){ jobs.shift(); srAnnounce(j.el.textContent); }
    return;
  }
  // type
  if (j.li >= j.lines.length){ jobs.shift(); return; }
  if (!j.el){ j.el = outLine(j.cls); j.done = 0; }
  const line = j.lines[j.li];
  j.acc += dt * (RM ? 1e5 : j.cps);
  const n = Math.min(line.length, Math.floor(j.acc));
  if (n !== j.done){ j.el.textContent = line.slice(0, n); j.done = n; }
  if (n >= line.length){
    if (j.cls !== 'echo' && line) srAnnounce(line);  // skip the operator's own echoed input
    j.li++; j.el = null; j.acc = -8; // small inter-line beat
  }
}

const HELP_TEXT = [
  '┌─ COMMAND REFERENCE ─────────────────────────┐',
  '│ SCAN ............ CO-ADD CURRENT FIELD      │',
  '│ TARGET <NAME> ... SLEW TO CATALOG OBJECT    │',
  '│ DIAGNOSTICS ..... LEVEL-2 SYSTEM CHECK      │',
  '│ ACK ............. ACKNOWLEDGE MASTER ALARM  │',
  '│ CLEAR ........... CLEAR THIS CHANNEL        │',
  '└─────────────────────────────────────────────┘',
  'CATALOG: ANDROMEDA · CRAB · VEGA',
];

function execute(raw){
  const cmd = raw.trim().toUpperCase();
  if (!cmd) return;
  const echo = outLine('echo');
  echo.textContent = 'DSS-4> ' + cmd;

  if (cmd === 'HELP'){ typeLines(HELP_TEXT, 'resp', 900); return; }

  if (cmd === 'SCAN'){
    typeLines([`SCANNING FIELD 47-K AT ${fmtRA(ret.ra)} ${fmtDEC(ret.dec)} ...`]);
    scanJob();
    typeLines(['1,024 FRAMES CO-ADDED. DARK-SUBTRACTED.',
               '3 CANDIDATE SOURCES ABOVE 5-SIGMA. FILED TO TAPE.']);
    doJob(() => log('SYS', 'FIELD 47-K SCAN COMPLETE. 3 CANDIDATES FILED.'));
    return;
  }

  if (cmd.startsWith('TARGET')){
    const key = cmd.replace('TARGET', '').trim();
    const tgt = CATALOG[key];
    if (!tgt){
      typeLines([`NO CATALOG HIT FOR "${key || '?'}".`, 'TRY: ANDROMEDA · CRAB · VEGA']);
      return;
    }
    const az0 = (190 + ret.fx * 60).toFixed(1), az1 = (190 + tgt.fx * 60).toFixed(1);
    const el0 = (63 - ret.fy * 35).toFixed(1),  el1 = (63 - tgt.fy * 35).toFixed(1);
    typeLines([`CATALOG HIT: ${tgt.full}`,
               `SLEWING AZ ${az0} → ${az1} · EL ${el0} → ${el1}`,
               'TRACKING RESUMES AUTOMATICALLY.']);
    doJob(() => {
      slewTo(tgt, 8);
      $('m-tgt').textContent = tgt.name;
      $('m-mode').textContent = 'SLEW';
      log('TRACK', `SLEW ORDERED: ${tgt.name}. RATE 0.42 DEG/S.`);
    });
    return;
  }

  if (cmd === 'DIAGNOSTICS' || cmd === 'DIAG'){
    const alert = body.classList.contains('alert');
    typeLines(['RUNNING LEVEL-2 DIAGNOSTIC ...'], 'resp');
    pauseJob(RM ? 0 : .5);
    typeLines([
      'CRYO LOOP B ........ 6.02 K ......... PASS',
      alert ? 'PCA ARRAY .......... RATE HIGH ...... CHECK'
            : 'PCA ARRAY .......... 4096/4096 CH ... PASS',
      'GIMBAL BACKLASH .... 0.8 ARCSEC ..... PASS',
      'TAPE DECK 2 ........ 41 PCT ......... PASS',
      'X-BAND CARRIER ..... LOCK ........... PASS',
      alert ? 'ONE FLAG RAISED. SEE MASTER ALARM.' : 'NO FAULTS. DSS-4 IS GO.',
    ], alert ? 'hot' : 'resp', 700);
    return;
  }

  if (cmd === 'ACK'){
    if (body.classList.contains('alert')){
      clearAlert('OPERATOR');
      typeLines(['MASTER ALARM ACKNOWLEDGED.', 'EVENT DF-1978A FILED. RESUMING SURVEY.']);
    } else {
      typeLines(['NO ACTIVE ALARMS. CHANNEL QUIET.']);
    }
    return;
  }

  if (cmd === 'CLEAR'){ cmdout.textContent = ''; return; }

  typeLines([`UNRECOGNIZED: "${cmd}". TYPE HELP.`]);
}

/* input wiring */
cmdinput.addEventListener('input', () => {
  cmdtext.textContent = cmdinput.value.toUpperCase();
  userBusyUntil = conT + 25;
});
cmdinput.addEventListener('keydown', (e) => {
  userBusyUntil = conT + 25;
  if (e.key === 'Enter'){
    execute(cmdinput.value);
    cmdinput.value = ''; cmdtext.textContent = '';
  }
});
$('cmdline').addEventListener('click', () => cmdinput.focus());
document.querySelectorAll('.presets button').forEach(b => {
  b.addEventListener('click', () => {
    userBusyUntil = conT + 25;
    cmdinput.value = ''; cmdtext.textContent = '';
    execute(b.dataset.cmd);
  });
});

/* auto-demo: types preset commands when the operator is idle */
const DEMO = ['SCAN','TARGET ANDROMEDA','DIAGNOSTICS','TARGET CRAB','SCAN','TARGET VEGA','HELP','TARGET ANDROMEDA'];
let demoIdx = 0, nextDemo = 5, demoTyping = null;
let csClock = 1;

/* command-panel status strip — keeps the terminal from ever reading empty */
function tickCmdStatus(dt){
  csClock += dt;
  if (csClock < (RM ? 1 : .25)) return;
  csClock = 0;
  const s = Math.floor(conT);
  $('cs-up').textContent = `${pad(s / 3600, 2)}:${pad((s % 3600) / 60, 2)}:${pad(s % 60, 2)}`;
  const alert = body.classList.contains('alert');
  const chan = $('cs-chan');
  chan.textContent = alert ? 'ALARM' : 'OPEN';
  chan.classList.toggle('hot', alert);
  const demo = $('cs-demo');
  if (jobs.length){ demo.textContent = 'CHANNEL BUSY'; }
  else if (demoTyping){ demo.textContent = 'AUTO-OP TYPING…'; }
  else if (conT < userBusyUntil){ demo.textContent = 'AUTO-OP HOLD · OPERATOR ACTIVE'; }
  else { demo.textContent = `AUTO-OP T-${pad(Math.max(0, Math.ceil(nextDemo - conT)), 2)}S`; }
}

function tickDemo(dt){
  if (demoTyping){
    demoTyping.acc += dt * 14;
    const n = Math.min(demoTyping.cmd.length, Math.floor(demoTyping.acc));
    cmdtext.textContent = demoTyping.cmd.slice(0, n);
    if (n >= demoTyping.cmd.length){
      const c = demoTyping.cmd; demoTyping = null;
      cmdtext.textContent = '';
      execute(c);
    }
    return;
  }
  if (conT < nextDemo || conT < userBusyUntil || jobs.length) return;
  const cmd = DEMO[demoIdx % DEMO.length]; demoIdx++;
  nextDemo = conT + 16 + Math.random() * 6;
  if (RM){ execute(cmd); return; }
  demoTyping = { cmd, acc: 0 };
}

/* ══ MASTER ALARM ═══════════════════════════════════════════════════ */
let nextAlert = 26, alertStart = -1, preAlertTgt = CATALOG.ANDROMEDA;

function startAlert(){
  alertStart = conT;
  body.classList.add('alert');
  const klaxon = $('klaxon');
  // role="alert" only announces on a real content mutation, so the banner's
  // text is written here (not hardcoded in HTML) and aria-hidden is lifted —
  // a screen reader user gets the same klaxon a sighted operator sees.
  klaxon.textContent = `▲ MASTER ALARM · TRANSIENT ${CATALOG.ANOMALY.name} · RATE +412% · TYPE ACK`;
  klaxon.removeAttribute('aria-hidden');
  klaxon.classList.add('on');
  $('s-pca').textContent = 'RATE HIGH'; $('s-pca').classList.add('warn');
  log('SYS', 'MASTER ALARM. TRANSIENT SOURCE IN FIELD.', true);
  log('TRACK', 'DESIGNATION DF-1978A. COUNT RATE +412 PCT.', true);
  preAlertTgt = ret.tgt;
  slewTo(CATALOG.ANOMALY, 6);
  $('m-tgt').textContent = 'DF-1978A';
  $('m-mode').textContent = 'SLEW';
}
function clearAlert(who){
  body.classList.remove('alert');
  const klaxon = $('klaxon');
  klaxon.classList.remove('on');
  klaxon.setAttribute('aria-hidden', 'true');
  $('s-pca').textContent = 'NOMINAL'; $('s-pca').classList.remove('warn');
  log('CAPCOM', `COPY ALARM ACK BY ${who}. DATA LOOKS GOOD DOWN HERE.`);
  log('SYS', 'ALERT CLEARED. RESUME SURVEY.');
  alertStart = -1;
  nextAlert = conT + 75;
  slewTo(preAlertTgt, 8);
  $('m-tgt').textContent = preAlertTgt.name;
}
function tickAlert(){
  if (alertStart < 0 && conT >= nextAlert) startAlert();
  // station auto-acks if the operator does not
  if (alertStart >= 0 && conT > alertStart + 17 && !jobs.length && !demoTyping){
    if (RM){ execute('ACK'); }                       // clearAlert resets alertStart
    else { demoTyping = { cmd:'ACK', acc:0 }; alertStart = conT + 99; }
  }
}

/* ══ BOOT SEQUENCE ══════════════════════════════════════════════════ */
const BOOT_LINES = [
  'DEEPFIELD STATION · CONSOLE 04 · POWER-ON SELF-TEST',
  '',
  'ROM 1978.320 REV C ............ CKSUM 4A7F OK',
  'CORE MEMORY 64K ............... PARITY OK',
  'PRIMARY BUS A ................. 28.4 VDC',
  'CRYOCOOLER LOOP B ............. 6.02 K',
  'PHOTON COUNTING ARRAY ......... 4096 CH OK',
  'GIMBAL SERVO AZ/EL ............ SLEW TEST OK',
  'STAR CATALOG SAO-78 ........... 258,997 ENTRIES',
  'DOWNLINK X-BAND ............... CARRIER LOCK',
  '',
  'ALL SYSTEMS NOMINAL. HANDING OFF TO OPERATOR.',
];
const bootEl = $('boot'), bootLinesEl = $('bootlines');
let bootDone = false;

function runBoot(){
  if (RM){ finishBoot(true); return; }
  let li = 0, acc = 0, lineEl = null, cur = null;
  let last = performance.now();
  function step(now){
    if (bootDone) return;
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (li >= BOOT_LINES.length){ finishBoot(false); return; }
    if (!lineEl){
      lineEl = document.createElement('div'); lineEl.className = 'bline';
      cur = document.createElement('span'); cur.className = 'cursor';
      bootLinesEl.appendChild(lineEl); lineEl.appendChild(cur);
      acc = BOOT_LINES[li] === '' ? -2 : 0;
    }
    acc += dt * 310;
    const line = BOOT_LINES[li];
    const n = Math.max(0, Math.min(line.length, Math.floor(acc)));
    lineEl.textContent = line.slice(0, n);
    lineEl.appendChild(cur);
    if (n >= line.length && acc > line.length + 10){ li++; lineEl = null; }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function finishBoot(instant){
  if (bootDone) return;
  bootDone = true;
  if (instant){
    bootLinesEl.textContent = '';
    for (const l of BOOT_LINES){
      const d = document.createElement('div'); d.className = 'bline';
      d.textContent = l; bootLinesEl.appendChild(d);
    }
  }
  setTimeout(() => {
    bootEl.classList.add('off');
    $('stage').classList.add('on');
    startConsole();
    setTimeout(() => bootEl.remove(), 600);
  }, instant ? 350 : 500);
}
addEventListener('keydown', () => { if (!bootDone) finishBoot(true); }, { once:false });
bootEl.addEventListener('click', () => finishBoot(true));

/* ══ MAIN LOOP ══════════════════════════════════════════════════════ */
let rafId = 0, lastFrame = 0;

function frame(now){
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - lastFrame) / 1000);
  lastFrame = now;
  conT += dt;

  alertMix += ((body.classList.contains('alert') ? 1 : 0) - alertMix) * Math.min(1, dt * 3);

  drawSky(conT);
  tickTelemetry(dt, conT);
  tickClocks(dt);
  tickJobs(dt);
  tickDemo(dt);
  tickAlert();
  tickCmdStatus(dt);

  // ambient chatter
  if (conT >= nextAmbient){
    let i; do { i = Math.floor(Math.random() * AMBIENT.length); } while (i === lastAmbient);
    lastAmbient = i;
    log(AMBIENT[i][0], AMBIENT[i][1]);
    nextAmbient = conT + 7 + Math.random() * 8;
  }

  // RA/DEC readout
  $('m-ra').textContent = fmtRA(ret.ra);
  $('m-dec').textContent = fmtDEC(ret.dec);
}

function startConsole(){
  if (running) return;
  running = true;
  buildSky();
  log('CAPCOM', 'DEEPFIELD, HOUSTON. YOU ARE GO FOR SURVEY.');
  log('TRACK', 'ACQUIRING M31. SIDEREAL TRACK ENGAGED.');
  $('m-tgt').textContent = 'M31';
  typeLines(['DEEPFIELD STATION READY.',
             'OPERATOR CONSOLE ONLINE. AUTO-DEMO STANDING BY.',
             'TYPE HELP FOR COMMAND REFERENCE, OR SELECT A PRESET BELOW.'], 'resp', 300);
  lastFrame = performance.now();
  rafId = requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (!running) return;
  if (document.hidden){ cancelAnimationFrame(rafId); rafId = 0; }
  else if (!rafId){ lastFrame = performance.now(); rafId = requestAnimationFrame(frame); }
});

let rsz;
addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(buildSky, 150); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (running) buildSky(); });

runBoot();
})();
