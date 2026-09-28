import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    rgba.copy(raw, row + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function set(px, w, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= w || y >= px.length / 4 / w) return;
  const i = (y * w + x) * 4;
  const oa = a / 255;
  const ia = px[i + 3] / 255;
  const outA = oa + ia * (1 - oa);
  if (outA <= 0) return;
  px[i] = Math.round((r * oa + px[i] * ia * (1 - oa)) / outA);
  px[i + 1] = Math.round((g * oa + px[i + 1] * ia * (1 - oa)) / outA);
  px[i + 2] = Math.round((b * oa + px[i + 2] * ia * (1 - oa)) / outA);
  px[i + 3] = Math.round(outA * 255);
}

function fillCircle(px, w, h, cx, cy, r, color) {
  const x0 = Math.max(0, Math.floor(cx - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  const rr = r * r;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) set(px, w, x, y, color);
    }
  }
}

function fillRoundRect(px, w, h, x, y, rw, rh, rad, color) {
  for (let j = 0; j < rh; j++) {
    for (let i = 0; i < rw; i++) {
      const pxX = x + i;
      const pxY = y + j;
      let dx = 0;
      let dy = 0;
      if (i < rad && j < rad) {
        dx = rad - i;
        dy = rad - j;
      } else if (i > rw - rad && j < rad) {
        dx = i - (rw - rad);
        dy = rad - j;
      } else if (i < rad && j > rh - rad) {
        dx = rad - i;
        dy = j - (rh - rad);
      } else if (i > rw - rad && j > rh - rad) {
        dx = i - (rw - rad);
        dy = j - (rh - rad);
      }
      if (dx * dx + dy * dy <= rad * rad) set(px, w, pxX, pxY, color);
    }
  }
}

function starPoints(cx, cy, r, inner) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : inner;
    pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
  }
  return pts;
}

function fillPoly(px, w, h, pts, color) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  minX = Math.max(0, Math.floor(minX));
  minY = Math.max(0, Math.floor(minY));
  maxX = Math.min(w - 1, Math.ceil(maxX));
  maxY = Math.min(h - 1, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0001) + xi;
        if (intersect) inside = !inside;
      }
      if (inside) set(px, w, x, y, color);
    }
  }
}

function drawIcon(size, pad) {
  const px = Buffer.alloc(size * size * 4, 0);
  const s = size;
  for (let y = 0; y < s; y++) {
    const t = y / s;
    const r = Math.round(94 + (186 - 94) * t);
    const g = Math.round(196 + (232 - 196) * t);
    const b = Math.round(255 + (255 - 255) * t);
    for (let x = 0; x < s; x++) set(px, s, x, y, [r, g, b, 255]);
  }
  const m = pad;
  fillRoundRect(px, s, s, m, m, s - m * 2, s - m * 2, Math.round(s * 0.22), [255, 255, 255, 0]);
  // keep full bleed sky; iOS rounds the icon. Add a soft inner disc.
  fillCircle(px, s, s, s * 0.5, s * 0.56, s * 0.34, [255, 214, 92, 255]);
  fillPoly(px, s, s, starPoints(s * 0.5, s * 0.48, s * 0.3, s * 0.125), [255, 196, 40, 255]);
  fillPoly(px, s, s, starPoints(s * 0.5, s * 0.48, s * 0.22, s * 0.09), [255, 230, 120, 255]);
  fillCircle(px, s, s, s * 0.42, s * 0.4, s * 0.045, [255, 255, 255, 180]);
  // smile badge
  fillCircle(px, s, s, s * 0.72, s * 0.74, s * 0.12, [255, 122, 162, 255]);
  fillCircle(px, s, s, s * 0.68, s * 0.71, s * 0.018, [90, 50, 40, 255]);
  fillCircle(px, s, s, s * 0.76, s * 0.71, s * 0.018, [90, 50, 40, 255]);
  for (let a = 20; a <= 160; a += 4) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(s * 0.72 + Math.cos(rad) * s * 0.045);
    const y = Math.round(s * 0.75 + Math.sin(rad) * s * 0.03);
    fillCircle(px, s, s, x, y, Math.max(1, s * 0.008), [90, 50, 40, 255]);
  }
  return encodePNG(s, s, px);
}

mkdirSync('public/icons', { recursive: true });
const files = [
  ['public/icons/apple-touch-icon.png', 180, 0],
  ['public/icons/icon-192.png', 192, 0],
  ['public/icons/icon-512.png', 512, 0],
  ['public/icons/icon-maskable-512.png', 512, 64],
];
for (const [path, size, pad] of files) {
  mkdirSync(dirname(path), { recursive: true });
  const png = pad ? masked(size, pad) : drawIcon(size, 0);
  writeFileSync(path, png);
  console.log(path, png.length);
}

function masked(size, inset) {
  const px = Buffer.alloc(size * size * 4, 0);
  for (let y = 0; y < size; y++) {
    const t = y / size;
    const r = Math.round(94 + (150 - 94) * t);
    const g = Math.round(190 + (220 - 190) * t);
    const b = 255;
    for (let x = 0; x < size; x++) set(px, size, x, y, [r, g, b, 255]);
  }
  const cx = size / 2;
  const cy = size / 2;
  const scale = (size - inset * 2) / size;
  fillPoly(
    px,
    size,
    size,
    starPoints(cx, cy - size * 0.02, size * 0.26 * (0.7 + scale * 0.3), size * 0.11),
    [255, 200, 50, 255],
  );
  fillCircle(px, size, size, cx + size * 0.18, cy + size * 0.2, size * 0.09, [255, 122, 162, 255]);
  return encodePNG(size, size, px);
}
