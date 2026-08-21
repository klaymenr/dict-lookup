// 產生 PWA 需要的 PNG icon（不依賴任何影像套件，直接輸出 PNG）。
// 圖案：暖色底 + 放大鏡，代表「查字典」。
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/icons');
mkdirSync(outDir, { recursive: true });

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const AMBER = [229, 165, 66];
const CREAM = [250, 248, 243];
const INK = [48, 46, 43];

/** 以超取樣（4x4）畫圖，邊緣才不會有鋸齒。 */
function draw(size, markScale) {
  const rgba = Buffer.alloc(size * size * 4);
  const S = 4;
  const c = size / 2;
  const r = (size * 0.30) * markScale; // 鏡片半徑
  const ring = (size * 0.075) * markScale; // 鏡框粗細
  const cx = c - size * 0.045 * markScale;
  const cy = c - size * 0.045 * markScale;
  // 握把：從鏡片右下往外
  const hx = cx + r * 0.78;
  const hy = cy + r * 0.78;
  const hLen = size * 0.20 * markScale;
  const hHalf = ring * 0.62;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          const d = Math.hypot(px - cx, py - cy);
          let inMark = Math.abs(d - r) <= ring / 2;
          if (!inMark) {
            // 握把（沿 45 度方向的膠囊）
            const ax = (px - hx + py - hy) / Math.SQRT2; // 沿軸距離
            const perp = (px - hx - (py - hy)) / Math.SQRT2;
            if (ax >= 0 && ax <= hLen && Math.abs(perp) <= hHalf) inMark = true;
            else if (Math.hypot(px - (hx + hLen / Math.SQRT2), py - (hy + hLen / Math.SQRT2)) <= hHalf) inMark = true;
          }
          if (inMark) hit++;
        }
      }
      const a = hit / (S * S);
      const bg = AMBER;
      const fg = markScale < 1 ? CREAM : CREAM;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(bg[0] * (1 - a) + fg[0] * a);
      rgba[i + 1] = Math.round(bg[1] * (1 - a) + fg[1] * a);
      rgba[i + 2] = Math.round(bg[2] * (1 - a) + fg[2] * a);
      rgba[i + 3] = 255;
    }
  }
  // 鏡片內填一點淡色，讓圖形更有份量
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < r - ring / 2) {
        const i = (y * size + x) * 4;
        rgba[i] = Math.round(rgba[i] * 0.25 + CREAM[0] * 0.75);
        rgba[i + 1] = Math.round(rgba[i + 1] * 0.25 + CREAM[1] * 0.75);
        rgba[i + 2] = Math.round(rgba[i + 2] * 0.25 + CREAM[2] * 0.75);
      }
    }
  }
  return rgba;
}

for (const [name, size, scale] of [
  ['icon-192.png', 192, 1],
  ['icon-512.png', 512, 1],
  ['icon-maskable-512.png', 512, 0.72], // maskable 需要留 safe zone
]) {
  writeFileSync(resolve(outDir, name), encodePng(size, size, draw(size, scale)));
  console.log('wrote', name);
}

// 瀏覽器分頁用的 SVG favicon（帶「查」字）
writeFileSync(
  resolve(outDir, 'icon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="查字典大挑戰">
  <rect width="64" height="64" rx="14" fill="rgb(${AMBER.join(',')})"/>
  <text x="32" y="45" font-size="40" text-anchor="middle"
    font-family="PingFang TC, Noto Sans TC, sans-serif" fill="rgb(${INK.join(',')})">查</text>
</svg>
`,
);
console.log('wrote icon.svg');
