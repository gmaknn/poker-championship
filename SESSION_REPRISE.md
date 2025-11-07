# Script de Reprise - Poker Championship Management

**Dernière mise à jour:** 7 novembre 2025 - Session de développement structure des blinds

---

## 📊 État actuel du projet

### ✅ Fonctionnalités complétées (MVP Phase 1 - Partiellement complète)

#### 1. **Infrastructure de base** ✅ COMPLÈTE
- Next.js 15 avec App Router
- TypeScript
- SQLite (Prisma ORM)
- NextAuth v5 (authentification temporairement désactivée dans les API)
- Tailwind CSS v4
- Port: 3003
- Repository: https://github.com/gmaknn/poker-championship

#### 2. **Gestion des Saisons** ✅ COMPLÈTE
- API CRUD complète (`/api/seasons`, `/api/seasons/[id]`)
- Interface avec onglets (Général, Points, Recaves)
- Tous les paramètres de scoring visibles et fonctionnels
- Page: `/dashboard/seasons`

#### 3. **Gestion des Tournois** ✅ COMPLÈTE
- API CRUD complète (`/api/tournaments`, `/api/tournaments/[id]`)
- Interface avec onglets (Général, Configuration)
- Formulaire de création/édition fonctionnel
- Affichage en cartes avec filtres par saison
- Page liste: `/dashboard/tournaments`
- Page détaillée: `/dashboard/tournaments/[id]` (avec 4 onglets)

