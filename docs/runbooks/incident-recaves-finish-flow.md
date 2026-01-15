# Runbook: Incident Recaves / Finish-Flow

## Objectif

Ce runbook documente le diagnostic et la resolution des incidents lies au bug `rebuyEndLevel=0` et au flux de fin de tournoi.

### Symptomes typiques

- `rebuyEndLevel` retourne `null` apres un PATCH avec valeur `0`
- Impossible d'eliminer un joueur ("Periode de recaves ouverte")
- Tournoi bloque, ne peut pas passer en `FINISHED`
- Erreur "final ranks are incomplete" lors de la cloture

---

## Commande officielle : recipe:tech

### Local (serveur dev sur port 3003)

```powershell
npm run recipe:tech
```

### Production (Fly.io)

```powershell
$env:RECIPE_BASE_URL="https://wpt-villelaure.fly.dev"; npm run recipe:tech
```

### Mode headed (debug visuel)

```powershell
npm run recipe:tech:headed
```

---

## Lecture des erreurs

| Symptome | Cause probable | Action |
|----------|----------------|--------|
| `rebuyEndLevel=null` apres PATCH 0 | Bug persistence `0` vs `null` | Verifier `tournament-utils.ts` et `route.ts` |
| `Periode de recaves ouverte` lors elimination | `currentLevel <= rebuyEndLevel` ou `rebuyEndLevel=null` | Verifier que rebuyEndLevel est bien persiste |
| `final ranks are incomplete` | Joueurs sans `finalRank` | S'assurer que toutes les eliminations sont faites |
| Test 05 echoue | Ordre des tests incorrect | Busts AVANT rebuyEndLevel=0, eliminations APRES |
| `tournamentCompleted=false` | Dernier joueur non auto-rank | Verifier logique auto-finish dans eliminations |

---

## Diagnostic temporaire (securise)

### Activer le mode diagnostic

```powershell
# 1. Generer un token aleatoire
$token = -join ((65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
Write-Host "Token: $token"

# 2. Configurer les secrets Fly
fly secrets set RECIPE_DIAGNOSTICS=1 DIAG_TOKEN=$token --app wpt-villelaure

# 3. Attendre le redemarrage
fly status --app wpt-villelaure
```

### Appeler les endpoints diag

```powershell
# Header requis
$headers = @{ "X-Diag-Token" = "VOTRE_TOKEN" }

# Exemple: GET tournament state
Invoke-RestMethod -Uri "https://wpt-villelaure.fly.dev/api/diag/tournaments/TOURNAMENT_ID" -Headers $headers
```

### Verifier que diag est actif

```powershell
# Le header x-recipe-diagnostics doit retourner "on"
curl -I https://wpt-villelaure.fly.dev/api/health
```

### Desactiver le mode diagnostic

```powershell
fly secrets unset RECIPE_DIAGNOSTICS DIAG_TOKEN --app wpt-villelaure
fly status --app wpt-villelaure

# Verification: doit retourner "off"
curl -I https://wpt-villelaure.fly.dev/api/health | Select-String "x-recipe-diagnostics"
```

---

## Fly.io - Commandes rapides

### Statut de l'application

```powershell
fly status --app wpt-villelaure
```

### Historique des releases

```powershell
fly releases --app wpt-villelaure
```

### Logs en temps reel

```powershell
fly logs --app wpt-villelaure
```

### Redemarrage force

```powershell
fly apps restart wpt-villelaure
```

### Deploiement manuel

```powershell
fly deploy --app wpt-villelaure
```

### Secrets actuels (liste)

```powershell
fly secrets list --app wpt-villelaure
```

---

## Gouvernance du repository

### Protection de la branche master

| Regle | Valeur |
|-------|--------|
| Push direct | Interdit |
| PR obligatoire | Oui |
| Checks requis | `unit-tests`, `e2e-finish-flow` |
| Strict (branche a jour) | Oui |
| Bypass admin | Non (`never`) |

### Workflow CI

Le workflow `.github/workflows/ci.yml` execute :

1. **unit-tests** : Tests Jest (`npm test`)
2. **e2e-finish-flow** : Guard Playwright (`npm run recipe:finish-flow`)

### Merger une PR

```powershell
# Via GitHub CLI (apres CI verte)
gh pr merge <PR_NUMBER> --merge --delete-branch
```

---

## Fichiers cles

| Fichier | Role |
|---------|------|
| `scripts/recipe/finish-flow.spec.ts` | Test E2E guard (scenario complet) |
| `scripts/recipe/helpers.ts` | Helpers partages (Reporter, RecipeClient) |
| `.github/workflows/ci.yml` | Definition CI GitHub Actions |
| `app/api/tournaments/[id]/route.ts` | API PATCH tournament (rebuyEndLevel) |
| `lib/tournament-utils.ts` | Logique metier tournoi |

---

## Checklist incident

- [ ] Identifier le symptome exact (logs, erreur API)
- [ ] Executer `npm run recipe:tech` en local
- [ ] Si echec local : investiguer le code
- [ ] Si OK local mais KO prod : activer diag temporaire
- [ ] Collecter les donnees diag
- [ ] Desactiver diag immediatement apres
- [ ] Creer une PR avec le fix
- [ ] Attendre CI verte avant merge
- [ ] Deployer sur Fly.io
- [ ] Re-executer recipe:tech contre prod

---

## Contacts

- Repository : https://github.com/gmaknn/poker-championship
- Fly.io App : https://wpt-villelaure.fly.dev
- GitHub Actions : https://github.com/gmaknn/poker-championship/actions
