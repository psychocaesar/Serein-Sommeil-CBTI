/* Cohérence des versions entre package.json (source de vérité), le HTML,
   Android, iOS et le cache du service worker. Même principe que sur
   l'app Serein principale : un bump oublié fait échouer les tests. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(join(ROOT, p), "utf8");
const pkg = JSON.parse(read("package.json"));

test("APP_VERSION du HTML = package.json", () => {
  const m = read("serein-cbti.html").match(/const APP_VERSION = "([^"]+)"/);
  assert.ok(m, "APP_VERSION introuvable dans serein-cbti.html");
  assert.equal(m[1], pkg.version);
});

test("versionName Android = package.json", () => {
  const m = read("android/app/build.gradle").match(/versionName "([^"]+)"/);
  assert.ok(m, "versionName introuvable dans build.gradle");
  assert.equal(m[1], pkg.version);
});

test("MARKETING_VERSION iOS = package.json (toutes occurrences)", () => {
  const all = [...read("ios/App/App.xcodeproj/project.pbxproj").matchAll(/MARKETING_VERSION = ([^;]+);/g)];
  assert.ok(all.length >= 2, "MARKETING_VERSION introuvable dans le pbxproj");
  for (const m of all) assert.equal(m[1].trim(), pkg.version);
});

test("CACHE_VERSION du sw.js buildé = package.json", () => {
  assert.ok(read("www/sw.js").includes(`serein-cbti-${pkg.version}`),
    "www/sw.js ne contient pas la version courante - relancer npm run build");
});
