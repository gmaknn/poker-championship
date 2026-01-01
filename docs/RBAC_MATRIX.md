# RBAC Matrix - Poker Championship

> Dernière mise à jour : 2025-12-31

## 1. Rôles définis

| Rôle | Label | Description |
|------|-------|-------------|
| `PLAYER` | Joueur | Peut participer aux tournois et voir son profil |
| `TOURNAMENT_DIRECTOR` | Directeur de Tournoi | Peut créer et gérer des tournois |
| `ANIMATOR` | Animateur | Peut publier des messages et statistiques sur WhatsApp |
| `ADMIN` | Administrateur | Accès complet à toutes les fonctionnalités |

## 2. Multi-rôles

Un joueur peut avoir plusieurs rôles simultanément:

### Tables de données

```
Player
├── role: PlayerRole (rôle principal)
└── roles: PlayerRoleAssignment[] (rôles additionnels)

PlayerRoleAssignment
├── playerId: String
└── role: PlayerRole
```

### Fonctionnement

- Le rôle principal reste dans `Player.role`
- Les rôles additionnels sont stockés dans `PlayerRoleAssignment`
- La vérification des permissions prend en compte les deux sources
- Exemple: Un joueur `PLAYER` peut aussi avoir le rôle `TOURNAMENT_DIRECTOR` en additionnel

## 3. Directeurs de Tournoi Assignés

Un tournoi peut avoir plusieurs directeurs assignés:

### Table de données

```
TournamentDirector
├── tournamentId: String
├── playerId: String
├── assignedAt: DateTime
└── assignedById: String?
```

### Règles

| Règle | Description |
|-------|-------------|
| Créateur | Le créateur du tournoi (`Tournament.createdById`) a automatiquement les droits de gestion |
| Assignation | Seuls les ADMIN peuvent assigner des directeurs |
| Éligibilité | Seuls les joueurs ayant le rôle TD (principal ou additionnel) peuvent être assignés |
| Gestion | Les TD assignés ont les mêmes droits que le créateur sur ce tournoi |

## 4. Permissions par rôle

### Gestion des joueurs

| Permission | PLAYER | TD | ANIMATOR | ADMIN |
|------------|--------|-----|----------|-------|
| view_players | ❌ | ❌ | ❌ | ✅ |
| create_player | ❌ | ❌ | ❌ | ✅ |
| edit_player | ❌ | ❌ | ❌ | ✅ |
| delete_player | ❌ | ❌ | ❌ | ✅ |
| manage_player_roles | ❌ | ❌ | ❌ | ✅ |

### Gestion des saisons

| Permission | PLAYER | TD | ANIMATOR | ADMIN |
|------------|--------|-----|----------|-------|
| view_seasons | ❌ | ❌ | ❌ | ✅ |
| create_season | ❌ | ❌ | ❌ | ✅ |
| edit_season | ❌ | ❌ | ❌ | ✅ |
| delete_season | ❌ | ❌ | ❌ | ✅ |

### Gestion des tournois

| Permission | PLAYER | TD (propre) | TD (assigné) | ADMIN |
|------------|--------|-------------|--------------|-------|
| Voir tous les tournois | ✅ | ✅ | ✅ | ✅ |
| Créer tournoi | ❌ | ✅ | ✅ | ✅ |
| Modifier tournoi | ❌ | ✅ | ✅ | ✅ |
| Supprimer tournoi | ❌ | ✅ | ❌ | ✅ |
| Inscription joueurs | ❌ | ✅ | ✅ | ✅ |
| Gérer timer | ❌ | ✅ | ✅ | ✅ |
| Gérer éliminations | ❌ | ✅ | ✅ | ✅ |
| Gérer rebuys | ❌ | ✅ | ✅ | ✅ |
| Gérer prize pool | ❌ | ✅ | ✅ | ✅ |
| Répartir tables | ❌ | ✅ | ✅ | ✅ |
| Calculer résultats | ❌ | ✅ | ✅ | ✅ |
| Assigner directeurs | ❌ | ❌ | ❌ | ✅ |

### Vue TV

| Fonctionnalité | Tous (public) |
|----------------|---------------|
| Vue spectateur | ✅ |
| Contrôles TTS | ✅ |
| Thèmes | ✅ |

## 5. API Endpoints

### Codes de retour

