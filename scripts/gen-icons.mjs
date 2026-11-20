// Generates PWA icons (PNG) with zero dependencies: a white leaf on a teal tile.
// Usage: npm run icons
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [15, 118, 110]; // #0F766E
const BG2 = [20, 184, 166]; // #14B8A6
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

// Returns [r,g,b,a] for a sample point in unit coords (0..1).
function sample(x, y, { rounded, scale }) {
  // tile
  if (rounded) {
    const r = 0.22;
    const cx = Math.min(Math.max(x, r), 1 - r);
    const cy = Math.min(Math.max(y, r), 1 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return [0, 0, 0, 0];
  }
  const t = (x + y) / 2;
  let col = BG.map((c, i) => Math.round(c + (BG2[i] - c) * t * 0.8));
  // leaf, rotated -45deg, centered
  const px = (x - 0.5) / scale, py = (y - 0.5) / scale;
  const a = Math.PI / 4;
  const u = px * Math.cos(a) - py * Math.sin(a); // along leaf axis
  const v = px * Math.sin(a) + py * Math.cos(a);
  const R = 0.32, d = 0.17;
  const inLeaf = u * u + (v - d) ** 2 < R * R && u * u + (v + d) ** 2 < R * R;
  const vein = Math.abs(v) < 0.014 && u > -0.2 && u < 0.24;
  const stem = Math.abs(v) < 0.018 && u <= -0.24 && u > -0.36;
  if ((inLeaf && !vein) || stem) col = FG;
  return [...col, 255];
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
  ['public/pwa-192x192.png', 192, { rounded: true, scale: 1 }],
  ['public/pwa-512x512.png', 512, { rounded: true, scale: 1 }],
  ['public/maskable-512x512.png', 512, { rounded: false, scale: 0.72 }],
  ['public/apple-touch-icon.png', 180, { rounded: false, scale: 0.85 }],
  ['public/favicon-64.png', 64, { rounded: true, scale: 1 }],
];
for (const [file, size, opts] of out) {
  writeFileSync(file, render(size, opts));
  console.log('wrote', file);
}
