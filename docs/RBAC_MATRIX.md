# RBAC Matrix - Poker Championship

> Audit réalisé le 2025-12-30

## 1. Rôles définis

| Rôle | Label | Description |
|------|-------|-------------|
| `PLAYER` | Joueur | Peut participer aux tournois et voir son profil |
| `TOURNAMENT_DIRECTOR` | Directeur de Tournoi | Peut créer et gérer des tournois |
| `ANIMATOR` | Animateur | Peut publier des messages et statistiques sur WhatsApp |
| `ADMIN` | Administrateur | Accès complet à toutes les fonctionnalités |

## 2. Permissions définies (code)

### Gestion des joueurs
- `view_players` - Voir la liste des joueurs
- `create_player` - Créer un joueur
- `edit_player` - Modifier un joueur
- `delete_player` - Supprimer un joueur
- `manage_player_roles` - Gérer les rôles des joueurs

### Gestion des saisons
- `view_seasons` - Voir les saisons
- `create_season` - Créer une saison
- `edit_season` - Modifier une saison
- `delete_season` - Supprimer une saison

### Gestion des tournois
- `view_all_tournaments` - Voir tous les tournois
- `view_own_tournaments` - Voir ses propres tournois
- `create_tournament` - Créer un tournoi
- `edit_own_tournament` - Modifier ses propres tournois
- `edit_all_tournaments` - Modifier tous les tournois
- `delete_own_tournament` - Supprimer ses propres tournois
- `delete_all_tournaments` - Supprimer tous les tournois
- `manage_tournament_registrations` - Gérer les inscriptions
- `manage_tournament_timer` - Gérer le timer
- `manage_eliminations` - Gérer les éliminations
- `manage_rebuys` - Gérer les rebuys
- `finalize_tournament` - Finaliser un tournoi
- `export_tournament_pdf` - Exporter en PDF

### Gestion des chipsets
- `view_chipsets` - Voir les mallettes
- `create_chipset` - Créer une mallette
- `edit_chipset` - Modifier une mallette
- `delete_chipset` - Supprimer une mallette

### Classements et statistiques
- `view_leaderboard` - Voir le classement
- `view_player_stats` - Voir les statistiques joueur

### Settings globaux
- `view_settings` - Voir les paramètres
- `edit_settings` - Modifier les paramètres

### Communication
- `view_communication_dashboard` - Dashboard communication
- `create_message` - Créer un message
- `publish_to_whatsapp` - Publier sur WhatsApp
- `view_message_history` - Historique des messages
- `generate_stats_visuals` - Générer visuels stats
- `use_ai_assistant` - Utiliser l'assistant IA

## 3. Mapping Rôles → Permissions (code actuel)

| Permission | PLAYER | TOURNAMENT_DIRECTOR | ANIMATOR | ADMIN |
|------------|--------|---------------------|----------|-------|
| **Joueurs** |
| view_players | ❌ | ❌ | ❌ | ✅ |
| create_player | ❌ | ❌ | ❌ | ✅ |
| edit_player | ❌ | ❌ | ❌ | ✅ |
| delete_player | ❌ | ❌ | ❌ | ✅ |
| manage_player_roles | ❌ | ❌ | ❌ | ✅ |
| **Saisons** |
| view_seasons | ❌ | ❌ | ❌ | ✅ |
| create_season | ❌ | ❌ | ❌ | ✅ |
| edit_season | ❌ | ❌ | ❌ | ✅ |
| delete_season | ❌ | ❌ | ❌ | ✅ |
| **Tournois** |
| view_all_tournaments | ❌ | ❌ | ✅ | ✅ |
| view_own_tournaments | ❌ | ✅ | ❌ | ✅ |
| create_tournament | ❌ | ✅ | ❌ | ✅ |
| edit_own_tournament | ❌ | ✅ | ❌ | ✅ |
| edit_all_tournaments | ❌ | ❌ | ❌ | ✅ |
| delete_own_tournament | ❌ | ✅ | ❌ | ✅ |
| delete_all_tournaments | ❌ | ❌ | ❌ | ✅ |
| manage_tournament_registrations | ❌ | ✅ | ❌ | ✅ |
| manage_tournament_timer | ❌ | ✅ | ❌ | ✅ |
| manage_eliminations | ❌ | ✅ | ❌ | ✅ |
| manage_rebuys | ❌ | ✅ | ❌ | ✅ |
| finalize_tournament | ❌ | ✅ | ❌ | ✅ |
| export_tournament_pdf | ❌ | ✅ | ❌ | ✅ |
| **Chipsets** |
| view_chipsets | ❌ | ❌ | ❌ | ✅ |
| create_chipset | ❌ | ❌ | ❌ | ✅ |
| edit_chipset | ❌ | ❌ | ❌ | ✅ |
| delete_chipset | ❌ | ❌ | ❌ | ✅ |
| **Classements** |
| view_leaderboard | ✅ | ✅ | ✅ | ✅ |
| view_player_stats | ✅ | ✅ | ✅ | ✅ |
| **Settings** |
| view_settings | ❌ | ❌ | ❌ | ✅ |
| edit_settings | ❌ | ❌ | ❌ | ✅ |
| **Communication** |
| view_communication_dashboard | ❌ | ❌ | ✅ | ✅ |
| create_message | ❌ | ❌ | ✅ | ✅ |
| publish_to_whatsapp | ❌ | ❌ | ✅ | ✅ |
| view_message_history | ❌ | ❌ | ✅ | ✅ |
| generate_stats_visuals | ❌ | ❌ | ✅ | ✅ |
| use_ai_assistant | ❌ | ❌ | ✅ | ✅ |

