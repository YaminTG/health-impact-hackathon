// Generates PWA icons (PNG) with zero dependencies: the WAFI mark (white scan
// brackets + drop with a check) on a navy tile. Mirrors public/favicon.svg.
// Usage: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [13, 32, 71]; // #0D2047
const FG = [255, 255, 255];

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- mark geometry, in the favicon.svg coordinate space (brackets box 0..100) ----
function bez(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}
const DROP = [[50, 8.4],
  ...bez([50, 8.4], [36, 14], [25.6, 26], [25.6, 41.6]),
  ...bez([25.6, 41.6], [25.6, 58], [37, 74], [50, 86.3]),
  ...bez([50, 86.3], [63, 74], [74.4, 58], [74.4, 41.6]),
  ...bez([74.4, 41.6], [74.4, 26], [64, 14], [50, 8.4])];
const CHECK = [[32.7, 48.3], [46.9, 63.4], [66.1, 37.9]];
// one bracket (top-left), mirrored for the other corners
const BRACKET = [[2.5, 23.5], [2.5, 13]];
for (let i = 1; i <= 12; i++) {
  const a = Math.PI + (Math.PI / 2) * (i / 12);
  BRACKET.push([13 + 10.5 * Math.cos(a), 13 + 10.5 * Math.sin(a)]);
}
BRACKET.push([41.6, 2.5]);

function segDist(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function lineDist(px, py, pts) {
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(px, py, pts[i - 1], pts[i]));
  return d;
}
function inPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Returns [r,g,b,a] for a sample point in unit coords (0..1).
// `span` = how many mark units fit across the icon (bigger = smaller mark).
function sample(x, y, { rounded, span }) {
  if (rounded) {
    const r = 0.22;
    const cx = Math.min(Math.max(x, r), 1 - r);
    const cy = Math.min(Math.max(y, r), 1 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return [0, 0, 0, 0];
  }
  const mx = 50 + (x - 0.5) * span, my = 50 + (y - 0.5) * span;
  const bx = mx > 50 ? 100 - mx : mx, by = my > 50 ? 100 - my : my; // fold into top-left
  const bracket = lineDist(bx, by, BRACKET) <= 2.5;
  const drop = inPoly(mx, my, DROP) && lineDist(mx, my, CHECK) > 3;
  return [...(bracket || drop ? FG : BG), 255];
}

function render(size, opts) {
  const ss = 4;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0, 0];
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const s = sample((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size, opts);
          acc[0] += s[0] * s[3]; acc[1] += s[1] * s[3]; acc[2] += s[2] * s[3]; acc[3] += s[3];
        }
      }
      const i = (y * size + x) * 4;
      const n = ss * ss;
      buf[i + 3] = Math.round(acc[3] / n);
      if (acc[3] > 0) {
        buf[i] = Math.round(acc[0] / acc[3]);
        buf[i + 1] = Math.round(acc[1] / acc[3]);
        buf[i + 2] = Math.round(acc[2] / acc[3]);
      }
    }
  }
  return encodePNG(size, size, buf);
}

mkdirSync('public', { recursive: true });
const out = [
  ['public/pwa-192x192.png', 192, { rounded: true, span: 128 }],
  ['public/pwa-512x512.png', 512, { rounded: true, span: 128 }],
  ['public/maskable-512x512.png', 512, { rounded: false, span: 175 }],
  ['public/apple-touch-icon.png', 180, { rounded: false, span: 140 }],
  ['public/favicon-64.png', 64, { rounded: true, span: 128 }],
];
for (const [file, size, opts] of out) {
  writeFileSync(file, render(size, opts));
  console.log('wrote', file);
}
