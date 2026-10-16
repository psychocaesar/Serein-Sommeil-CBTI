# Serein Sommeil

Un compagnon pour les outils de la **TCC-I** (thérapie cognitivo-comportementale de l'insomnie),
en français : entre les séances si on est suivi·e, ou en autonomie avec des garde-fous.

Extension de [Serein](https://sereinapp.fr) · Sans pub · Sans compte · Offline-first · Données 100 % locales.
Un compagnon, pas un thérapeute : l'app propose, la personne (et son/sa psy) décide.

## Ce que fait l'app

- **Aujourd'hui** : noter sa nuit en quelques secondes (agenda consensus), la fenêtre de ce soir, le bilan de la semaine quand il est prêt.
- **Ma fenêtre** : semaine d'observation, fenêtre de départ proposée à partir de l'agenda, bilan hebdomadaire (titration de Morin, validée par la personne), agenda sur 14 nuits à partager avec son/sa psy.
- **Outils** : les 5 règles du contrôle du stimulus, le moment des soucis, les croyances sur le sommeil, la détente en soirée, la transition du soir.
- **SOS nuit** : quoi faire quand le sommeil ne vient pas, sans minuteur, avec le 3114.

Avant toute fenêtre de sommeil, un questionnaire de sécurité oriente vers un·e professionnel·le
en cas de contre-indication (trouble bipolaire, épilepsie, signes d'apnée, parasomnies, jambes
sans repos, horaires décalés, grossesse, ou insomnie de moins de 3 mois).

## Développement

PWA single-file en vanilla JS : tout est dans [`serein-cbti.html`](serein-cbti.html).
`www/` est généré par `npm run build` (ne pas l'éditer). Packaging iOS/Android via Capacitor.

```bash
npm test        # build + tests (dont la logique clinique)
npx cap sync    # répercute www/ sur android/ et ios/
```

Voir [`CLAUDE.md`](CLAUDE.md) pour le détail de l'architecture et des règles cliniques.

## Avertissement

Serein Sommeil ne pose pas de diagnostic et ne remplace pas un avis médical.
Si ton sommeil t'inquiète, parles-en à ton médecin.

## Licence

[AGPL-3.0](LICENSE), comme Serein.