| Code | Signification |
|------|---------------|
| `200` | Succès |
| `201` | Créé avec succès |
| `400` | Requête invalide |
| `401` | Non authentifié |
| `403` | Permission refusée |
| `404` | Ressource non trouvée |

### Routes protégées par RBAC

| Route | Méthodes | Guard |
|-------|----------|-------|
| `/api/tournaments/[id]/directors` | GET, POST, DELETE | ADMIN only (POST/DELETE) |
| `/api/tournaments/[id]/players` | POST | requireTournamentPermission |
| `/api/tournaments/[id]/players/[playerId]` | PATCH, DELETE | requireTournamentPermission |
| `/api/tournaments/[id]/eliminations` | POST | requireTournamentPermission |
| `/api/tournaments/[id]/rebuys` | POST | requireTournamentPermission |
| `/api/tournaments/[id]/timer/*` | POST | requireTournamentPermission |
| `/api/tournaments/[id]/tables` | POST, DELETE | requireTournamentPermission |
| `/api/tournaments/[id]/tables/rebalance` | POST | requireTournamentPermission |
| `/api/tournaments/[id]/results` | POST | requireTournamentPermission |
| `/api/tournaments/[id]/blinds` | POST, DELETE | requireTournamentPermission |
| `/api/tournaments/[id]` | PATCH, DELETE | requireTournamentPermission |

## 6. Helpers d'authentification

### getCurrentPlayer(request)

Récupère le joueur courant avec ses rôles:

```typescript
const player = await getCurrentPlayer(request);
// Returns:
{
  id: string;
  role: PlayerRole;          // Rôle principal
  additionalRoles: PlayerRole[];  // Rôles additionnels
  // ...autres champs
}
```

### requireTournamentPermission(request, creatorId, action, tournamentId)

Vérifie les permissions pour une action sur un tournoi:

```typescript
const result = await requireTournamentPermission(
  request,
  tournament.createdById,
  'manage',
  tournamentId
);

if (!result.success) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
```

Logique de vérification:
1. Vérifie l'authentification (401 si non authentifié)
2. Vérifie que le compte est actif (403 si inactif)
3. ADMIN bypass → OK
4. Vérifie si TD et (créateur OU assigné) → OK
5. Sinon → 403

### checkIsTournamentDirector(playerId, tournamentId)

Vérifie si un joueur est directeur assigné d'un tournoi:

```typescript
const isAssigned = await checkIsTournamentDirector(playerId, tournamentId);
```

## 7. Fichiers clés

| Fichier | Description |
|---------|-------------|
| `src/lib/permissions.ts` | Définitions des permissions par rôle |
| `src/lib/auth-helpers.ts` | Helpers d'authentification et de vérification |
| `prisma/schema.prisma` | Modèles de données (PlayerRoleAssignment, TournamentDirector) |
| `src/app/api/tournaments/[id]/directors/route.ts` | API de gestion des directeurs |
| `src/components/TournamentDirectorsManager.tsx` | UI de gestion des directeurs |

## 8. Flux d'authentification

```
Requête API
    │
    ▼
getCurrentPlayer(request)
    ├── Session NextAuth ? → User → role
    └── Cookie player-id ? → Player → role + additionalRoles
    │
    ▼
requireTournamentPermission(request, creatorId, action, tournamentId)
    │
    ├── Pas authentifié ? → 401
    ├── Compte inactif ? → 403
    ├── ADMIN ? → ✅ OK
    ├── TD + (créateur OU assigné) ? → ✅ OK
    └── Sinon → 403
```

## 9. Interface Admin - Gestion des directeurs

L'onglet "Directeurs" est visible uniquement pour les ADMIN dans la page de détail d'un tournoi.

Fonctionnalités:
- Voir la liste des directeurs assignés
- Ajouter un directeur (sélection parmi les joueurs TD disponibles)
- Retirer un directeur (avec confirmation)

## 10. Migration

### Modèle actuel vs ancien

| Aspect | Ancien | Nouveau |
|--------|--------|---------|
| Rôle joueur | `Player.role` seul | `Player.role` + `PlayerRoleAssignment[]` |
| Directeur tournoi | Créateur uniquement | Créateur + directeurs assignés |
| Vérification permissions | Rôle simple | Multi-rôle + assignation |

### Rétrocompatibilité

- Le champ `Player.role` reste le rôle principal
- Les rôles additionnels sont optionnels
- Les tournois existants continuent de fonctionner (créateur = directeur)
