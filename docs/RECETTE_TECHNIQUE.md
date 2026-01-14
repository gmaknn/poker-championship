# Recette Technique - Poker Championship (PROD-SAFE)

## Objectif

Passe de recette **TECHNIQUE** (pas UX) pour valider avant mise en production :

- **Auth/API** : aucun HTML sur `/api/*`, codes HTTP corrects (200/201/401/403)
- **Parcours data** : saison -> tournoi -> joueurs -> KO -> fin -> scoring -> classement
- **Persistance** : flags blinds `rebalanceTables` + `isRebuyEnd` persistants apres reload
- **Scoring** : assertions numeriques strictes (pas d'adaptation aux donnees)

## Prerequis

1. **Node.js** >= 18
2. **Playwright** installe (via `npm install`)
3. **Navigateur Chromium** installe (`npx playwright install chromium`)
4. Un compte **admin** sur l'environnement cible

## Variables d'environnement

| Variable                | Description                                | Defaut                          |
|-------------------------|--------------------------------------------|---------------------------------|
| `RECIPE_BASE_URL`       | URL de base de l'app                       | `http://localhost:3003`         |
| `RECIPE_ADMIN_EMAIL`    | Email du compte admin                      | `admin@wpt-villelaure.fr`       |
| `RECIPE_ADMIN_PASSWORD` | Mot de passe du compte admin               | `Admin123!`                     |
| `RECIPE_HEADLESS`       | Mode headless (true/false)                 | `true`                          |
| `RECIPE_RESET_AFTER_RUN`| Reset prod apres run (true/false)          | `true` si prod, `false` si local|
| `PROD_RESET_TOKEN`      | Token pour reset automatique (optionnel)   | -                               |

## Commandes

```bash
# En local (app deja lancee sur localhost:3003)
npm run recipe:tech

# Sur environnement prod/staging
RECIPE_BASE_URL=https://wpt-villelaure.fly.dev \
RECIPE_ADMIN_EMAIL=admin@wpt-villelaure.fr \
RECIPE_ADMIN_PASSWORD=MonSecret123 \
npm run recipe:tech

# Mode visible (debug)
npm run recipe:tech:headed

# Prod avec reset automatique (si token disponible)
RECIPE_BASE_URL=https://wpt-villelaure.fly.dev \
RECIPE_ADMIN_EMAIL=admin@wpt-villelaure.fr \
RECIPE_ADMIN_PASSWORD=MonSecret123 \
PROD_RESET_TOKEN=<your-token> \
npm run recipe:tech
```

---

## Nettoyage Prod

> **IMPORTANT : Zero pollution durable**

### Comportement automatique

| Cible                        | Reset apres run | Action                          |
|------------------------------|-----------------|----------------------------------|
| `localhost` / `127.0.0.1`    | NON (defaut)    | Donnees conservees               |
| URL prod (Fly, etc.)         | OUI (defaut)    | Reset requis apres run           |

### Avec `PROD_RESET_TOKEN`

Si vous fournissez `PROD_RESET_TOKEN` et executez depuis un contexte avec acces DB :
- Le reset est tente automatiquement a la fin du run
- Resultat affiche dans le rapport

### Sans `PROD_RESET_TOKEN` en mode prod

Le runner termine en **NO-GO** :
```
VERDICT: NO-GO TECHNIQUE

Cause: Reset prod requis mais non execute.
Solution: Fournir PROD_RESET_TOKEN ou executer manuellement:
  flyctl ssh console --app wpt-villelaure
  ALLOW_PROD_RESET=YES PROD_RESET_TOKEN=<token> npm run reset:prod
```

### Desactiver le reset explicitement

Si vous souhaitez volontairement laisser les donnees en prod :
```bash
RECIPE_RESET_AFTER_RUN=false npm run recipe:tech
```

Le verdict sera `GO TECHNIQUE (RESET DESACTIVE)` avec un message explicite.

---

## Interpretation des resultats

### Sortie console

```
+------------------------------------------------------------+
|      RECETTE TECHNIQUE - POKER CHAMPIONSHIP (PROD-SAFE)    |
+------------------------------------------------------------+
|  Base URL: https://wpt-villelaure.fly.dev                  |
|  Mode: PRODUCTION                                          |
|  Reset apres run: OUI                                      |
+------------------------------------------------------------+

OK 00.1 - /api/me non-auth retourne 401 ou 403
OK 00.2 - Content-Type est application/json
OK 00.3 - Body ne contient pas HTML
OK 01.1 - GET /api/me retourne JSON
OK 01.2 - Utilisateur authentifie (id: clxx...)
...
OK 14.2 - P1 a 100 points KO (2 x 50)
OK 14.3 - P1 (rank 1) a des rankPoints > 0
OK 15.3 - P1 (1600 pts) > P2 (1000 pts)
...
OK 18 - CLEANUP: Reset manuel requis
```

### Verdicts possibles

| Verdict                                | Signification                                    |
|----------------------------------------|--------------------------------------------------|
| `GO TECHNIQUE`                         | Tous les tests OK, reset effectue (si requis)    |
| `GO TECHNIQUE (RESET DESACTIVE)`       | Tests OK, reset omis volontairement              |
| `NO-GO TECHNIQUE`                      | Tests KO OU reset prod requis mais non execute   |

### Codes de sortie

- `0` : GO TECHNIQUE
- `1` : NO-GO TECHNIQUE

---

## Scenario couvert (20 etapes)

| Etape | Description                                          |
|-------|------------------------------------------------------|
| 00    | API non-auth retourne 401/403 en JSON (jamais HTML)  |
| 01    | Login admin et verification session                  |
| 02    | Health check API                                     |
| 03    | Creer une saison de test (RECIPE_<ts>)               |
| 04    | Verifier que la saison est active                    |
| 05    | Creer un tournoi rattache a la saison                |
| 06    | Configurer les blinds avec flags speciaux            |
| 07    | Verifier persistance des flags blinds apres reload   |
| 08    | Creer 4 joueurs de test (deterministe)               |
| 09    | Inscrire les joueurs au tournoi                      |
| 10    | Demarrer le tournoi                                  |
| 10b   | Fermer la periode de recaves (rebuyEndLevel: 0)      |
| 11    | Enregistrer 2 KO par le meme joueur (P1)             |
| 12    | Verifier les eliminations enregistrees               |
| 13    | Terminer le tournoi avec rangs finaux                |
| 14    | Verifier les resultats (scoring strict numerique)    |
| 15    | Verifier le classement de la saison                  |
| 16    | Verifier les statistiques globales                   |
| 17    | Verification finale: aucun endpoint HTML             |
| 18    | CLEANUP / RESET prod (si applicable)                 |

---

## Assertions critiques

### 1. JSON uniquement sur /api/*

Toute requete vers `/api/*` doit retourner :
- `Content-Type: application/json`
- Body ne contenant PAS `<!doctype`, `<html`, ou commencant par `<`

### 2. Codes HTTP

| Cas                    | Status attendu |
|------------------------|----------------|
| Succes creation        | 200 ou 201     |
| Succes lecture         | 200            |
| Non authentifie        | 401            |
| Permission refusee     | 403            |

### 3. Persistance des flags blinds

Les flags suivants doivent persister apres un reload :
- `rebalanceTables` sur le niveau 3
- `isRebuyEnd` sur le niveau 4

### 4. Scoring numerique strict

> **HYPOTHESE** : Le runner suppose `eliminationPoints = 50` (default schema.prisma).
> Si ce parametre est configurable dynamiquement par saison, ajuster la source
> dans `SCHEMA_DEFAULT_ELIMINATION_POINTS` du runner.

- P1 fait 2 eliminations → `eliminationPoints = 100` (2 x 50)
- P1 rank 1 → `rankPoints > 0`
- `totalPoints >= rankPoints + eliminationPoints`
- P1 (rank 1 + 2 KO) > P2 (rank 2 + 0 KO) dans le classement saison

---

## Donnees de test

Le runner cree **systematiquement** ses propres donnees (jamais de reutilisation) :

- `RECIPE_{timestamp}_Season`
- `RECIPE_{timestamp}_Tournament`
- `RECIPE_{timestamp}_P1`, `_P2`, `_P3`, `_P4`

Ce prefixe unique permet :
- Tracabilite
- Nettoyage cible si necessaire
- Isolation entre runs

---

## Troubleshooting

### Le login echoue

1. Verifier les credentials admin
2. Verifier que l'app est accessible sur l'URL configuree
3. Essayer en mode `RECIPE_HEADLESS=false`

### Timeout sur une etape

Le timeout global est de 120 secondes. Verifier :
1. Connexion reseau
2. Charge de l'app
3. Logs serveur

### Erreur "HTML detecte au lieu de JSON"

Le middleware de protection des routes API ne fonctionne pas. Verifier :
1. `src/middleware.ts` - config matcher
2. Les routes API retournent bien `NextResponse.json()`

### Erreur scoring "eliminationPoints incorrect"

Le calcul des points KO ne correspond pas aux valeurs par defaut (50/elimination).
Verifier :
1. La saison creee a bien `eliminationPoints: 50`
2. Le calcul des points dans l'API `/api/tournaments/:id/results`

---

## Integration CI/CD

```yaml
# Exemple GitHub Actions
jobs:
  recipe-tech:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install chromium

      - name: Run technical recipe
        env:
          RECIPE_BASE_URL: ${{ secrets.STAGING_URL }}
          RECIPE_ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
          RECIPE_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
          RECIPE_RESET_AFTER_RUN: 'false'  # Reset manuel apres
        run: npm run recipe:tech

      - name: Reset staging (if needed)
        if: success()
        run: |
          # Trigger reset via Fly SSH or API
          echo "Reset staging manually or via CI secret"
```
