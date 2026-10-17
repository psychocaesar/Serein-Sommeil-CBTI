#!/bin/sh
# Xcode Cloud (même circuit que Serein et Serein Relais) : lancé automatiquement après le clone,
# avant la résolution des paquets Swift. Le clone est nu (pas de node_modules) alors que
# Package.swift référence des chemins locaux dans node_modules/@capacitor/* et @capgo/* : sans
# cette étape, la résolution SPM échoue. ios/App/App/public/ est aussi gitignoré et doit être
# régénéré.
set -e

# Racine du repo calculée depuis l'emplacement du script (ios/App/ci_scripts/) : sur Serein,
# $CI_WORKSPACE ne pointait pas là où on l'attendait.
cd "$(dirname "$0")/../../.."

if ! command -v node >/dev/null 2>&1; then
  # Version figée plutôt que la dernière de Homebrew (les tests exigent Node 22+).
  brew install node@24
  brew link --force node@24
fi

npm ci

# npm test lance d'abord le build (pretest) puis les tests : logique clinique (garde-fous,
# titration), cohérence des versions et des assets. S'ils échouent, le build s'arrête ici et
# rien n'arrive sur TestFlight.
npm test

npx cap sync ios
