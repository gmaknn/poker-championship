# Session de Reprise - Poker Championship
**Date de la session**: 7 novembre 2025
**Statut du projet**: Phase 1 MVP quasi complète, début Phase 2

---

## 🎯 ÉTAT ACTUEL DU PROJET

### Fonctionnalités Complétées ✅

#### 1. **Gestion des Joueurs**
- CRUD complet (Create, Read, Update, Archive)
- Système d'archivage (pas de suppression pour historique)
- Champs: nom, prénom, pseudo, email, avatar, statut
- Fichier: `src/app/dashboard/players/page.tsx`

#### 2. **Gestion des Saisons**
- CRUD saisons avec configuration complète
- Paramètres de points (1er→16e+)
- Points d'élimination, bonus Leader Killer
- Système de malus de recave (paliers configurables)
- Paramètres: totalTournamentsCount, bestTournamentsCount (système des meilleures performances)
- Fichiers: `src/app/dashboard/seasons/page.tsx`, `prisma/schema.prisma` (lignes 9-36)

#### 3. **Gestion des Tournois**
- Création tournois avec toutes les options
- Statuts: DRAFT, PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
- Configuration: buy-in, starting chips, duration, light rebuy
- Association à une saison
- Fichiers: `src/app/dashboard/tournaments/page.tsx`, `src/app/dashboard/tournaments/[id]/page.tsx`

#### 4. **Structure des Blinds**
- Générateur automatique de structure
- Assistant intelligent selon durée/joueurs/stack
- Configuration manuelle possible (add/edit/delete levels)
- Système de breaks
- Fichier: `src/components/BlindStructureEditor.tsx`
- API: `src/app/api/tournaments/[id]/blinds/route.ts`

#### 5. **Timer de Tournoi**
- Timer avec pause/reprise/reset
- Changement de niveau auto et manuel
- Persistance de l'état (timerStartedAt, timerPausedAt, timerElapsedSeconds)
- Affichage niveau actuel + prochain niveau
- Fichier: `src/components/TournamentTimer.tsx`
- API: `src/app/api/tournaments/[id]/timer/route.ts`

#### 6. **Inscription et Répartition Tables**
- Inscription joueurs au tournoi
- **✨ NOUVEAU**: Checkbox de paiement (hasPaid) - lignes 267-281 de TournamentPlayersManager
- Répartition aléatoire équilibrée des tables
- Rééquilibrage automatique/manuel
- Fichiers:
  - `src/components/TournamentPlayersManager.tsx`
  - `src/components/TableDistribution.tsx`
- API: `src/app/api/tournaments/[id]/players/`, `src/app/api/tournaments/[id]/tables/`

#### 7. **Gestion des Recaves**
- Recave standard (incrémente rebuysCount)
- Light rebuy (lightRebuyUsed = true)
- Calcul automatique des malus selon paliers de la saison
- Fichier intégré: `src/components/TournamentPlayersManager.tsx` (lignes 167-186)
- API: `src/app/api/tournaments/[id]/rebuys/route.ts`

