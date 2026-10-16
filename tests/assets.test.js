/* Les assets référencés doivent exister dans www/ : cache.addAll est atomique,
   un seul 404 casse l'installation du service worker (leçon Serein 1.3.0). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(join(ROOT, p), "utf8");

test("chaque asset du sw.js existe dans www/", () => {
  const m = read("www-src/sw.js").match(/const ASSETS = \[([\s\S]*?)\];/);
  assert.ok(m, "liste ASSETS introuvable dans www-src/sw.js");
  const assets = [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  assert.ok(assets.length > 5, "liste ASSETS anormalement courte");
  for (const a of assets) {
    const rel = a === "/" ? "index.html" : a.replace(/^\//, "");
    assert.ok(existsSync(join(ROOT, "www", rel)), `asset manquant dans www/ : ${a}`);
  }
});

test("chaque icône du manifest existe dans www/", () => {
  const manifest = JSON.parse(read("www/manifest.json"));
  for (const icon of manifest.icons) {
    assert.ok(existsSync(join(ROOT, "www", icon.src)), `icône manquante : ${icon.src}`);
  }
});

test("www/index.html buildé : polices locales, pas de Google Fonts", () => {
  const html = read("www/index.html");
  assert.ok(!html.includes("fonts.googleapis"), "www/index.html référence encore Google Fonts");
  assert.ok(html.includes("fonts/bricolage-grotesque-latin.woff2"), "@font-face locales absentes");
});

test("privacypolicy.html présent pour Health Connect", () => {
  assert.ok(existsSync(join(ROOT, "www", "privacypolicy.html")),
    "www/privacypolicy.html manquant (exigé par Health Connect via assets/public/)");
});

test("les 4 polices woff2 sont bien dans www/fonts/", () => {
  for (const f of ["bricolage-grotesque-latin.woff2", "bricolage-grotesque-latin-ext.woff2",
                   "hanken-grotesk-latin.woff2", "hanken-grotesk-latin-ext.woff2"]) {
    assert.ok(existsSync(join(ROOT, "www", "fonts", f)), `police manquante : ${f}`);
  }
});

test("www/index.html buildé : CSP présente, sans Google Fonts, audio Serein autorisé", () => {
  const m = read("www/index.html").match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(m, "CSP absente de www/index.html");
  assert.ok(!m[1].includes("fonts.g"), "la CSP buildée autorise encore Google Fonts");
  assert.ok(m[1].includes("media-src https://audio.sereinapp.fr"), "les voix guidées seraient bloquées par la CSP");
});
