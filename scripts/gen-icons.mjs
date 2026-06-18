/* ============================================================
   gen-icons.mjs — génère les icônes PNG de l'app sans dépendance.
   Encodeur PNG maison (RGBA + zlib) + rendu vectoriel d'un croissant
   de lune sur dégradé Serein (#93c9ac → #d8b78a).
   Usage : node scripts/gen-icons.mjs
   ============================================================ */
import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "www", "icons");
mkdirSync(OUT, { recursive: true });

/* ---- CRC32 (table) ---- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtre 0 (none)
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---- rendu ---- */
const C0 = [0x93, 0xc9, 0xac];  // primary
const C1 = [0xd8, 0xb7, 0x8a];  // primary-2
const DARK = [0x0d, 0x1b, 0x15]; // bg
const mix = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

function render(S) {
  const rgba = Buffer.alloc(S * S * 4);
  const cx = S * 0.5, cy = S * 0.5, R = S * 0.27;        // croissant centré (zone safe maskable)
  const bx = cx + R * 0.55, by = cy - R * 0.18, Rb = R * 0.92; // cercle soustrait
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const t = clamp01((x + y) / (2 * (S - 1)));         // dégradé diagonal
      let col = mix(C0, C1, t);
      const dA = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const dB = Math.hypot(x + 0.5 - bx, y + 0.5 - by);
      const inA = clamp01(R - dA + 0.5);                  // anti-aliasing 1px
      const inB = clamp01(Rb - dB + 0.5);
      const moon = inA * (1 - inB);
      if (moon > 0) col = mix(col, DARK, moon);
      const i = (y * S + x) * 4;
      rgba[i] = col[0]; rgba[i + 1] = col[1]; rgba[i + 2] = col[2]; rgba[i + 3] = 255;
    }
  }
  return encodePNG(S, S, rgba);
}

const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["icon-maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
  ["favicon-32.png", 32],
];
for (const [name, size] of targets) {
  writeFileSync(join(OUT, name), render(size));
  console.log("✓", name, `(${size}×${size})`);
}
console.log("Icônes générées dans www/icons/");