#### 4. **Gestion des Joueurs** ✅ COMPLÈTE
- API CRUD complète (`/api/players`, `/api/players/[id]`)
- Interface avec modal de création/édition
- Affichage des statistiques (tournois joués, éliminations)
- Archivage plutôt que suppression (préserve l'historique)
- Page: `/dashboard/players`

#### 5. **Structure des Blinds** ✅ COMPLÈTE (NOUVEAU!)
- **API Routes:**
  - `/api/tournaments/[id]/blinds` - GET, POST, DELETE
  - `/api/tournaments/[id]/blinds/generate` - Génération automatique
- **Générateur automatique** (`src/lib/blindGenerator.ts`):
  - Algorithme de progression intelligente (~40-50% par niveau)
  - Arrondi automatique à des valeurs "agréables"
  - 3 presets: Turbo (2h), Standard (3h), Deep Stack (4h)
  - Calcul de statistiques (durée, stack BB, etc.)
  - Validation de structure
- **Éditeur visuel** (`src/components/BlindStructureEditor.tsx`):
  - Affichage des stats en temps réel
  - Génération via presets ou paramètres personnalisés
  - Édition manuelle niveau par niveau
  - Ajout/suppression de niveaux
- **Intégration:**
  - Onglet "Structure des blinds" dans la page tournoi
  - Statistiques affichées sur les cartes de tournoi

---

## ⚠️ Points importants à retenir

### 1. **Noms des champs Prisma** (différents de l'intuition):
```typescript
// Utiliser ces noms exacts :
buyInAmount         // pas buyIn
targetDuration      // pas estimatedDuration
totalPlayers        // pas maxPlayers
tournamentPlayers   // relation, pas players
blindLevels         // relation pour les niveaux de blinds
```

### 2. **Authentification**
Temporairement désactivée dans les routes API (commentée avec TODO):
```typescript
// TODO: Add authentication check when NextAuth v5 is properly configured
```

### 3. **Commandes utiles**
```bash
cd C:\Users\gmakn\projets\poker-championship

npm run dev          # Démarre sur port 3003
npm run db:studio    # Ouvre Prisma Studio
npm run db:push      # Applique les changements de schéma

# En cas de problème de cache:
rm -rf .next && npm run dev
```

### 4. **Navigation principale**
- **Login:** http://localhost:3003/login
  - Email: admin@poker.com
  - Mot de passe: admin123
- **Dashboard:** http://localhost:3003/dashboard
- **Tournois:** http://localhost:3003/dashboard/tournaments
- **Détail tournoi:** http://localhost:3003/dashboard/tournaments/[id]

---

## 📋 Prochaines étapes (MVP Phase 1 - Suite)

### 🔴 Priorité 1 : Inscription des joueurs aux tournois
- [ ] Créer l'API d'inscription (`/api/tournaments/[id]/players`)
- [ ] Onglet "Joueurs inscrits" dans la page tournoi
- [ ] Modal d'inscription depuis la page tournoi
- [ ] Gestion du modèle TournamentPlayer
- [ ] Affichage de la liste des inscrits avec buy-ins/rebuys

### 🟡 Priorité 2 : Timer de tournoi
- [ ] Composant timer avec gestion des niveaux de blinds
- [ ] Affichage du niveau actuel (SB/BB/Ante)
- [ ] Pause/Reprise du timer
- [ ] Changement automatique de niveau
- [ ] Persistance de l'état du timer
- [ ] Onglet "Timer" dans la page tournoi

### 🟡 Priorité 3 : Gestion des éliminations
- [ ] Interface pour enregistrer les éliminations
- [ ] Sélection du joueur éliminé et éliminateur
- [ ] Détection automatique du leader killer
- [ ] Calcul des points (élimination + bonus leader killer)
- [ ] Historique des éliminations

### 🟢 Priorité 4 : Distribution des tables
- [ ] Algorithme d'assignation automatique des tables
- [ ] Interface de visualisation des tables
- [ ] Gestion du nombre de places par table
- [ ] Rééquilibrage automatique après éliminations

### 🟢 Priorité 5 : Gestion des recaves
- [ ] Interface de saisie des recaves standard
- [ ] Gestion du "light rebuy" (recave allégée)
- [ ] Calcul automatique des malus selon la saison
- [ ] Limite de recaves par niveau

### 🟢 Priorité 6 : Résultats et classement
- [ ] Calcul automatique des points selon le classement final
- [ ] Attribution des positions finales
- [ ] Calcul du prize pool et distribution
- [ ] Mise à jour du classement de saison

### 🔵 Priorité 7 : Vue spectateur TV
- [ ] Page publique sans authentification
- [ ] Affichage temps réel du timer
- [ ] Classement en direct
- [ ] Prochaines blinds
- [ ] Prize pool

---

## 🗂️ Structure des fichiers clés

```
C:\Users\gmakn\projets\poker-championship\
├── prisma/
│   ├── schema.prisma            ✅ Modèle complet (10 models)
│   └── dev.db                   ✅ SQLite (180 KB avec données)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/            ✅ NextAuth v5
│   │   │   ├── seasons/         ✅ Complète
│   │   │   ├── tournaments/     ✅ Complète + blinds
│   │   │   └── players/         ✅ Complète
│   │   ├── dashboard/
│   │   │   ├── page.tsx         ✅ Dashboard principal
│   │   │   ├── seasons/         ✅ Complète
│   │   │   ├── tournaments/     ✅ Liste + détail avec blinds
│   │   │   ├── players/         ✅ Complète
│   │   │   ├── leaderboard/     ❌ TODO
│   │   │   └── statistics/      ❌ TODO
│   │   └── login/               ✅ Page de connexion
│   ├── components/
│   │   ├── ui/                  ✅ Badge, Button, Card, Dialog, Input, Label, Tabs
│   │   ├── layout/              ✅ Sidebar
│   │   └── BlindStructureEditor.tsx  ✅ Éditeur de blinds
│   ├── lib/
│   │   ├── auth.ts              ✅ NextAuth v5
│   │   ├── prisma.ts            ✅ Prisma client
│   │   ├── blindGenerator.ts    ✅ Générateur de structures
│   │   └── utils.ts             ✅ Utilitaires
│   └── types/
│       └── index.ts             ✅ Types TypeScript
├── DEVELOPMENT_STATUS.md        ✅ État détaillé
├── cahier_des_charges_poker_championship.md  ✅ Cahier des charges
└── SESSION_REPRISE.md          ✅ Ce fichier
```

---

## 🔧 Problèmes résolus lors de la dernière session

1. ✅ Création complète de l'API des blind levels
2. ✅ Générateur automatique de structures de blinds
3. ✅ Éditeur visuel avec presets
4. ✅ Intégration dans la page tournoi
5. ✅ Correction des relations Prisma dans `/api/tournaments/[id]`
6. ✅ Ajout du bouton "Détails" sur les cartes de tournoi
7. ✅ Mise à jour pour Next.js 15 (params en Promise)
8. ✅ Problème de cache Next.js résolu (rm -rf .next)
9. ✅ Configuration du remote Git et push vers GitHub

---

## 📊 Modèles Prisma principaux

### Season
```prisma
- Paramètres de scoring complets (points par position)
- Malus de recave (3 tiers: -50, -100, -150)
- Système de meilleures performances
- eliminationPoints, leaderKillerBonus
```

### Tournament
```prisma
- buyInAmount, startingChips, targetDuration
- type, status, totalPlayers
- lightRebuyEnabled, lightRebuyMinBB, lightRebuyAmount
- levelDuration, rebuyEndLevel
- Relations: season, tournamentPlayers, blindLevels, eliminations, tableAssignments
```

### BlindLevel (NOUVEAU)
```prisma
- tournamentId (relation)
- level (numéro du niveau)
- smallBlind, bigBlind, ante
- duration (durée en minutes)
```

### TournamentPlayer
```prisma
- Lien tournament ↔ player
- rebuysCount, lightRebuyUsed
- finalRank, eliminationsCount, leaderKills
- rankPoints, eliminationPoints, bonusPoints, penaltyPoints, totalPoints
- prizeAmount
```

### Elimination
```prisma
- tournamentId, eliminatedId, eliminatorId
- rank (position de sortie)
- level (niveau où l'élimination a eu lieu)
- isLeaderKill (boolean)
```

---

## 🚀 Pour reprendre le développement

### 1. Démarrer l'environnement
```bash
# Naviguer dans le projet
cd C:\Users\gmakn\projets\poker-championship

# Vérifier que le port est libre
netstat -ano | findstr :3003
# Si occupé : taskkill //F //PID [PID]

# Démarrer le serveur
npm run dev

# Accéder à l'application
# http://localhost:3003
# Login: admin@poker.com / admin123
```

### 2. Tester la structure des blinds
1. Aller sur http://localhost:3003/dashboard/tournaments
2. Cliquer sur "Détails" d'un tournoi
3. Onglet "Structure des blinds"
4. Cliquer sur "Générer" → Choisir un preset (Standard recommandé)
5. Modifier si nécessaire
6. Cliquer sur "Sauvegarder"

### 3. Vérifier Git
```bash
git status
git log --oneline -3
git remote -v
```

---

## 💡 Rappels techniques

### Architecture
- **Working directory:** `C:\Users\gmakn\projets\poker-championship`
- **Base de données:** `prisma/dev.db` (SQLite)
- **Port:** 3003
- **NextAuth v5:** Configuré mais auth API commentée

### Hot reload
- Fonctionne en général
- Si problème de cache: `rm -rf .next`
- Redémarrer le serveur si modifications de schema.prisma

### Git workflow
```bash
git status
git add .
git commit -m "message"
git push origin master
```

### Derniers commits
```
769436f - Add complete poker championship management system with blind structure generator
7eb05cf - Initial commit from Create Next App
```

---

## 📝 Notes de développement

### Structure des blinds - Fonctionnalités clés
1. **Génération automatique:**
   - Algorithme basé sur progression ~40-50% par niveau
   - Arrondi intelligent (25, 50, 100, 250, 500, 1000)
   - Stack de départ calculé en BB
   - Antes démarrant au niveau 5 par défaut

2. **Presets disponibles:**
   - **Turbo:** 2h, niveaux 8min, antes niveau 4
   - **Standard:** 3h, niveaux 12min, antes niveau 5
   - **Deep Stack:** 4h, niveaux 15min, antes niveau 6

3. **Statistiques affichées:**
   - Durée totale
   - Stack de départ en BB
   - Progression des blinds (départ → fin)
   - Niveau de début des antes

---

## 🎯 Objectif de la prochaine session

**Focus:** Inscription des joueurs aux tournois

**Fichiers à créer:**
- `src/app/api/tournaments/[id]/players/route.ts` - API d'inscription
- `src/app/api/tournaments/[id]/players/[playerId]/route.ts` - PATCH/DELETE joueur
- `src/components/TournamentPlayersManager.tsx` - Interface de gestion
- Mise à jour de `src/app/dashboard/tournaments/[id]/page.tsx` - Onglet joueurs

**Fonctionnalités attendues:**
- Liste des joueurs inscrits
- Bouton "Inscrire un joueur" avec modal
- Affichage buy-ins et rebuys
- Désinscrire un joueur (si tournoi non démarré)
- Compteur de joueurs inscrits

---

## 📞 Ressources

- **GitHub:** https://github.com/gmaknn/poker-championship
- **Prisma Docs:** https://www.prisma.io/docs
- **Next.js 15 Docs:** https://nextjs.org/docs
- **shadcn/ui:** https://ui.shadcn.com

---

**Session terminée le:** 7 novembre 2025
**Prochain objectif:** Inscription des joueurs aux tournois
**État du serveur:** En cours d'exécution sur port 3003
