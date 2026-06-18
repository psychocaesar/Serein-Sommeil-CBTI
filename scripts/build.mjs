/* ============================================================
   build.mjs — produit le dossier www/ (webDir Capacitor)
   - copie serein-cbti.html → www/index.html
   - remplace le lien Google Fonts par les @font-face locaux
   - injecte l'enregistrement du service worker
   - copie les assets (fonts, icons, manifest, sw)
   Usage : node scripts/build.mjs
   ============================================================ */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WWW  = join(ROOT, "www");
["fonts","icons"].forEach(d => mkdirSync(join(WWW, d), { recursive: true }));

/* ---- 1. HTML source ---- */
let html = readFileSync(join(ROOT, "serein-cbti.html"), "utf8");

/* ---- 2. Swap Google Fonts → auto-hébergés ---- */
html = html.replace(
  /<link rel="preconnect"[\s\S]*?<link href="https:\/\/fonts\.googleapis\.com[^"]*" rel="stylesheet">\n?/,
  ""
);

const fontFace = `
<style>
@font-face{font-family:'Bricolage Grotesque';font-style:normal;font-weight:400 800;font-display:swap;src:url('fonts/bricolage-grotesque-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Bricolage Grotesque';font-style:normal;font-weight:400 800;font-display:swap;src:url('fonts/bricolage-grotesque-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Hanken Grotesk';font-style:normal;font-weight:400 700;font-display:swap;src:url('fonts/hanken-grotesk-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Hanken Grotesk';font-style:normal;font-weight:400 700;font-display:swap;src:url('fonts/hanken-grotesk-latin-ext.woff2') format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
</style>`;

html = html.replace("<style>", fontFace + "\n<style>");

/* ---- 3. Ajouter manifest + SW registration avant </head> ---- */
const headInjection = `
<link rel="manifest" href="manifest.json">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<script>
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
</script>`;
html = html.replace("</head>", headInjection + "\n</head>");

writeFileSync(join(WWW, "index.html"), html, "utf8");
console.log("✓ www/index.html");

/* ---- 4. Copier les polices depuis Serein (si dispo) ---- */
const SEREIN_FONTS = join(ROOT, "..", "SereinApp ANDROID", "app", "pwa", "assets", "fonts");
const FONT_FILES = [
  "bricolage-grotesque-latin.woff2",
  "bricolage-grotesque-latin-ext.woff2",
  "hanken-grotesk-latin.woff2",
  "hanken-grotesk-latin-ext.woff2",
];
for (const f of FONT_FILES) {
  const src = join(SEREIN_FONTS, f);
  const dst = join(WWW, "fonts", f);
  if (existsSync(src)) { copyFileSync(src, dst); console.log("✓ fonts/" + f); }
  else { console.warn("⚠  font absent (à ajouter manuellement) :", f); }
}

/* ---- 5. Copier manifest, sw, icônes ---- */
copyFileSync(join(ROOT, "www-src", "manifest.json"), join(WWW, "manifest.json")); console.log("✓ manifest.json");
copyFileSync(join(ROOT, "www-src", "sw.js"),          join(WWW, "sw.js"));          console.log("✓ sw.js");
const iconsDir = join(ROOT, "www", "icons");
["icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","favicon-32.png"].forEach(f=>{
  if(existsSync(join(iconsDir, f))) console.log("✓ icons/" + f);
  else console.warn("⚠  icône manquante (lance scripts/gen-icons.mjs) :", f);
});

console.log("\n✅  Build terminé → www/  (webDir Capacitor)");
