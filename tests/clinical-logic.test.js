/* Teste la logique clinique telle qu'elle tourne réellement dans le fichier source :
   on charge le <script> de serein-cbti.html dans un sandbox vm (DOM stub, même pattern
   que Serein Relais), coupé juste avant boot() pour éviter tout effet de bord.
   Couvre l'agenda consensus (calcul et validation), les garde-fous de la restriction,
   la fenêtre de départ, la titration de Morin et le bilan hebdomadaire : les endroits où
   une régression silencieuse ferait resserrer le sommeil de quelqu'un à tort. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "serein-cbti.html"), "utf8");

const scriptStart = html.indexOf("<script>") + "<script>".length;
const CUT_MARKER = "/* ==== BOOT (les tests coupent le script ici) ==== */";
const cutAt = html.indexOf(CUT_MARKER, scriptStart);
assert.ok(cutAt > scriptStart, "marqueur de coupure introuvable avant boot() - à mettre à jour si le source a changé");
const src = html.slice(scriptStart, cutAt);

const noop = () => {};
const stub = new Proxy(function () {}, {
  get: (_t, p) => {
    if (p === Symbol.toPrimitive || p === "valueOf" || p === "toString") return () => "";
    if (p === Symbol.iterator) return function* () {};
    if (p === "then") return undefined;
    if (p === "length") return 0;
    return stub;
  },
  apply: () => stub, construct: () => stub, set: () => true, has: () => true,
});
const storage = new Map();
const sandbox = {
  console, structuredClone,
  document: stub, navigator: stub, location: stub, history: stub,
  localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) },
  addEventListener: noop, setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0,
  fetch: () => Promise.resolve(stub), confirm: () => true, URL: stub, Blob: stub,
};
sandbox.window = sandbox;

const SHIM = `
;globalThis.__c = { computeNight, validateNight, screeningOutcome, baselineSuggestion, suggestAdjustment,
  reviewInfo, adherence, validateWindow, agendaText, migrateV1, sleepSessionFor, offsetMin, ymd, addDays, daysBetween,
  SCREEN_ITEMS, WINDOW_FLOOR_MIN, DEFAULT_STATE };`;
vm.createContext(sandbox);
vm.runInContext(src + "\n" + SHIM, sandbox, { filename: "serein-cbti.html" });
const C = sandbox.__c;
const plain = v => JSON.parse(JSON.stringify(v)); // objets du sandbox → objets « normaux » pour deepEqual

/* nuit type : 23:30 au lit, extinction 23:45, 30 min d'endormissement, 2 réveils (40 min),
   dernier réveil 6:15, lever 6:45 */
const night = (date, o = {}) => ({ date, bed:"23:30", lightsOff:"23:45", sol:30, awakenings:2, waso:40,
  finalWake:"06:15", rise:"06:45", quality:2, nap:null, aid:"", alcohol:null, notes:"", ...o });

/* ---------- Agenda consensus ---------- */

test("computeNight : temps au lit = coucher → lever, sommeil = extinction → dernier réveil - endormissement - éveil", () => {
  const c = C.computeNight(night("2026-10-10"));
  assert.equal(c.tib, 435);                 // 23:30 → 06:45
  assert.equal(c.tst, 390 - 30 - 40);       // 23:45 → 06:15 = 390
  assert.equal(c.se, Math.round(320 / 435 * 100));
});

test("computeNight : le temps au lit après le dernier réveil (réveil précoce) compte comme éveil", () => {
  const early = C.computeNight(night("2026-10-10", { finalWake:"04:45" }));
  const late = C.computeNight(night("2026-10-10"));
  assert.equal(early.tib, late.tib);
  assert.equal(late.tst - early.tst, 90);
});

test("validateNight : champs requis, ordre des heures, estimations cohérentes", () => {
  assert.equal(C.validateNight(night("2026-10-10")), null);
  assert.match(C.validateNight(night("2026-10-10", { lightsOff:"" })), /éteint/);
  assert.match(C.validateNight(night("2026-10-10", { sol:"" })), /endormir/);
  assert.match(C.validateNight(night("2026-10-10", { quality:null })), /qualité/);
  assert.match(C.validateNight(night("2026-10-10", { lightsOff:"23:00" })), /extinction/i);    // avant le coucher
  assert.match(C.validateNight(night("2026-10-10", { finalWake:"07:00" })), /dernier réveil/i); // après le lever
  assert.match(C.validateNight(night("2026-10-10", { sol:300, waso:200 })), /dépassent/);
  // 0 réveil : l'éveil nocturne n'est pas demandé
  assert.equal(C.validateNight(night("2026-10-10", { awakenings:0, waso:"" })), null);
});

/* ---------- Garde-fous ---------- */