## 4. Inventaire des routes API WRITE

### Routes avec guards RBAC corrects ✅

| Route | Méthode | Permission vérifiée |
|-------|---------|---------------------|
| `/api/seasons` | POST | CREATE_SEASON |
| `/api/seasons/[id]` | PATCH | EDIT_SEASON |
| `/api/seasons/[id]` | DELETE | DELETE_SEASON |
| `/api/settings` | PUT | EDIT_SETTINGS |
| `/api/tournaments` | POST | canCreateTournament() |
| `/api/tournaments/[id]` | PATCH | canEditTournament() |
| `/api/tournaments/[id]` | DELETE | canDeleteTournament() |
| `/api/players/[id]` | DELETE | DELETE_PLAYER |

### Routes avec guards partiels ⚠️

| Route | Méthode | Problème |
|-------|---------|----------|
| `/api/players` | POST | Vérifie MANAGE_PLAYER_ROLES seulement pour rôles élevés |
| `/api/players/[id]` | PATCH | Vérifie MANAGE_PLAYER_ROLES seulement pour changement de rôle |

### Routes SANS guard (25 routes) 🔴

#### Gestion des chipsets
| Route | Méthode | Permission attendue |
|-------|---------|---------------------|
| `/api/chip-sets` | POST | CREATE_CHIPSET |
| `/api/chip-sets/[id]` | PUT | EDIT_CHIPSET |
| `/api/chip-sets/[id]` | DELETE | DELETE_CHIPSET |
| `/api/chip-sets/[id]/denominations` | POST | EDIT_CHIPSET |
| `/api/chip-sets/[id]/denominations/[denominationId]` | PUT | EDIT_CHIPSET |
| `/api/chip-sets/[id]/denominations/[denominationId]` | DELETE | EDIT_CHIPSET |

#### Configuration tournoi
| Route | Méthode | Permission attendue |
|-------|---------|---------------------|
| `/api/tournaments/[id]/blinds` | POST | EDIT_*_TOURNAMENT |
| `/api/tournaments/[id]/blinds` | DELETE | EDIT_*_TOURNAMENT |
| `/api/tournaments/[id]/chip-config` | POST | EDIT_*_TOURNAMENT |
| `/api/tournaments/[id]/chip-config` | DELETE | EDIT_*_TOURNAMENT |
| `/api/tournaments/[id]/chips` | POST | EDIT_*_TOURNAMENT |
| `/api/tournaments/[id]/chips` | DELETE | EDIT_*_TOURNAMENT |
| `/api/tournaments/[id]/tables` | POST | MANAGE_TOURNAMENT_REGISTRATIONS |
| `/api/tournaments/[id]/tables` | DELETE | MANAGE_TOURNAMENT_REGISTRATIONS |
| `/api/tournaments/[id]/tables/rebalance` | POST | MANAGE_TOURNAMENT_REGISTRATIONS |

