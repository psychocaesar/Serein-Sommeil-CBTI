# Serein Sommeil — CBTI

App de **Thérapie Cognitivo-Comportementale de l'Insomnie** (CBTI) en français,
basée sur la méthode de Matthew Walker, présentée de façon accessible et sans jargon médical.

Extension de [Serein](https://sereinapp.fr) · Sans pub · Sans compte · Offline-first · Données 100 % locales.

## Utilisation

PWA single-file en vanilla JS — ouvre simplement [`serein-cbti.html`](serein-cbti.html)
dans un navigateur (fonctionne aussi en `file://`). Aucune dépendance hormis Google Fonts.

## Fonctionnalités

- **Programme** — onboarding en 4 étapes (diagnostic, efficacité de sommeil, fenêtre prescrite façon Walker, les 5 règles du contrôle du stimulus), tableau de bord, ajustement hebdomadaire automatique de la fenêtre.
- **Journal** — saisie matinale, calcul automatique de l'efficacité de sommeil.
- **Suivi** — 3 graphiques SVG (efficacité, durée, régularité) + métriques 7 jours.
- **Reconditionnement** — Worry Time (restructuration cognitive) + quiz des 8 croyances dysfonctionnelles.
- **Ce soir** — wind-down tracker, techniques de relaxation animées (respiration, body scan, visualisation), mode SOS.

## Roadmap

App iOS / Android via [Capacitor](https://capacitorjs.com) (comme Serein) —
les notifications locales seront branchées sur le plugin natif `LocalNotifications`.

## Avertissement

Cette app est basée sur une méthode scientifiquement validée. Elle ne remplace pas
un suivi médical. En cas d'insomnie sévère, consulte un médecin du sommeil.

## Licence

[AGPL-3.0](LICENSE) — comme Serein.
