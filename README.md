# EpiBet Dashboard

Dashboard React/Vite connecté à l’API EpiBet (`NightKiiro/API-Hackathon`).

## Fonctionnement

Le front permet de :

- enregistrer ou recharger un créateur via `POST /auth/register`
- charger une clé API via `X-API-Key`
- créer un jeu via `POST /games`
- envoyer des transactions `income` et `payout` via `POST /games/:id/transactions`
- consulter les stats publiques, le classement et les alertes

Le ticket à gratter reste disponible en mode démo si aucune clé API n’est configurée.

## Configuration

Par défaut, l’app vise `http://localhost:8000`. Pour pointer vers une autre API, crée un fichier `.env` à la racine du projet avec :

```bash
VITE_EPIBET_API_URL=http://localhost:8000
```

## Lancement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- La session API, l’email et le jeu sélectionné sont conservés dans `localStorage`.
- Si l’API est indisponible, le mode démo continue de fonctionner pour tester le ticket localement.
