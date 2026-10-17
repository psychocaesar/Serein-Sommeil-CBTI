# Serein Sommeil — contexte pour Claude Code

**Serein Sommeil** : compagnon des outils de la TCC-I (thérapie cognitivo-comportementale de l'insomnie), en français, entre les séances ou en autonomie. Pas encore publié. Même philosophie que [Serein](https://sereinapp.fr) et Serein Relais : **un compagnon, pas un thérapeute**, pas d'allégation d'efficacité, pas de culpabilité. `appId` : `fr.sereinapp.sommeil`.

## Source unique

**`serein-cbti.html`** — tout est inline (HTML/CSS/JS), un seul `<script>`. C'est le SEUL fichier à éditer. `www/` est généré par `npm run build` (`scripts/build.mjs` : polices locales, manifest, service worker) — ne jamais l'éditer.

```bash
npm test          # pretest = build, puis tests/*.test.js
npx cap sync      # répercute www/ sur android/ + ios/
```

En preview navigateur, le service worker sert en cache-first : après une modif, désinscrire le SW et vider les caches, sinon on voit l'ancienne version.

## Structure (refonte recentrée, 16/10/2026)

3 onglets + SOS nuit (bouton flottant) + Réglages (⚙️) :
- **Aujourd'hui** (`aujourdhui`) : nuit dernière à noter, « Ce soir » (fenêtre, ou semaine d'observation), bilan dû, avertissement somnolence, un repère du jour. Le soir, « Ce soir » passe en premier.
- **Ma fenêtre** (`fenetre`) : fenêtre actuelle, bilan hebdomadaire, agenda 14 nuits (graphique + liste + partage texte pour le/la psy), historique des décisions.
- **Outils** (`outils`) : sous-écrans `regles`, `soucis`, `croyances`, `detente`, `transition`.
- Sous-écran `nuit` (formulaire de l'agenda) avec la date en paramètre.

Navigation : `navigate(id, param)` pousse dans l'historique (bouton retour Android), `goBack()` = `history.back()`. Les modals se ferment au retour arrière via `popstate`.

## Règles cliniques (ne pas les assouplir sans en parler avec César)

- **Positionnement** : l'app ne « prescrit » rien. Une fenêtre est soit convenue avec le/la psy (`setBy: "psy"`), soit saisie par la personne (`"moi"`), soit proposée à partir de l'agenda (`"agenda"`) ou d'un bilan (`"bilan"`) — et **toujours validée par la personne**. Pas de « Méthode Walker », pas de pourcentage de réussite.
- **Garde-fous** (`SCREEN_ITEMS`, `screeningOutcome`) : bipolarité, épilepsie, signes d'apnée, parasomnies, jambes sans repos, horaires décalés, grossesse, ou insomnie < 3 mois → `restriction: "pro"` : l'app ne propose jamais de fenêtre d'elle-même ni de la resserrer ; seule une fenêtre convenue avec un pro peut être saisie. La conduite / métier à risque déclenche l'avertissement somnolence. Questionnaire non rempli → prudence (`"pro"`).
- **Semaine d'observation** : 7 nuits notées (sur 14 jours) avant de proposer une fenêtre de départ = sommeil moyen arrondi au quart d'heure supérieur, bornée [5h30, 9h].
- **Titration de Morin** (`suggestAdjustment`) : efficacité ≥ 85 % → +15 min ; 80-84 % → on garde ; < 80 % → -15 min. Plancher 5h30 (4 h si fixée avec un·e psy), plafond 9 h. Somnolence signalée → jamais de resserrement, élargissement si ≥ 80 %. Bilan dû après 7 jours ET ≥ 5 nuits notées depuis la dernière décision (`reviewInfo`).
- **Agenda consensus** (Carney 2012, `computeNight`) : coucher, extinction, endormissement, réveils, éveil nocturne, dernier réveil, lever, qualité 1-5 ; en option sieste, aide au sommeil, alcool, notes. **Aucune valeur par défaut** sur les estimations. Temps au lit = coucher → lever ; le temps au lit après le dernier réveil compte comme éveil.
- **Pas de jugement nuit par nuit** : pas de couleur rouge ni d'emoji sur l'efficacité, des durées neutres. L'efficacité n'apparaît qu'au bilan.
- **SOS nuit** : pas de minuteur, pas de notification, rien qui fasse regarder l'heure ; 3114 + 15/112.
- **Détente** : en soirée ou hors du lit, jamais présentée comme un moyen de « forcer » le sommeil. Pas d'allégation d'effet.
- **Croyances** : une à la fois, pour/contre, recotation 0-100. Pas de score global.

## Architecture

- **État** : un seul objet `state`, clé `serein_cbti_v1` (`version: 2`). `localStorage` sert à la lecture synchrone ; `save()` écrit aussi dans Capacitor Preferences (copie native durable, incluse dans les sauvegardes iCloud / Google), et `boot()` restaure depuis Preferences si iOS a purgé le WebView (vérifié dans le simulateur). « Tout effacer » vide les deux (`eraseAll`). `migrateV1` convertit l'ancien journal et refait l'accueil (la v1 ne posait aucune question de sécurité).
- **CSP** en meta tag : la version source autorise Google Fonts, `build.mjs` retire ces hôtes de la version buildée (polices locales). Seule ressource externe : les voix guidées (`media-src https://audio.sereinapp.fr`). Toute nouvelle ressource externe → mettre la CSP à jour.
- **Dates** : toujours `ymd()` (heure locale), jamais `toISOString().slice(0,10)` (UTC → décalage d'un jour entre minuit et 2 h).
- **`[hidden]`** : règle globale `[hidden] { display:none !important; }` en tête de feuille de style, ne pas la retirer.
- **Pont natif Capacitor** : `window.Capacitor.Plugins.X` avec repli web. Plugins : `LocalNotifications`, `Preferences`, `Health` (`@capgo/capacitor-health`, lecture du sommeil uniquement).
- **Synchro santé** : `HealthSync.fetchNight(date)` lit de la veille midi au jour même 20 h, et `sleepSessionFor` regroupe les échantillons en sessions (trou > 2 h = nouvelle session) puis garde la plus longue qui finit le matin voulu. Ne pré-remplit que le coucher et le dernier réveil.
- **iOS** : cycle de vie UIScene (`SceneDelegate.swift` + `UIApplicationSceneManifest`), obligatoire depuis le SDK iOS 27, nécessite Capacitor ≥ 8.5.1. Même migration que Serein et Serein Relais.
- **Android** : AGP 9.2.1 / Gradle 9.4.1 (comme Relais, nécessaires avec le JDK 25 d'Android Studio), minSdk 26 (exigé par le plugin santé). Le manifest retire avec `tools:node="remove"` toutes les permissions santé du plugin sauf `READ_SLEEP` (vérifié dans le manifest fusionné) ; pas de `SCHEDULE_EXACT_ALARM` (le plugin de notifications se rabat sur des alarmes inexactes, suffisantes pour des rappels).

## Tests

`tests/clinical-logic.test.js` charge le vrai `<script>` dans un sandbox `node:vm`, coupé au marqueur `/* ==== BOOT (les tests coupent le script ici) ==== */`. Couvre agenda, garde-fous, fenêtre de départ, titration, bilan, dates, partage, migration. Toute nouvelle fonction clinique pure → un test ici. `versions.test.js` et `assets.test.js` vérifient versions et assets du build.

## CI

- **GitHub Actions** (`.github/workflows/tests.yml`) : `npm ci` + `npm test` sur chaque push vers `main` et chaque PR. Node 22+ (le glob quoté de `node --test` exige Node 21+).
- **Xcode Cloud** (même circuit que Serein et Serein Relais ; Codemagic retiré le 17/10/2026, historique : `git log -- codemagic.yaml`) : build iOS + TestFlight. `ios/App/ci_scripts/ci_post_clone.sh` est lancé automatiquement après le clone : `npm ci`, **`npm test` (build compris ; s'il échoue, rien n'arrive sur TestFlight)**, `cap sync ios`. Le script doit rester exécutable (`chmod +x`). Le workflow (déclencheur, archive, TestFlight) se règle dans Xcode ou App Store Connect, pas dans le repo. Le build number est attribué par Xcode Cloud — **ne jamais le bumper à la main**. La version affichée (`version` de `package.json`, `versionName`, `MARKETING_VERSION`) se bumpe à la main dans les fichiers vérifiés par `versions.test.js`. `ITSAppUsesNonExemptEncryption = false` dans `Info.plist` (pas de question d'export à chaque build).
- **Android** : pas de CI, build manuel via Android Studio.

## Chantiers connus

- **Sauvegarde** : export JSON seulement, pas d'import ; le téléchargement par `a.download` est à tester sur appareil.
- **Validation sur appareil réel** : notifications, synchro Apple Santé / Health Connect, bouton retour Android.