test("screeningOutcome : toute contre-indication ou une insomnie récente → fenêtre seulement avec un pro", () => {
  for (const item of C.SCREEN_ITEMS.filter(i => i.contra)) {
    const o = C.screeningOutcome({ duration:"3 mois ou plus", screening:[item.id] });
    assert.equal(o.restriction, "pro", item.id);
    assert.ok(o.reasons.length);
  }
  assert.equal(C.screeningOutcome({ duration:"Moins de 3 mois", screening:[] }).restriction, "pro");
  assert.equal(C.screeningOutcome({ duration:"3 mois ou plus", screening:[] }).restriction, "ok");
});

test("screeningOutcome : la conduite n'empêche pas la fenêtre mais déclenche l'avertissement somnolence", () => {
  const o = C.screeningOutcome({ duration:"3 mois ou plus", screening:["conduite"] });
  assert.equal(o.restriction, "ok");
  assert.equal(o.drowsy, true);
});

test("screeningOutcome : questionnaire non rempli → prudence (pas de fenêtre automatique)", () => {
  assert.equal(C.screeningOutcome({ duration:"3 mois ou plus", screening:null }).restriction, "pro");
});

/* ---------- Fenêtre de départ ---------- */

const days = (today, n, o) => Array.from({ length:n }, (_, i) => night(C.addDays(today, -i), o)).reverse();

test("baselineSuggestion : il faut 7 nuits d'observation", () => {
  const s = C.baselineSuggestion(days("2026-10-16", 6), "06:45", "2026-10-16");
  assert.equal(s.ready, false);
  assert.equal(s.n, 6);
});

test("baselineSuggestion : temps au lit = sommeil moyen arrondi au quart d'heure supérieur, lever fixe", () => {
  const s = C.baselineSuggestion(days("2026-10-16", 7), "06:45", "2026-10-16");
  assert.equal(s.ready, true);
  assert.equal(s.meanTst, 320);
  assert.equal(s.tib, 330);           // 5h20 → 5h30
  assert.equal(s.bed, "01:15");       // 06:45 - 5h30
  assert.equal(s.restricts, true);
});

test("baselineSuggestion : jamais sous le plancher de 5h30", () => {
  const s = C.baselineSuggestion(days("2026-10-16", 7, { sol:120, waso:120, awakenings:4 }), "07:00", "2026-10-16");
  assert.equal(s.tib, C.WINDOW_FLOOR_MIN);
});

test("baselineSuggestion : ignore les nuits de plus de 14 jours", () => {
  const old = days("2026-09-20", 10);
  assert.equal(C.baselineSuggestion(old, "07:00", "2026-10-16").ready, false);
});

/* ---------- Titration de Morin ---------- */

const win = { bed:"00:45", wake:"06:45" }; // 6 h au lit
const withSE = (target, n = 6) => Array.from({ length:n }, (_, i) => {
  // nuit de 6 h au lit avec un éveil ajusté pour viser l'efficacité voulue
  const waso = Math.round(360 - 360 * target / 100);
  return night(C.addDays("2026-10-16", -i), { bed:"00:45", lightsOff:"00:45", sol:0, awakenings:1, waso, finalWake:"06:45", rise:"06:45" });
});

test("suggestAdjustment : ≥ 85 % → +15 min (coucher avancé)", () => {
  const s = C.suggestAdjustment(withSE(88), win);
  assert.equal(s.status, "up");
  assert.equal(s.newBed, "00:30");
});

test("suggestAdjustment : 80-84 % → on garde", () => {
  assert.equal(C.suggestAdjustment(withSE(82), win).status, "keep");
});

test("suggestAdjustment : < 80 % → -15 min", () => {
  const s = C.suggestAdjustment(withSE(70), win);
  assert.equal(s.status, "down");
  assert.equal(s.newBed, "01:00");
});

test("suggestAdjustment : jamais sous 5h30", () => {
  const s = C.suggestAdjustment(withSE(70), { bed:"01:15", wake:"06:45" });
  assert.equal(s.status, "floor");
  assert.equal(s.newTib, 330);
});

test("suggestAdjustment : somnolence → jamais de resserrement, élargissement si ≥ 80 %", () => {
  assert.equal(C.suggestAdjustment(withSE(70), win, { sleepy:true }).status, "keep");
  assert.equal(C.suggestAdjustment(withSE(82), win, { sleepy:true }).status, "up");
});

test("suggestAdjustment : jamais au-dessus de 9 h", () => {
  assert.equal(C.suggestAdjustment(withSE(95), { bed:"21:45", wake:"06:45" }).status, "cap");
});

test("suggestAdjustment : moins de 5 nuits → pas de proposition", () => {
  assert.equal(C.suggestAdjustment(withSE(90, 4), win).status, "insufficient");
});

/* ---------- Bilan hebdomadaire ---------- */

test("reviewInfo : bilan dû après 7 jours ET au moins 5 nuits notées depuis la dernière décision", () => {
  const s = { window:{ ...win, since:"2026-10-09" }, windowLog:[{ date:"2026-10-09", kind:"set" }], journal: days("2026-10-16", 5) };
  assert.equal(C.reviewInfo(s, "2026-10-16").due, true);
  assert.equal(C.reviewInfo(s, "2026-10-15").due, false);             // 6 jours seulement
  const few = { ...s, journal: days("2026-10-16", 4) };
  assert.equal(C.reviewInfo(few, "2026-10-16").due, false);           // 4 nuits seulement
});

