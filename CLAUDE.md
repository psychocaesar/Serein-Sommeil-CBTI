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

- **État** : un seul objet `state` dans `localStorage` (`serein_cbti_v1`, `version: 2`). `migrateV1` convertit l'ancien journal et refait l'accueil (la v1 ne posait aucune question de sécurité).
- **Dates** : toujours `ymd()` (heure locale), jamais `toISOString().slice(0,10)` (UTC → décalage d'un jour entre minuit et 2 h).
- **`[hidden]`** : règle globale `[hidden] { display:none !important; }` en tête de feuille de style, ne pas la retirer.
- **Pont natif Capacitor** : `window.Capacitor.Plugins.X` avec repli web. Plugins : `LocalNotifications`, `Health` (`@capgo/capacitor-health`, lecture du sommeil uniquement).

## Tests

`tests/clinical-logic.test.js` charge le vrai `<script>` dans un sandbox `node:vm`, coupé au marqueur `/* ==== BOOT (les tests coupent le script ici) ==== */`. Couvre agenda, garde-fous, fenêtre de départ, titration, bilan, dates, partage, migration. Toute nouvelle fonction clinique pure → un test ici. `versions.test.js` et `assets.test.js` vérifient versions et assets du build.

## Chantiers connus (audit du 16/10/2026)

- **iOS** : pas de `SceneDelegate` → plantage au lancement avec le SDK iOS 27 ; passer Capacitor ≥ 8.5.1 et migrer comme Serein Relais (commit `a03bf9c` de ce repo-là).
- **Android** : le manifest de `@capgo/capacitor-health` ajoute ~40 permissions santé (lecture/écriture) : les retirer avec `tools:node="remove"` sauf `READ_SLEEP`. `SCHEDULE_EXACT_ALARM` à justifier ou retirer.
- **Synchro santé** : `fetchLastNight` prend toutes les données des 32 dernières heures et englobe deux nuits → renvoie presque toujours `null`. Regrouper en sessions, prendre la dernière.
- **Persistance** : `localStorage` seul ; passer par Capacitor Preferences comme Relais. Pas d'import de sauvegarde.
- **CSP** absente ; CI encore sur Codemagic (`node: latest`) alors que Serein et Relais sont passés à Xcode Cloud.
