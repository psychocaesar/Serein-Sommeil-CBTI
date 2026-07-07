/* ============================================================
   gen-icons.mjs - génère TOUS les assets image de l'app sans dépendance :
   - PWA : www/icons/ (192, 512, maskable, apple-touch, favicon)
   - Android : mipmaps launcher/round/foreground (toutes densités) + splash port/land
   - iOS : AppIcon 1024 (sans canal alpha, exigence App Store) + Splash 2732
   Encodeur PNG maison (RGB ou RGBA + zlib), croissant de lune sur
   dégradé Serein (#93c9ac → #d8b78a), fond sombre #0d1b15.
   Usage : node scripts/gen-icons.mjs
   ============================================================ */
import zlib from "node:zlib";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RES = join(ROOT, "android", "app", "src", "main", "res");
const IOS_ASSETS = join(ROOT, "ios", "App", "App", "Assets.xcassets");

/* ---- CRC32 ---- */
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
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
/* channels: 3 = RGB (pas d'alpha, requis pour l'icône App Store), 4 = RGBA */
function encodePNG(width, height, pixels, channels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;                          // bit depth
  ihdr[9] = channels === 3 ? 2 : 6;     // color type : 2 = RGB, 6 = RGBA
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtre none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const level = width * height > 2_000_000 ? 6 : 9; // gros splash : deflate plus rapide
  const idat = zlib.deflateSync(raw, { level });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

/* ---- couleurs ---- */
const C0 = [0x93, 0xc9, 0xac];   // primary
const C1 = [0xd8, 0xb7, 0x8a];   // primary-2
const DARK = [0x0d, 0x1b, 0x15]; // bg
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Croissant : cercle R soustrait d'un cercle décalé, anti-aliasing 1px.
   Renvoie la couverture 0..1 du croissant au pixel (x,y). */
function moonCoverage(x, y, cx, cy, R) {
  const bx = cx + R * 0.55, by = cy - R * 0.18, Rb = R * 0.92;
  const dA = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  const dB = Math.hypot(x + 0.5 - bx, y + 0.5 - by);
  return clamp01(R - dA + 0.5) * (1 - clamp01(Rb - dB + 0.5));
}

/* Icône pleine : fond dégradé diagonal, croissant sombre.
   moonScale plus petit pour le foreground adaptatif Android (zone safe ~61%). */
function drawIcon(S, moonScale = 0.27) {
  const px = Buffer.alloc(S * S * 3);
  const cx = S * 0.5, cy = S * 0.5, R = S * moonScale;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let col = mix(C0, C1, clamp01((x + y) / (2 * (S - 1))));
      const m = moonCoverage(x, y, cx, cy, R);
      if (m > 0) col = mix(col, DARK, m);
      const i = (y * S + x) * 3;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2];
    }
  }
  return encodePNG(S, S, px, 3);
}

/* Splash : fond sombre uni, croissant en dégradé centré (sobre). */
function drawSplash(w, h) {
  const px = Buffer.alloc(w * h * 3);
  const cx = w * 0.5, cy = h * 0.5, R = Math.min(w, h) * 0.11;
  const x0 = cx - R, span = 2 * R;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let col = DARK;
      const m = moonCoverage(x, y, cx, cy, R);
      if (m > 0) col = mix(DARK, mix(C0, C1, clamp01((x - x0) / span)), m);
      const i = (y * w + x) * 3;
      px[i] = col[0]; px[i + 1] = col[1]; px[i + 2] = col[2];
    }
  }
  return encodePNG(w, h, px, 3);
}

const out = (path, buf) => { writeFileSync(path, buf); console.log("✓", path.slice(ROOT.length + 1)); };

/* ---- 1. PWA (www/icons) ---- */
const PWA = join(ROOT, "www", "icons");
mkdirSync(PWA, { recursive: true });
out(join(PWA, "icon-192.png"), drawIcon(192));
out(join(PWA, "icon-512.png"), drawIcon(512));
out(join(PWA, "icon-maskable-512.png"), drawIcon(512, 0.22)); // marge maskable
out(join(PWA, "apple-touch-icon.png"), drawIcon(180));
out(join(PWA, "favicon-32.png"), drawIcon(32));

/* ---- 2. Android ---- */
if (existsSync(RES)) {
  const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [d, s] of Object.entries(LAUNCHER)) {
    const dir = join(RES, "mipmap-" + d);
    const icon = drawIcon(s);
    out(join(dir, "ic_launcher.png"), icon);
    out(join(dir, "ic_launcher_round.png"), icon);
  }
  for (const [d, s] of Object.entries(FOREGROUND)) {
    // foreground adaptatif : plein cadre opaque, croissant réduit pour la zone safe
    out(join(RES, "mipmap-" + d, "ic_launcher_foreground.png"), drawIcon(s, 0.18));
  }
  const SPLASH = {
    "drawable": [480, 320],
    "drawable-land-mdpi": [480, 320], "drawable-land-hdpi": [800, 480],
    "drawable-land-xhdpi": [1280, 720], "drawable-land-xxhdpi": [1600, 960],
    "drawable-land-xxxhdpi": [1920, 1280],
    "drawable-port-mdpi": [320, 480], "drawable-port-hdpi": [480, 800],
    "drawable-port-xhdpi": [720, 1280], "drawable-port-xxhdpi": [960, 1600],
    "drawable-port-xxxhdpi": [1280, 1920],
  };
  for (const [dir, [w, h]] of Object.entries(SPLASH)) {
    const p = join(RES, dir);
    if (existsSync(p)) out(join(p, "splash.png"), drawSplash(w, h));
  }
} else console.log("(android/ absent - mipmaps et splash ignorés)");

/* ---- 3. iOS ---- */
if (existsSync(IOS_ASSETS)) {
  out(join(IOS_ASSETS, "AppIcon.appiconset", "AppIcon-512@2x.png"), drawIcon(1024));
  const splash = drawSplash(2732, 2732);
  for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"])
    out(join(IOS_ASSETS, "Splash.imageset", f), splash);
} else console.log("(ios/ absent - AppIcon et Splash ignorés)");

console.log("Assets générés.");
