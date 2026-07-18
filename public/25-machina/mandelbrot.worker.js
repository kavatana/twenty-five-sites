// mandelbrot.worker.js
// Off-main-thread Mandelbrot renderer. Progressive refinement (coarse -> fine
// pixel blocks), continuous/smooth escape-time coloring, cooperative
// cancellation so a moving camera never queues stale work.
//
// Protocol in:  { type:'render', gen, cx, cy, decade, width, height, maxIter, paletteId }
// Protocol out: { type:'frame', gen, blockSize, width, height, buffer (transferred),
//                 ms, maxIter, done }

const BASE_WIDTH = 3.4; // complex-plane width spanned by the canvas at decade 0
const ESCAPE_R2 = 65536; // bailout radius^2 = 256^2, generous for smooth coloring accuracy
const LN2 = Math.LN2;

// Curated palettes: [r,g,b] stops walked as a mirrored (triangle-wave) cycle
// so the banding has no hard seam. Interior (bounded) points are always void.
const PALETTES = [
  { // 0 — Magma (deep-zoom set coloring, per spec)
    stops: [[0x1b, 0x0f, 0x2e], [0x7a, 0x2e, 0x8f], [0xf2, 0xa0, 0x3d], [0xf7, 0xe8, 0xc8]],
    freq: 0.052,
  },
  { // 1 — Computation cyan (instrument schematic)
    stops: [[0x05, 0x06, 0x0a], [0x0c, 0x3b, 0x45], [0x1f, 0xb8, 0xc7], [0xcf, 0xff, 0xfa]],
    freq: 0.038,
  },
  { // 2 — Phosphor (oscilloscope, HUD gray-green)
    stops: [[0x05, 0x06, 0x0a], [0x17, 0x3b, 0x2c], [0x2f, 0xa6, 0x6b], [0xcf, 0xe8, 0xd8]],
    freq: 0.061,
  },
];
const VOID = [0x05, 0x06, 0x0a];

let latestGen = -1;

function triWave(x) {
  const f = x - Math.floor(x);
  return f < 0.5 ? f * 2 : (1 - f) * 2;
}

function paletteColor(smooth, paletteId, out) {
  const pal = PALETTES[paletteId] || PALETTES[0];
  const t = triWave(smooth * pal.freq);
  const n = pal.stops.length;
  const pos = t * (n - 1);
  const i0 = Math.min(n - 2, Math.floor(pos));
  const i1 = i0 + 1;
  const f = pos - i0;
  const a = pal.stops[i0], b = pal.stops[i1];
  out[0] = a[0] + (b[0] - a[0]) * f;
  out[1] = a[1] + (b[1] - a[1]) * f;
  out[2] = a[2] + (b[2] - a[2]) * f;
}

// Returns smoothed escape count, or -1 if bounded through maxIter.
function escape(cx, cy, maxIter) {
  let zr = 0, zi = 0, zr2 = 0, zi2 = 0, n = 0;
  // Cardioid / period-2 bulb interior short-circuit (classic optimization —
  // skips the two largest bounded regions entirely, no iteration needed).
  const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
  if (q * (q + (cx - 0.25)) < 0.25 * cy * cy) return -1;
  if ((cx + 1) * (cx + 1) + cy * cy < 0.0625) return -1;
  while (n < maxIter && zr2 + zi2 <= ESCAPE_R2) {
    zi = 2 * zr * zi + cy;
    zr = zr2 - zi2 + cx;
    zr2 = zr * zr;
    zi2 = zi * zi;
    n++;
  }
  if (n >= maxIter) return -1;
  const logZn = 0.5 * Math.log(zr2 + zi2);
  const nu = Math.log(logZn / LN2) / LN2;
  return n + 1 - nu;
}

function sleep0() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function render(req) {
  const { gen, cx, cy, decade, width, height, maxIter, paletteId } = req;
  const t0 = performance.now();
  const scale = BASE_WIDTH / Math.pow(10, decade);
  const step = scale / width;
  const halfH = (height * step) / 2;
  const originRe = cx - (width * step) / 2;
  const originIm = cy + halfH;

  const buf = new Uint8ClampedArray(width * height * 4);
  const rgb = [0, 0, 0];
  const blockSizes = [16, 8, 4, 2, 1];

  for (let pass = 0; pass < blockSizes.length; pass++) {
    if (gen !== latestGen) return; // superseded — abandon silently
    const b = blockSizes[pass];
    let rowsSinceYield = 0;
    for (let y = 0; y < height; y += b) {
      const im = originIm - (y + b * 0.5) * step;
      for (let x = 0; x < width; x += b) {
        const re = originRe + (x + b * 0.5) * step;
        const smooth = escape(re, im, maxIter);
        if (smooth < 0) { rgb[0] = VOID[0]; rgb[1] = VOID[1]; rgb[2] = VOID[2]; }
        else paletteColor(smooth, paletteId, rgb);
        const xEnd = Math.min(x + b, width);
        const yEnd = Math.min(y + b, height);
        for (let yy = y; yy < yEnd; yy++) {
          let idx = (yy * width + x) * 4;
          for (let xx = x; xx < xEnd; xx++) {
            buf[idx] = rgb[0]; buf[idx + 1] = rgb[1]; buf[idx + 2] = rgb[2]; buf[idx + 3] = 255;
            idx += 4;
          }
        }
      }
      rowsSinceYield += b;
      if (rowsSinceYield >= 48) {
        rowsSinceYield = 0;
        await sleep0();
        if (gen !== latestGen) return;
      }
    }
    const out = new Uint8ClampedArray(buf); // snapshot copy for transfer
    const ms = performance.now() - t0;
    postMessage({
      type: 'frame', gen, blockSize: b, width, height,
      buffer: out.buffer, ms, maxIter, done: pass === blockSizes.length - 1,
    }, [out.buffer]);
    await sleep0();
  }
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === 'render') {
    latestGen = msg.gen;
    render(msg);
  }
};