test("reviewInfo : les nuits d'avant la décision ne comptent pas", () => {
  const s = { window:{ ...win, since:"2026-10-14" }, windowLog:[{ date:"2026-10-14", kind:"keep" }], journal: days("2026-10-16", 10) };
  assert.equal(C.reviewInfo(s, "2026-10-16").nights.length, 2);
});

test("adherence : coucher pas plus de 15 min avant la fenêtre, lever à ±30 min", () => {
  const ns = [
    night("2026-10-14", { lightsOff:"00:45", rise:"06:45" }),
    night("2026-10-15", { lightsOff:"00:15", rise:"07:30" }),  // trop tôt au lit, lever trop tard
    night("2026-10-16", { lightsOff:"01:30", rise:"06:30" }),  // plus tard au lit : OK
  ];
  assert.deepEqual(plain(C.adherence(ns, win)), { n:3, bedOk:2, riseOk:2 });
});

test("validateWindow : 5h30 minimum en autonomie, 4 h avec un·e psy", () => {
  assert.equal(C.validateWindow("01:30", "06:45", "moi") !== null, true);  // 5h15
  assert.equal(C.validateWindow("01:30", "06:45", "psy"), null);
  assert.equal(C.validateWindow("03:00", "06:45", "psy") !== null, true);  // 3h45
});

/* ---------- Dates locales ---------- */

test("ymd : date locale, pas UTC (saisie à 0h30 = bon jour)", () => {
  assert.equal(C.ymd(new Date(2026, 9, 17, 0, 30)), "2026-10-17");
  assert.equal(C.addDays("2026-10-31", 1), "2026-11-01");   // changement d'heure fin octobre
  assert.equal(C.daysBetween("2026-10-20", "2026-10-27"), 7);
});

/* ---------- Partage et migration ---------- */

test("agendaText : une ligne par nuit + moyenne", () => {
  const t = C.agendaText(days("2026-10-16", 3), { bed:"00:45", wake:"06:45" }, "2026-10-16");
  assert.match(t, /Fenêtre actuelle : 00:45 → 06:45/);
  assert.equal((t.match(/dernier réveil/g) || []).length, 3);
  assert.match(t, /Moyenne sur 3 nuit/);
});

test("migrateV1 : l'ancien journal est converti et l'accueil (avec garde-fous) est refait", () => {
  const s = C.migrateV1({ onboarded:true, profile:{ wakeAnchor:"06:30", prescribedHours:5.5 },
    journal:[{ date:"2026-07-01", bed:"23:00", wake:"06:30", latency:40, awakenings:"4+", awakeTime:30, quality:7, notes:"x" }] });
  assert.equal(s.onboarded, false);
  assert.equal(s.window, null);
  assert.equal(s.profile.wakeAnchor, "06:30");
  const e = s.journal[0];
  assert.equal(e.lightsOff, "23:00");
  assert.equal(e.finalWake, "06:30");
  assert.equal(e.awakenings, 4);
  assert.equal(e.quality, 4);
  assert.equal(C.validateNight(e), null);
});

/* ---------- Synchro santé ---------- */

const iso = (d, h, m = 0) => { const [y, mo, da] = d.split("-").map(Number); return new Date(y, mo - 1, da, h, m).toISOString(); };
const sample = (d1, h1, m1, d2, h2, m2, sleepState = "asleep") => ({ startDate: iso(d1, h1, m1), endDate: iso(d2, h2, m2), sleepState });

test("sleepSessionFor : isole la bonne nuit quand la plage contient aussi la nuit précédente", () => {
  const samples = [
    sample("2026-10-15", 0, 0, "2026-10-15", 6, 50),   // fin de l'avant-dernière nuit
    sample("2026-10-15", 23, 40, "2026-10-16", 2, 0),
    sample("2026-10-16", 2, 30, "2026-10-16", 6, 55),  // réveil nocturne de 30 min : même session
  ];
  assert.deepEqual(plain(C.sleepSessionFor(samples, "2026-10-16")), { bed:"23:40", wake:"06:55" });
});

test("sleepSessionFor : une sieste ne remplace pas la nuit, rien à la mauvaise date", () => {
  const samples = [
    sample("2026-10-15", 23, 0, "2026-10-16", 7, 0),
    sample("2026-10-16", 14, 0, "2026-10-16", 14, 40),
  ];
  assert.deepEqual(plain(C.sleepSessionFor(samples, "2026-10-16")), { bed:"23:00", wake:"07:00" });
  assert.equal(C.sleepSessionFor(samples, "2026-10-17"), null);
  assert.equal(C.sleepSessionFor([sample("2026-10-16", 1, 0, "2026-10-16", 2, 0, "awake")], "2026-10-16"), null);
});