#### Gestion tournoi en cours
| Route | Méthode | Permission attendue |
|-------|---------|---------------------|
| `/api/tournaments/[id]/eliminations` | POST | MANAGE_ELIMINATIONS |
| `/api/tournaments/[id]/eliminations/[eliminationId]` | DELETE | MANAGE_ELIMINATIONS |
| `/api/tournaments/[id]/players` | POST | MANAGE_TOURNAMENT_REGISTRATIONS |
| `/api/tournaments/[id]/players/[playerId]` | PATCH | MANAGE_TOURNAMENT_REGISTRATIONS |
| `/api/tournaments/[id]/players/[playerId]` | DELETE | MANAGE_TOURNAMENT_REGISTRATIONS |
| `/api/tournaments/[id]/rebuys` | POST | MANAGE_REBUYS |
| `/api/tournaments/[id]/timer/start` | POST | MANAGE_TOURNAMENT_TIMER |
| `/api/tournaments/[id]/timer/pause` | POST | MANAGE_TOURNAMENT_TIMER |
| `/api/tournaments/[id]/timer/resume` | POST | MANAGE_TOURNAMENT_TIMER |
| `/api/tournaments/[id]/timer/reset` | POST | MANAGE_TOURNAMENT_TIMER |
| `/api/tournaments/[id]/results` | POST | FINALIZE_TOURNAMENT |

#### Templates et autres
| Route | Méthode | Permission attendue |
|-------|---------|---------------------|
| `/api/tournament-templates` | POST | ADMIN only |
| `/api/tournament-templates/[id]` | PUT | ADMIN only |
| `/api/tournament-templates/[id]` | DELETE | ADMIN only |
| `/api/players/[id]/avatar` | POST | Owner or ADMIN |
| `/api/ai/generate-message` | POST | USE_AI_ASSISTANT |

## 5. Écarts identifiés (Top 10)

| # | Écart | Impact | Priorité |
|---|-------|--------|----------|
| 1 | 25 routes WRITE sans authentification | Critique - n'importe qui peut modifier les données | 🔴 P0 |
| 2 | Timer tournoi non protégé | Critique - perturbation des tournois en cours | 🔴 P0 |
| 3 | Inscriptions joueurs non protégées | Critique - manipulation du tournoi | 🔴 P0 |
| 4 | Éliminations non protégées | Critique - falsification des résultats | 🔴 P0 |
| 5 | Résultats tournoi non protégés | Critique - falsification des points | 🔴 P0 |
| 6 | Chipsets accessibles à tous | Moyen - configuration matérielle | 🟡 P1 |
| 7 | Templates accessibles à tous | Moyen - pollution des templates | 🟡 P1 |
| 8 | Avatar modifiable sans auth | Faible - usurpation d'identité visuelle | 🟢 P2 |
| 9 | Création joueur partiellement protégée | Moyen - création de comptes spam | 🟡 P1 |
| 10 | ADMIN dépend de `hasPermission()` au lieu d'un bypass explicite | Fragile - risque de régression si permissions mal définies | 🟡 P1 |

## 6. Architecture RBAC actuelle

```
┌─────────────────┐     ┌─────────────────┐
│   User (prod)   │     │  Player (dev)   │
│  - id           │     │  - id           │
│  - email        │     │  - role (enum)  │
│  - role (str)   │     │                 │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
          ┌──────────────────┐
          │ getCurrentPlayer │
          │  (auth-helpers)  │
          └────────┬─────────┘
                   ▼
          ┌──────────────────┐
          │  hasPermission   │
          │  (permissions)   │
          └────────┬─────────┘
                   ▼
          ┌──────────────────┐
          │ ROLE_PERMISSIONS │
          │    (mapping)     │
          └──────────────────┘
```

**Note importante:** `ADMIN` reçoit `Object.values(PERMISSIONS)` = toutes les permissions.
Cependant, si une route vérifie une permission qui n'existe PAS dans `PERMISSIONS`, l'ADMIN sera bloqué.

## 7. Recommandations

1. **Centraliser le bypass ADMIN** dans `hasPermission()`:
   ```typescript
   export function hasPermission(role: PlayerRole, permission: string): boolean {
     if (role === 'ADMIN') return true; // ADMIN bypass
     const permissions = ROLE_PERMISSIONS[role];
     return permissions.includes(permission);
   }
   ```

2. **Créer un helper `requirePermission()`** pour les routes API:
   ```typescript
   export async function requirePermission(request: NextRequest, permission: string) {
     const player = await getCurrentPlayer(request);
     if (!player) return { error: 'Non authentifié', status: 401 };
     if (!hasPermission(player.role, permission)) {
       return { error: 'Permission refusée', status: 403 };
     }
     return { player };
   }
   ```

3. **Ajouter des guards à toutes les routes WRITE** listées ci-dessus.

4. **Tests unitaires RBAC** pour garantir la non-régression.
