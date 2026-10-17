// Génère toutes les images d'icône et de démarrage à partir du master vectoriel
// logo-serein-sommeil.svg (le S de Serein en version nuit). Même principe que Serein Relais.
//
// 1. Sources pour @capacitor/assets (assets/), en plein cadre (l'OS applique son masque) :
//      icon-only.png 1024 · icon-foreground.png 1024 (le S, transparent) · icon-background.png 1024
//      splash.png / splash-dark.png 2732
// 2. Icônes PWA (www/icons/, commitées) : icon-192/512 (coins arrondis), icon-maskable-512 (plein cadre),
//    apple-touch-icon 180 (plein cadre, iOS arrondit), favicon-32.
// 3. Petite icône des notifications Android (res/drawable-*/ic_stat_sommeil.png) : le S en blanc, sans effet.
//
// Puis : npx capacitor-assets generate --ios --android  (icônes iOS/Android + écrans de démarrage)
// Usage : npm run icons
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const assets = join(root, 'assets');
const pwa = join(root, 'www', 'icons');
const res = join(root, 'android', 'app', 'src', 'main', 'res');
[assets, pwa].forEach(d => mkdirSync(d, { recursive: true }));
const svg = readFileSync(join(here, 'logo-serein-sommeil.svg'), 'utf8');

// Variantes par retrait d'éléments (découpage par classe : bg / halo / fg)
const removeClass = (s, cls) => s.replace(new RegExp('\\s*<[a-zA-Z]+[^>]*class="' + cls + '"[^>]*/>', 'g'), '');
const squared = svg.replace('rx="108"', 'rx="0"');              // fond carré plein
const bgOnly = removeClass(squared, 'fg');                       // fond + halo, sans symbole
const fgOnly = removeClass(removeClass(svg, 'bg'), 'halo');      // symbole seul, fond transparent

const render = (svgStr, size) => sharp(Buffer.from(svgStr), { density: 384 }).resize(size, size).png();

// 1. Sources @capacitor/assets
await render(squared, 1024).toFile(join(assets, 'icon-only.png'));
await render(bgOnly, 1024).toFile(join(assets, 'icon-background.png'));
const fgRaw = await render(fgOnly, 1200).toBuffer();
const sTrim = await sharp(fgRaw).trim().toBuffer();
const transparent = size => ({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
// avant-plan adaptatif : le S occupe ~58 % du cadre, centré dans la zone de sécurité
const fgInner = await sharp(sTrim).resize({ width: 600, height: 600, fit: 'inside' }).toBuffer();
await sharp(transparent(1024)).composite([{ input: fgInner, gravity: 'center' }]).png().toFile(join(assets, 'icon-foreground.png'));
// démarrage : fond plein 2732 + S centré (~28 %)
const splashBg = await render(bgOnly, 2732).toBuffer();
const splashS = await sharp(sTrim).resize({ width: 760, height: 760, fit: 'inside' }).toBuffer();
const splash = await sharp(splashBg).composite([{ input: splashS, gravity: 'center' }]).png().toBuffer();
await sharp(splash).toFile(join(assets, 'splash.png'));
await sharp(splash).toFile(join(assets, 'splash-dark.png'));

// 2. PWA
await render(svg, 192).toFile(join(pwa, 'icon-192.png'));
await render(svg, 512).toFile(join(pwa, 'icon-512.png'));
await render(squared, 512).toFile(join(pwa, 'icon-maskable-512.png'));
await render(squared, 180).toFile(join(pwa, 'apple-touch-icon.png'));
await render(svg, 32).toFile(join(pwa, 'favicon-32.png'));

// 3. Notifications Android : silhouette blanche du S (Android n'utilise que l'alpha)
const S_PATH = svg.match(/<path class="fg" d="([^"]+)"/)[1];
const stat = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="150 120 212 284"><path d="${S_PATH}" fill="none" stroke="#fff" stroke-width="44" stroke-linecap="round"/></svg>`;
for (const [d, px] of Object.entries({ mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 })) {
  const dir = join(res, 'drawable-' + d);
  mkdirSync(dir, { recursive: true });
  const glyph = await sharp(Buffer.from(stat), { density: 384 }).resize({ height: Math.round(px * 0.84), width: px, fit: 'inside' }).png().toBuffer();
  await sharp(transparent(px)).composite([{ input: glyph, gravity: 'center' }]).png().toFile(join(dir, 'ic_stat_sommeil.png'));
}

console.log('Sources générées : assets/, www/icons/, drawable-*/ic_stat_sommeil.png');
