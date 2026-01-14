# Recette Technique - Poker Championship

## Objectif

Passe de recette **TECHNIQUE** (pas UX) pour valider avant mise en production :

- **Auth/API** : aucun HTML sur `/api/*`, codes HTTP corrects
- **Parcours data** : saison -> tournoi -> joueurs -> KO -> fin -> scoring -> classement -> stats
- **Persistance** : flags blinds `rebalanceTables` + `isRebuyEnd` persistants apres reload
- **Coherence** : totals/breakdowns coherents, pas de recalcul incoherent

## Prerequis

1. **Node.js** >= 18
2. **Playwright** installe (via `npm install`)
3. **Navigateur Chromium** installe (`npx playwright install chromium`)
4. Un compte **admin** sur l'environnement cible

## Variables d'environnement

| Variable              | Description                              | Exemple                              |
|-----------------------|------------------------------------------|--------------------------------------|
| `RECIPE_BASE_URL`     | URL de base de l'app                     | `https://wpt-villelaure.fly.dev`     |
| `RECIPE_ADMIN_EMAIL`  | Email du compte admin                    | `admin@wpt-villelaure.fr`            |
| `RECIPE_ADMIN_PASSWORD` | Mot de passe du compte admin           | `MonMotDePasse123!`                  |
| `RECIPE_HEADLESS`     | Mode headless (true/false, defaut: true) | `false` pour voir le navigateur      |

## Commande unique

```bash
# En local (app deja lancee sur localhost:3003)
npm run recipe:tech

# Sur environnement distant
RECIPE_BASE_URL=https://wpt-villelaure.fly.dev \
RECIPE_ADMIN_EMAIL=admin@wpt-villelaure.fr \
RECIPE_ADMIN_PASSWORD=MonSecret123 \
npm run recipe:tech
```

### Mode visible (debug)

```bash
RECIPE_HEADLESS=false npm run recipe:tech
# ou
npm run recipe:tech:headed
```

## Interpretation des resultats

### Sortie console

Le runner affiche en temps reel l'etat de chaque etape :

```
+------------------------------------------------------------+
|          RECETTE TECHNIQUE - POKER CHAMPIONSHIP            |
+------------------------------------------------------------+

OK 01.1 - GET /api/me retourne JSON
OK 01.2 - Utilisateur authentifie en tant qu'ADMIN
OK 02 - GET /api/health retourne JSON
OK 03.1 - POST /api/seasons retourne JSON
OK 03.2 - Saison creee avec ID: cm123abc...
...
```

### Verdict final

```
+------------------------------------------------------------+
|          OK VERDICT: GO TECHNIQUE                          |
+------------------------------------------------------------+
```

ou en cas d'echec :

```
+------------------------------------------------------------+
|          KO VERDICT: NO-GO TECHNIQUE                       |
+------------------------------------------------------------+

Etapes en echec:
  KO 07.2 - Flag rebalanceTables persistant sur niveau 3: rebalanceTables: false
```

### Codes de sortie

- `0` : GO TECHNIQUE (tous les tests passent)
- `1` : NO-GO TECHNIQUE (au moins un test echoue)

## Scenario couvert

| Etape | Description                                          |
|-------|------------------------------------------------------|
| 01    | Login admin et verification session                  |
| 02    | Health check API                                     |
| 03    | Creer une saison de test                             |
| 04    | Verifier que la saison est active                    |
| 05    | Creer un tournoi rattache a la saison                |
| 06    | Configurer les blinds avec flags speciaux            |
| 07    | Verifier persistance des flags blinds apres reload   |
| 08    | Recuperer ou creer des joueurs de test               |
| 09    | Inscrire les joueurs au tournoi                      |
| 10    | Demarrer le tournoi                                  |
| 11    | Enregistrer des eliminations (KO)                    |
| 12    | Verifier les eliminations enregistrees               |
| 13    | Terminer le tournoi                                  |
| 14    | Verifier les resultats du tournoi                    |
| 15    | Verifier le classement de la saison                  |
| 16    | Verifier les statistiques globales                   |
| 17    | Verifier les statistiques de la saison               |
| 18    | Verification finale: aucun endpoint API HTML         |

## Assertions critiques

### 1. JSON uniquement sur /api/*

Toute requete vers `/api/*` doit retourner :
- `Content-Type: application/json`
- Body ne commencant PAS par `<` ou `<!DOCTYPE`

### 2. Codes HTTP

| Cas                    | Status attendu |
|------------------------|----------------|
| Succes creation        | 200 ou 201     |
| Succes lecture         | 200            |
| Non authentifie        | 401            |
| Permission refusee     | 403            |
| Ressource inexistante  | 404            |

### 3. Persistance des flags blinds

Les flags suivants doivent persister apres un reload :
- `rebalanceTables` sur le niveau configure
- `isRebuyEnd` sur le niveau configure

### 4. Coherence des points

Pour chaque joueur dans les resultats :
- `totalPoints` doit etre coherent avec `rankPoints + eliminationPoints + bonusPoints - penaltyPoints`

## Donnees de test

Le runner cree ses propres donnees avec un prefixe unique :
- `RECIPE_{timestamp}_Season`
- `RECIPE_{timestamp}_Tournament`
- `RECIPE_{timestamp}_PlayerN`

Ces donnees peuvent etre identifiees et nettoyees ulterieurement si necessaire.

## Troubleshooting

### Le login echoue

1. Verifier les credentials admin
2. Verifier que l'app est accessible sur l'URL configuree
3. Essayer en mode `RECIPE_HEADLESS=false` pour voir le navigateur

### Timeout sur une etape

Le timeout global est de 120 secondes. Si une etape depasse :
1. Verifier la connexion reseau
2. Verifier que l'app n'est pas surchargee
3. Verifier les logs serveur

### Erreur "HTML detecte au lieu de JSON"

Cela indique que le middleware de protection des routes API ne fonctionne pas correctement. Verifier :
1. `src/middleware.ts` - config matcher
2. Les routes API retournent bien `NextResponse.json()`

## Integration CI/CD

```yaml
# Exemple GitHub Actions
- name: Run technical recipe
  env:
    RECIPE_BASE_URL: ${{ secrets.STAGING_URL }}
    RECIPE_ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
    RECIPE_ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
  run: npm run recipe:tech
```