#### 8. **Gestion des Éliminations**
- Enregistrement éliminations (éliminé + éliminateur)
- Calcul automatique du rank (ordre d'élimination)
- Détection Leader Killer (isLeaderKill)
- **✨ NOUVEAU**: Fin automatique du tournoi quand 1 joueur reste
  - Le dernier joueur obtient automatiquement finalRank = 1
  - Tournoi passe à status = COMPLETED
  - Timestamp finishedAt enregistré
- Fichier: `src/components/EliminationManager.tsx`
- API: `src/app/api/tournaments/[id]/eliminations/route.ts` (lignes 209-252 pour auto-completion)

#### 9. **Système de Points et Résultats** ⭐ NOUVEAU
- **Calcul des points complet**:
  - Points de classement selon position finale (1er-16e+)
  - Points d'élimination (count × season.eliminationPoints)
  - Bonus Leader Killer (leaderKills × season.leaderKillerBonus)
  - Pénalités de recave (selon paliers)
  - Total = rankPoints + eliminationPoints + bonusPoints + penaltyPoints

- **API Results**:
  - GET: Calcule les résultats en temps réel (sans sauvegarder)
  - POST: Calcule et sauvegarde les points en DB
  - Fichier: `src/app/api/tournaments/[id]/results/route.ts`

- **Composant TournamentResults**:
  - Affichage statistiques tournoi (prize pool, buy-in, rebuys)
  - Classement avec visuels pour top 3 (trophées dorés/argent/bronze)
  - Détail des points (rank, élim, bonus, pénalité, total)
  - Bouton "Recalculer les points"
  - Fichier: `src/components/TournamentResults.tsx`
  - Intégré dans: `src/app/dashboard/tournaments/[id]/page.tsx` (onglet "Résultats")

#### 10. **Vue Spectateur TV** ⭐ NOUVEAU
- **Page publique optimisée pour affichage TV**:
  - Design full-screen avec gradients sombres
  - Timer géant avec compte à rebours en temps réel
  - Niveau actuel + prochain niveau (SB/BB/Ante)
  - Stats du tournoi (joueurs actifs, prize pool, buy-in, rebuys)
  - Top 10 des joueurs éliminés avec:
    - Visuels distincts pour top 3 (bordures dorées/argent/bronze)
    - Trophées avec icônes Lucide
    - Stats: éliminations, leader kills, points totaux
  - **Refresh automatique toutes les 5 secondes**
  - Fichier: `src/app/tv/[tournamentId]/page.tsx`
  - Bouton d'accès: "Vue TV" dans header du tournoi (ouvre nouvel onglet)

---

## 🗄️ STRUCTURE DE LA BASE DE DONNÉES

### Modèles Prisma (`prisma/schema.prisma`)

**Season** (lignes 9-36):
- Points de classement (pointsFirst → pointsSixteenth)
- eliminationPoints, leaderKillerBonus
- Malus recaves (freeRebuysCount, rebuyPenaltyTier1/2/3)
- totalTournamentsCount, bestTournamentsCount

**Player** (lignes 38-56):
- Données personnelles + status (ACTIVE/ARCHIVED)

**Tournament** (lignes 58-102):
- Lien saison + configuration complète
- Timer state (timerStartedAt, timerPausedAt, timerElapsedSeconds)
- currentLevel, prizePool, prizeDistribution
- finishedAt (nouvelle colonne ajoutée)

**TournamentPlayer** (lignes 126-160):
- **hasPaid**: Boolean (✨ nouveau - tracking paiement)
- finalRank, rebuysCount, lightRebuyUsed
- eliminationsCount, leaderKills
- **Points calculés**: rankPoints, eliminationPoints, bonusPoints, penaltyPoints, totalPoints
- prizeAmount

**BlindLevel** (lignes 104-118):
- Structure des blinds par tournoi
- isBreak pour les pauses

**Elimination** (lignes 162-175):
- eliminatedId, eliminatorId
- rank, level, isLeaderKill

**TableAssignment** (lignes 177-189):
- Répartition des joueurs aux tables

---

## 📂 ARCHITECTURE DES FICHIERS

### Pages Principales
```
src/app/dashboard/
├── page.tsx                          # Dashboard principal
├── players/page.tsx                  # Gestion joueurs
├── seasons/page.tsx                  # Gestion saisons
├── tournaments/
│   ├── page.tsx                      # Liste tournois
│   ├── new/page.tsx                  # Création tournoi
│   └── [id]/page.tsx                 # Détail tournoi (6 onglets)

src/app/tv/
└── [tournamentId]/page.tsx           # ⭐ Vue spectateur TV (NOUVEAU)
```

### Composants Clés
```
src/components/
├── TournamentPlayersManager.tsx      # Inscriptions + paiement
├── BlindStructureEditor.tsx          # Configuration blinds
├── TournamentTimer.tsx               # Timer + contrôles
├── EliminationManager.tsx            # Gestion éliminations
├── TableDistribution.tsx             # Répartition tables
└── TournamentResults.tsx             # ⭐ Affichage résultats (NOUVEAU)
```

### API Routes
```
src/app/api/
├── players/route.ts
├── seasons/route.ts
├── tournaments/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── blinds/route.ts
│       ├── players/
│       │   ├── route.ts
│       │   └── [playerId]/route.ts
│       ├── rebuys/route.ts
│       ├── eliminations/route.ts    # ⭐ Auto-completion (lignes 209-252)
│       ├── timer/route.ts
│       ├── tables/route.ts
│       └── results/route.ts         # ⭐ GET + POST points (NOUVEAU)
```

---

## 🔧 CONFIGURATIONS TECHNIQUES

### Stack
- **Framework**: Next.js 16.0.1 (App Router + Turbopack)
- **Database**: SQLite via Prisma ORM
- **UI**: shadcn/ui + Tailwind CSS
- **Icons**: lucide-react
- **Date**: date-fns (locale FR)
- **Validation**: zod

### Serveur
- **Port**: 3003
- **URL**: http://localhost:3003
- **Network**: http://192.168.1.8:3003

### Commandes
```bash
npm run dev          # Démarrer le serveur
npx prisma studio    # Interface DB
npx prisma db push   # Sync schema → DB
```

---

## ❌ FONCTIONNALITÉS MANQUANTES

### PHASE 1 MVP - À Compléter

#### 1. **Export PDF/Images des Résultats** (Priorité HAUTE)
**Cahier des charges**: Section 3.7.2 (lignes 352-355)

**À implémenter**:
- [ ] Export PDF de la fiche récapitulative tournoi
- [ ] Export image PNG/JPG optimisée WhatsApp (format 1080×1920 ou carré)
- [ ] Export HTML pour consultation web
- [ ] Bouton "Partager" dans TournamentResults component

**Contenu à exporter**:
- Podium avec gains
- Classement final avec points détaillés
- Tableau "Qui a éliminé qui"
- Stats du tournoi (prize pool, rebuys, etc.)

**Librairies suggérées**:
- `jsPDF` + `html2canvas` pour PDF
- `html-to-image` ou `dom-to-image` pour PNG/JPG

**Fichiers à modifier**:
- `src/components/TournamentResults.tsx` (ajouter boutons export)
- Créer `src/lib/exportUtils.ts` (fonctions d'export)

---

### PHASE 2 - Améliorations

#### 2. **Classement Général de la Saison** (Priorité HAUTE)
**Cahier des charges**: Section 3.8 (lignes 357-378)

**À créer**:
- [ ] Page `/dashboard/seasons/[id]/leaderboard`
- [ ] Tableau de classement avec:
  - Rang actuel
  - Variation de place (↑↓) - nécessite historique
  - Points totaux
  - Nombre de tournois joués
  - Meilleur résultat
  - Moyenne de points
- [ ] Vue détaillée par joueur:
  - Historique de tous ses tournois
  - Graphique d'évolution (Chart.js ou Recharts)
  - Mise en évidence des X meilleures performances
- [ ] **Système "Meilleures Performances"**:
  - Ne retenir que les Y meilleures journées (bestTournamentsCount)
  - Gérer si joueur a fait < Y tournois
- [ ] Export PDF classement + Image TOP 10

**API à créer**:
- `GET /api/seasons/[id]/leaderboard`
  - Récupérer tous les TournamentPlayer de la saison
  - Grouper par playerId
  - Trier et sélectionner les meilleures performances
  - Calculer le total
  - Retourner classement ordonné

**Composant à créer**:
- `src/components/SeasonLeaderboard.tsx`

#### 3. **Statistiques Complètes** (Priorité MOYENNE)
**Cahier des charges**: Section 3.9 (lignes 380-418)

**Stats par joueur** (3.9.1):
- [ ] Nombre de tournois joués
- [ ] Nombre de victoires
- [ ] Nombre de podiums (TOP 3)
- [ ] Taux de ROI (gains vs recaves)
- [ ] Moyenne de classement
- [ ] Total d'éliminations
- [ ] Plus forte progression/régression

**Records généraux**:
- [ ] Plus de victoires sur une saison
- [ ] Meilleur ratio éliminations/tournois
- [ ] Plus de recaves sur un tournoi
- [ ] Plus longue série de podiums
- [ ] Plus de bonus "Leader Killer"

**Top Sharks** (3.9.2):
- [ ] Classement par éliminations
- [ ] Graphique des duels (qui élimine qui)
- [ ] "Némésis" de chaque joueur

**Stats Ludiques** (3.9.3):
- [ ] 🐟 "Le Poisson" (plus de recaves)
- [ ] 🦈 "Le Requin" (meilleur ratio élim/tournoi)
- [ ] 📈 "Fusée" (plus forte progression)
- [ ] 📉 "Chute libre" (plus forte régression)
- [ ] 👑 "Assassin du Roi" (plus de Leader Killer)
- [ ] 🎯 "Régularité" (faible variation)
- [ ] 💰 "Money Man" (plus gros gains)

**Page à créer**:
- `src/app/dashboard/statistics/page.tsx`

**API à créer**:
- `GET /api/statistics/players`
- `GET /api/statistics/records`
- `GET /api/statistics/fun-stats`

#### 4. **Répartition Automatique des Gains** (Priorité MOYENNE)
**Cahier des charges**: Section 3.4.4 (lignes 234-246)

**Fonctionnalités**:
- [ ] Après fin de phase recave, calculer prize pool
- [ ] Proposer répartition auto selon nombre joueurs restants
  - Ex: 20 joueurs → Top 5 payés (50%/25%/15%/7%/3%)
  - Ex: 15 joueurs → Top 4 payés (45%/30%/15%/10%)
  - Ex: 10 joueurs → Top 3 payés (50%/30%/20%)
- [ ] Permettre modification manuelle
- [ ] Sauvegarder dans `tournament.prizeDistribution` (JSON)
- [ ] Attribuer prizeAmount aux TournamentPlayer à la fin

**UI à ajouter**:
- Modal ou section dans le tournoi
- Déclenchement: bouton "Configurer les gains" (visible quand status = IN_PROGRESS)

**API**:
- `PATCH /api/tournaments/[id]` (update prizeDistribution)

#### 5. **Templates de Structures** (Priorité BASSE)
**Cahier des charges**: Section 3.10.2 (lignes 429-432)

**Fonctionnalités**:
- [ ] Créer un modèle `BlindStructureTemplate` dans Prisma
- [ ] Sauvegarder une structure avec nom
- [ ] Liste des templates disponibles
- [ ] Appliquer template en un clic lors de création tournoi

**Schema Prisma à ajouter**:
```prisma
model BlindStructureTemplate {
  id              String   @id @default(cuid())
  name            String
  description     String?
  startingChips   Int
  targetDuration  Int
  levels          Json     // Array de levels
  createdAt       DateTime @default(now())
}
```

#### 6. **Assistant Jetons Physiques** (Priorité BASSE)
**Cahier des charges**: Section 3.4.2 (lignes 164-207)

**Fonctionnalités**:
- [ ] Calcul stack optimal selon durée/joueurs
- [ ] Proposition répartition jetons par joueur
  - Ex: 8×10 + 8×50 + 6×100 + 7×500 + 1×1000 = 5080
- [ ] Validation inventaire suffisant
- [ ] Export liste de préparation (PDF)

**UI**:
- Assistant intégré à la création de tournoi
- `src/components/ChipCalculator.tsx`

---

## 🚀 PROCHAINE SESSION - PLAN D'ACTION SUGGÉRÉ

### Option A: Compléter Phase 1 MVP
**Durée estimée**: 2-3h
1. Implémenter export PDF des résultats
2. Implémenter export image PNG pour WhatsApp
3. Tester tous les exports

### Option B: Démarrer Phase 2 (Classement)
**Durée estimée**: 3-4h
1. Créer API `/api/seasons/[id]/leaderboard`
   - Implémenter logique "meilleures performances"
2. Créer page `/dashboard/seasons/[id]/leaderboard`
3. Composant `SeasonLeaderboard` avec tableau
4. Graphique d'évolution basique

### Option C: Mix MVP + Phase 2
**Durée estimée**: 3-4h
1. Export image PNG/JPG des résultats (1h)
2. API Leaderboard (1h30)
3. Page Classement basique (1h30)

**🎯 RECOMMANDATION**: **Option C** - Terminer le MVP avec exports visuels + commencer le classement général (fonctionnalité clé du championnat)

---

## 📝 NOTES IMPORTANTES

### Problèmes Connus
- ⚠️ Warnings Next.js sur lockfiles multiples (non bloquant)
- ⚠️ Middleware deprecated → utiliser proxy (non urgent)

### Bugs Corrigés en Fin de Session
- ✅ **Vue TV**: Erreur `Cannot read properties of undefined (reading 'find')`
  - Problème: mauvais typage de `blindStructure` (était `BlindStructure | null` au lieu de `BlindLevel[] | null`)
  - Fix: Correction du type + accès direct à l'array au lieu de `.levels.find()`
  - Fichier: `src/app/tv/[tournamentId]/page.tsx` (lignes 76, 108, 143-148)

### Points d'Attention
1. **Sauvegarde auto**: Timer et éliminations sont bien persistés en DB
2. **Calcul points**: Bien testé avec tous les cas (leader killer, recaves, etc.)
3. **Async params**: Next.js 16 impose `params: Promise<{ id: string }>` + `const { id } = use(params)`

### Données de Test
- **Saison**: "Saison Test 2025" (cmhp0zrzf0000ws68y6pwddxp)
- **Joueurs**: 2 joueurs test (Alice, Bob)
- **Tournoi**: ID cmhp0zrzf0004ws6866iwim72

---

## 🔗 RESSOURCES UTILES

### Documentation
- Next.js 16: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- shadcn/ui: https://ui.shadcn.com
- Lucide Icons: https://lucide.dev

### Librairies à installer (si besoin)
```bash
npm install jspdf html2canvas
npm install html-to-image
npm install recharts  # Pour graphiques
```

---

**📅 Date de création de ce document**: 7 novembre 2025 - 19h30
**👤 Développeur**: Claude (Sonnet 4.5)
**✅ Statut**: Prêt pour reprise de session
