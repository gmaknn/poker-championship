# INVESTIGATION PHASE 1 - Rapport Détaillé

**Projet:** WPT Villelaure - Poker Championship
**Date:** 18 janvier 2026
**Auteur:** Investigation automatisée Claude Code

---

## Table des Matières

1. [Système de fin de recaves (isRebuyEnd)](#1-système-de-fin-de-recaves-isrebuyend)
2. [Système de points KO (leaderKill)](#2-système-de-points-ko-leaderkill)
3. [Système de recaves/busts](#3-système-de-recavesbusts)
4. [Système RBAC - Directeur de Tournoi](#4-système-rbac---directeur-de-tournoi)
5. [Problèmes identifiés et recommandations](#5-problèmes-identifiés-et-recommandations)

---

## 1. Système de fin de recaves (isRebuyEnd)

### 1.1 Comment fonctionne le flag `isRebuyEnd` sur BlindLevel ?

**Fichier principal:** `prisma/schema.prisma` (lignes 216-234)

```prisma
model BlindLevel {
  id            String      @id @default(cuid())
  tournamentId  String
  level         Int
  smallBlind    Int
  bigBlind      Int
  ante          Int         @default(0)
  duration      Int         @default(12)
  isBreak       Boolean     @default(false)
  rebalanceTables Boolean   @default(false)
  isRebuyEnd    Boolean     @default(false)  // ← FLAG DE FIN DE RECAVES
}
```

Le flag `isRebuyEnd` est un booléen sur chaque niveau de blind qui marque **"ce niveau est le dernier où les recaves standard sont autorisées"**.

**Synchronisation avec Tournament:**
```prisma
model Tournament {
  rebuyEndLevel Int?  // Niveau où se termine la période de recave
}
```

Lors de la sauvegarde de la structure des blindes, le système identifie le niveau avec `isRebuyEnd=true` et stocke son numéro dans `Tournament.rebuyEndLevel`.

### 1.2 Où et quand ce flag est-il utilisé ?

| Fichier | Utilisation |
|---------|-------------|
| `src/components/BlindStructureEditor.tsx` | UI: Checkbox "Fin recaves" pour éditer le flag |
| `src/app/api/tournaments/[id]/blinds/route.ts` | API: Persiste isRebuyEnd et synchro rebuyEndLevel |
| `src/lib/tournament-utils.ts` | Logique: `areRecavesOpen()` utilise rebuyEndLevel |
| `src/app/api/tournaments/[id]/rebuys/route.ts` | API: Bloque recaves si effectiveLevel > rebuyEndLevel |
| `src/app/api/tournaments/[id]/timer/route.ts` | API: Retourne `recavesOpen` calculé |

### 1.3 Comment le timer/tournoi sait-il qu'on est "après la fin des recaves" ?

**Fichier:** `src/lib/tournament-utils.ts` (lignes 63-95)

```typescript
export function areRecavesOpen(
  tournament: Pick<Tournament, 'status' | 'currentLevel' | 'rebuyEndLevel'>,
  effectiveLevel?: number,
  blindLevels?: Pick<BlindLevel, 'level' | 'isBreak'>[]
): boolean {
  // 1. Tournoi doit être en cours
  if (tournament.status !== 'IN_PROGRESS') return false;

  // 2. Pas de limite définie → toujours ouvert
  if (tournament.rebuyEndLevel === null) return true;

  // 3. Niveau courant <= rebuyEndLevel → ouvert
  const currentLevel = effectiveLevel ?? tournament.currentLevel;
  if (currentLevel <= tournament.rebuyEndLevel) return true;

  // 4. Cas spécial: pause juste après rebuyEndLevel → LIGHT rebuy autorisé
  if (blindLevels && currentLevel === tournament.rebuyEndLevel + 1) {
    const currentBlindLevel = blindLevels.find(bl => bl.level === currentLevel);
    if (currentBlindLevel?.isBreak) return true;
  }

  return false;
}
```

**Résumé de la logique:**

| Condition | Recaves Ouvertes ? |
|-----------|-------------------|
| Status ≠ IN_PROGRESS | ❌ Non |
| rebuyEndLevel = null | ✅ Oui (illimité) |
| currentLevel ≤ rebuyEndLevel | ✅ Oui |
| currentLevel = rebuyEndLevel + 1 ET isBreak | ✅ Oui (LIGHT uniquement) |
| currentLevel > rebuyEndLevel + 1 | ❌ Non |

---

## 2. Système de points KO (leaderKill)

### 2.1 Où est calculé/attribué le flag `isLeaderKill` sur Elimination ?

**Fichier:** `src/app/api/tournaments/[id]/eliminations/route.ts` (lignes 310-327)

```typescript
// Récupérer les éliminations existantes
const existingEliminations = await tx.elimination.findMany({
  where: { tournamentId },
});

// Compter les éliminations par joueur
const eliminationCounts = new Map<string, number>();
existingEliminations.forEach((elim) => {
  const count = eliminationCounts.get(elim.eliminatorId) || 0;
  eliminationCounts.set(elim.eliminatorId, count + 1);
});

// Calculer si c'est un leader kill
const currentEliminatorCount =
  (eliminationCounts.get(validatedData.eliminatorId) || 0) + 1;
eliminationCounts.set(validatedData.eliminatorId, currentEliminatorCount);

const maxEliminations = Math.max(...Array.from(eliminationCounts.values()));
const isLeaderKill = currentEliminatorCount === maxEliminations;
```

**Logique:** Un joueur obtient `isLeaderKill = true` si son nombre d'éliminations **égale le maximum** d'éliminations parmi tous les joueurs du tournoi (au moment de l'élimination).

### 2.2 Quelles conditions déclenchent l'attribution de points KO ?

**Stockage des compteurs:**

```prisma
model TournamentPlayer {
  eliminationsCount Int @default(0)  // Nombre total d'éliminations
  leaderKills       Int @default(0)  // Nombre de leader kills
}

model Season {
  eliminationPoints Int @default(50)   // Points par élimination finale
  leaderKillerBonus Int @default(25)   // Bonus par leader kill
}
```

**Calcul des points à la fin du tournoi:**

```typescript
// src/app/api/tournaments/[id]/eliminations/route.ts (lignes 73-116)
eliminationPoints = tp.eliminationsCount * tournament.season.eliminationPoints;
bonusPoints = tp.leaderKills * tournament.season.leaderKillerBonus;
```

### 2.3 Le système vérifie-t-il actuellement si on est après la fin des recaves ?

**✅ OUI** - Le système bloque les éliminations pendant la période de recaves.

**Fichier:** `src/app/api/tournaments/[id]/eliminations/route.ts` (ligne 224)

```typescript
if (areRecavesOpen(tournament, effectiveLevel, tournament.blindLevels)) {
  return NextResponse.json({
    error: 'Période de recaves encore ouverte. Utilisez le formulaire de perte de tapis.',
  }, { status: 400 });
}
```

**⚠️ PROBLÈME IDENTIFIÉ:** Le système ne distingue PAS les éliminations "pendant recaves" (qui donnent lieu à un bust + recave) des éliminations "après recaves" (définitives). Actuellement:
- Pendant recaves → BustEvent
- Après recaves → Elimination avec tous les bonus (élim + leader kill)

**Il manque:** Un bonus "élim bust" (25 pts) pour les joueurs qui éliminent pendant la période de recaves.

---

## 3. Système de recaves/busts

### 3.1 Comment fonctionne BustEvent ? Quels champs ?

**Fichier:** `prisma/schema.prisma` (lignes 275-298)

```prisma
model BustEvent {
  id              String      @id @default(cuid())
  tournamentId    String
  tournament      Tournament  @relation(...)

  eliminatedId    String      // Joueur qui a perdu son tapis
  eliminated      TournamentPlayer @relation("BustEliminated", ...)

  killerId        String?     // Joueur qui a pris le tapis (optionnel)
  killer          TournamentPlayer? @relation("BustKiller", ...)

  level           Int         // Niveau auquel le bust a eu lieu
  createdAt       DateTime    @default(now())

  recaveApplied   Boolean     @default(false)  // Si une recave a été faite
}
```

**Champs clés:**
- `eliminatedId`: Référence au TournamentPlayer qui a busté
- `killerId`: Optionnel - qui a pris ses jetons
- `level`: Niveau du tournoi au moment du bust
- `recaveApplied`: Flag booléen indiquant si le joueur a recavé

### 3.2 Différence entre bust + recave vs élimination définitive

| Phase | Action | Modèle | Résultat |
|-------|--------|--------|----------|
| Pendant recaves | Joueur bust | BustEvent | Peut recaver, reste en jeu |
| Pendant recaves | Joueur recave | BustEvent.recaveApplied = true | TournamentPlayer.rebuysCount++ |
| Après recaves | Joueur bust | Elimination | finalRank assigné, sorti définitivement |

**Workflow:**

```
PENDANT RECAVES (currentLevel ≤ rebuyEndLevel)
├─ POST /api/tournaments/[id]/busts
│  └─ Crée BustEvent (recaveApplied=false)
├─ POST /api/tournaments/[id]/busts/[bustId]/recave
│  └─ recaveApplied=true, rebuysCount++, penaltyPoints calculé

APRÈS RECAVES (currentLevel > rebuyEndLevel)
├─ POST /api/tournaments/[id]/eliminations
│  └─ Crée Elimination, finalRank assigné
```

### 3.3 Logique de half rebuy vs full rebuy

**Configuration du tournoi:**

```prisma
model Tournament {
  buyInAmount       Float   @default(10)    // Prix rebuy standard (10€)
  lightRebuyEnabled Boolean @default(false)
  lightRebuyMinBB   Int     @default(30)
  lightRebuyAmount  Float   @default(5)     // Prix light rebuy (5€)
}
```

| Type | Prix | Quand | Limite | Compteur |
|------|------|-------|--------|----------|
| STANDARD | 10€ | Pendant rebuyEndLevel | maxRebuysPerPlayer | rebuysCount |
| LIGHT | 5€ | Pause après rebuyEndLevel | 1 par joueur | lightRebuyUsed |

**Fichier:** `src/app/api/tournaments/[id]/rebuys/route.ts`

```typescript
const rebuySchema = z.object({
  playerId: z.string().cuid(),
  type: z.enum(['STANDARD', 'LIGHT']),
});
```

### 3.4 Comment le prix (5€ vs 10€) est-il déterminé ?

**Fichier:** `src/app/api/tournaments/[id]/prize-pool/route.ts` (lignes 90-102)

```typescript
const totalBuyIns = paidPlayers.length * tournament.buyInAmount;

const totalRebuys = tournament.tournamentPlayers.reduce((sum, p) => {
  return sum + (p.rebuysCount * tournament.buyInAmount);  // 10€ par rebuy standard
}, 0);

const totalLightRebuys = tournament.tournamentPlayers.reduce((sum, p) => {
  return sum + (p.lightRebuyUsed ? tournament.lightRebuyAmount : 0);  // 5€ par light
}, 0);

const calculatedPrizePool = totalBuyIns + totalRebuys + totalLightRebuys;
```

**⚠️ PROBLÈME IDENTIFIÉ:** Le calcul du malus de recave ne prend pas en compte le light rebuy comme 0.5 recave. Actuellement le light rebuy n'impacte pas le malus.

---

## 4. Système RBAC - Directeur de Tournoi

### 4.1 Comment fonctionne PlayerRoleAssignment ?

**Fichier:** `prisma/schema.prisma`

```prisma
model PlayerRoleAssignment {
  id        String      @id @default(cuid())
  playerId  String
  player    Player      @relation(...)
  role      PlayerRole
  createdAt DateTime    @default(now())

  @@unique([playerId, role])
}

enum PlayerRole {
  PLAYER
  TOURNAMENT_DIRECTOR
  ANIMATOR
  ADMIN
}
```

**Fonctionnement:**
- Un joueur a un rôle **principal** dans `Player.role`
- Les rôles **additionnels** sont dans `PlayerRoleAssignment`
- Un joueur peut cumuler plusieurs rôles

### 4.2 Comment fonctionne TournamentDirector ?

**Fichier:** `prisma/schema.prisma`

```prisma
model TournamentDirector {
  id            String      @id @default(cuid())
  tournamentId  String
  tournament    Tournament  @relation(...)
  playerId      String
  player        Player      @relation(...)
  assignedAt    DateTime    @default(now())
  assignedById  String?     // Qui a fait l'assignation

  @@unique([tournamentId, playerId])
}
```

**Fonctionnement:**
- Lien N-to-N entre Tournament et Player
- Un tournoi peut avoir plusieurs directeurs
- Un joueur peut être directeur de plusieurs tournois

### 4.3 Pourquoi l'interface dit "Aucun directeur de tournoi disponible" ?

**🔴 BUG IDENTIFIÉ**

**Fichier problématique:** `src/app/api/tournaments/[id]/directors/route.ts`

L'API GET ne retourne pas `availableDirectors`:

```typescript
// Réponse actuelle (incomplète)
return NextResponse.json({
  tournamentId,
  createdBy: tournament.createdBy,
  directors: directors.map(d => ({...})),
  // ❌ MANQUE: availableDirectors
});
```

**Le composant UI attend:**

```typescript
// src/components/TournamentDirectorsManager.tsx
const directorsData = await directorsRes.json();
setDirectors(directorsData.directors || []);
setAvailableDirectors(directorsData.availableDirectors || []);  // ← UNDEFINED!
```

Comme `availableDirectors` est `undefined`, la valeur par défaut `[]` est utilisée, ce qui affiche le message d'erreur.

### 4.4 Quel est le workflow attendu pour assigner un TD ?

**Workflow théorique:**

1. ADMIN accède à la page de détail d'un tournoi
2. GET `/api/tournaments/[id]/directors` devrait retourner:
   - `directors`: TD déjà assignés
   - `availableDirectors`: Joueurs avec rôle TD/ADMIN non assignés
3. ADMIN sélectionne un joueur dans la liste
4. POST `/api/tournaments/[id]/directors` avec `playerId`
5. TD assigné peut maintenant gérer le tournoi

### 4.5 Est-ce un bug ou une feature incomplète ?

**C'est un BUG dans l'API GET** - la feature a été partiellement implémentée:
- ✅ Schéma Prisma correct
- ✅ Permissions correctes (seul ADMIN peut assigner)
- ✅ POST/DELETE fonctionnels
- ✅ Composant UI prêt à recevoir `availableDirectors`
- ❌ GET ne retourne pas la liste des directeurs disponibles

---

## 5. Problèmes identifiés et recommandations

### 5.1 Problèmes critiques à corriger

| # | Problème | Impact | Fichier |
|---|----------|--------|---------|
| 1 | **Pas de bonus "élim bust"** | Éliminations pendant recaves non récompensées | `src/lib/scoring.ts` |
| 2 | **Light rebuy ≠ 0.5 recave** | Malus mal calculé | `src/lib/scoring.ts` |
| 3 | **API directors incomplete** | Impossible d'assigner un TD | `src/app/api/tournaments/[id]/directors/route.ts` |

### 5.2 Paramètres manquants dans Season

```prisma
// À AJOUTER dans le modèle Season
bustEliminationBonus Int @default(25)  // Bonus élim pendant recaves
```

### 5.3 Correction du calcul du malus

**Actuel (incorrect):**
```typescript
malus = (rebuysCount - freeRebuysCount) * penaltyPerRebuy
```

**Attendu:**
```typescript
recavesEquivalentes = rebuysCount + (lightRebuyUsed ? 0.5 : 0)
recavesPayantes = max(0, recavesEquivalentes - freeRebuysCount)
malus = recavesPayantes * penaltyPerRebuy
```

### 5.4 Distinction élim bust vs élim finale

**Proposition:**

Lors d'un BustEvent avec killer, stocker le bonus potentiel:
- Pendant recaves: bonus = `bustEliminationBonus` (25 pts)
- Après recaves: bonus = `eliminationPoints` (50 pts) + éventuel `leaderKillerBonus`

### 5.5 Fix API directors

**À ajouter dans GET `/api/tournaments/[id]/directors`:**

```typescript
// Récupérer tous les joueurs avec rôle TD ou ADMIN
const availablePlayers = await prisma.player.findMany({
  where: {
    OR: [
      { role: { in: ['TOURNAMENT_DIRECTOR', 'ADMIN'] } },
      { roles: { some: { role: { in: ['TOURNAMENT_DIRECTOR', 'ADMIN'] } } } }
    ],
    // Exclure ceux déjà assignés
    NOT: {
      tournamentDirectorAssignments: {
        some: { tournamentId }
      }
    }
  }
});

return NextResponse.json({
  directors,
  availableDirectors: availablePlayers,  // ← AJOUTER
});
```

---

## Fichiers de référence

| Catégorie | Fichier | Description |
|-----------|---------|-------------|
| Schéma | `prisma/schema.prisma` | Modèles BlindLevel, BustEvent, Elimination, TournamentPlayer, Season |
| Utils | `src/lib/tournament-utils.ts` | `areRecavesOpen()`, `isBreakAfterRebuyEnd()` |
| Scoring | `src/lib/scoring.ts` | `computeRecavePenalty()`, tiers de malus |
| API Busts | `src/app/api/tournaments/[id]/busts/route.ts` | Création de BustEvent |
| API Rebuys | `src/app/api/tournaments/[id]/rebuys/route.ts` | Rebuy STANDARD/LIGHT |
| API Eliminations | `src/app/api/tournaments/[id]/eliminations/route.ts` | Éliminations définitives |
| API Directors | `src/app/api/tournaments/[id]/directors/route.ts` | Gestion TD (à corriger) |
| UI | `src/components/EliminationManager.tsx` | Interface gestion busts/rebuys/élims |
| UI | `src/components/TournamentDirectorsManager.tsx` | Interface assignation TD |
| Tests | `src/__tests__/api/tournament-rebuys-rules.test.ts` | Tests recaves |
| Tests | `src/__tests__/api/tournament-eliminations-rules.test.ts` | Tests éliminations |

---

**Fin du rapport d'investigation Phase 1**
