/**
 * Système de permissions pour les rôles
 * Supporte multi-rôles simultanés et TD par tournoi
 */

import { PlayerRole } from '@prisma/client';

// ============================================
// CONSTANTES DE RÔLES
// ============================================

export const ROLES = {
  PLAYER: 'PLAYER' as const,
  TOURNAMENT_DIRECTOR: 'TOURNAMENT_DIRECTOR' as const,
  ANIMATOR: 'ANIMATOR' as const,
  ADMIN: 'ADMIN' as const,
  SUPERADMIN: 'SUPERADMIN' as const,
};

export const ROLE_LABELS = {
  [ROLES.PLAYER]: 'Joueur',
  [ROLES.TOURNAMENT_DIRECTOR]: 'Directeur de Tournoi',
  [ROLES.ANIMATOR]: 'Animateur',
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.SUPERADMIN]: 'Super Administrateur',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.PLAYER]: 'Peut participer aux tournois et voir son profil',
  [ROLES.TOURNAMENT_DIRECTOR]: 'Peut créer et gérer des tournois',
  [ROLES.ANIMATOR]: 'Peut publier des messages et statistiques sur WhatsApp',
  [ROLES.ADMIN]: 'Gestion des tournois, joueurs et classements (pas de settings/saisons)',
  [ROLES.SUPERADMIN]: 'Accès total — gestion globale du système',
};

// Type pour représenter un ensemble de rôles (multi-rôle)
export type RoleSet = PlayerRole[];

// ============================================
// PERMISSIONS
// ============================================

export const PERMISSIONS = {
  // Gestion des joueurs
  VIEW_PLAYERS: 'view_players',
  CREATE_PLAYER: 'create_player',
  EDIT_PLAYER: 'edit_player',
  DELETE_PLAYER: 'delete_player',
  MANAGE_PLAYER_ROLES: 'manage_player_roles',

  // Gestion des saisons
  VIEW_SEASONS: 'view_seasons',
  CREATE_SEASON: 'create_season',
  EDIT_SEASON: 'edit_season',
  DELETE_SEASON: 'delete_season',

  // Gestion des tournois
  VIEW_ALL_TOURNAMENTS: 'view_all_tournaments',
  VIEW_OWN_TOURNAMENTS: 'view_own_tournaments',
  CREATE_TOURNAMENT: 'create_tournament',
  EDIT_OWN_TOURNAMENT: 'edit_own_tournament',
  EDIT_ALL_TOURNAMENTS: 'edit_all_tournaments',
  DELETE_OWN_TOURNAMENT: 'delete_own_tournament',
  DELETE_ALL_TOURNAMENTS: 'delete_all_tournaments',
  MANAGE_TOURNAMENT_REGISTRATIONS: 'manage_tournament_registrations',
  MANAGE_TOURNAMENT_TIMER: 'manage_tournament_timer',
  MANAGE_ELIMINATIONS: 'manage_eliminations',
  MANAGE_REBUYS: 'manage_rebuys',
  FINALIZE_TOURNAMENT: 'finalize_tournament',
  EXPORT_TOURNAMENT_PDF: 'export_tournament_pdf',

  // Gestion des chipsets
  VIEW_CHIPSETS: 'view_chipsets',
  CREATE_CHIPSET: 'create_chipset',
  EDIT_CHIPSET: 'edit_chipset',
  DELETE_CHIPSET: 'delete_chipset',

  // Classements et statistiques
  VIEW_LEADERBOARD: 'view_leaderboard',
  VIEW_PLAYER_STATS: 'view_player_stats',

  // Settings globaux
  VIEW_SETTINGS: 'view_settings',
  EDIT_SETTINGS: 'edit_settings',

  // Communication et Animation
  VIEW_COMMUNICATION_DASHBOARD: 'view_communication_dashboard',
  CREATE_MESSAGE: 'create_message',
  PUBLISH_TO_WHATSAPP: 'publish_to_whatsapp',
  VIEW_MESSAGE_HISTORY: 'view_message_history',
  GENERATE_STATS_VISUALS: 'generate_stats_visuals',
  USE_AI_ASSISTANT: 'use_ai_assistant',
} as const;

// ============================================
// MAPPING RÔLES -> PERMISSIONS
// ============================================

const ROLE_PERMISSIONS: Record<PlayerRole, string[]> = {
  [ROLES.PLAYER]: [
    PERMISSIONS.VIEW_LEADERBOARD,
    PERMISSIONS.VIEW_PLAYER_STATS,
  ],

  [ROLES.TOURNAMENT_DIRECTOR]: [
    PERMISSIONS.VIEW_LEADERBOARD,
    PERMISSIONS.VIEW_PLAYER_STATS,
    PERMISSIONS.VIEW_OWN_TOURNAMENTS,
    PERMISSIONS.CREATE_TOURNAMENT,
    PERMISSIONS.EDIT_OWN_TOURNAMENT,
    PERMISSIONS.DELETE_OWN_TOURNAMENT,
    PERMISSIONS.MANAGE_TOURNAMENT_REGISTRATIONS,
    PERMISSIONS.MANAGE_TOURNAMENT_TIMER,
    PERMISSIONS.MANAGE_ELIMINATIONS,
    PERMISSIONS.MANAGE_REBUYS,
    PERMISSIONS.FINALIZE_TOURNAMENT,
    PERMISSIONS.EXPORT_TOURNAMENT_PDF,
  ],

  [ROLES.ANIMATOR]: [
    PERMISSIONS.VIEW_LEADERBOARD,
    PERMISSIONS.VIEW_PLAYER_STATS,
    PERMISSIONS.VIEW_ALL_TOURNAMENTS,
    PERMISSIONS.VIEW_COMMUNICATION_DASHBOARD,
    PERMISSIONS.CREATE_MESSAGE,
    PERMISSIONS.PUBLISH_TO_WHATSAPP,
    PERMISSIONS.VIEW_MESSAGE_HISTORY,
    PERMISSIONS.GENERATE_STATS_VISUALS,
    PERMISSIONS.USE_AI_ASSISTANT,
  ],

  [ROLES.ADMIN]: [
    // Tournois : accès et gestion complète
    PERMISSIONS.VIEW_ALL_TOURNAMENTS,
    PERMISSIONS.VIEW_OWN_TOURNAMENTS,
    PERMISSIONS.CREATE_TOURNAMENT,
    PERMISSIONS.EDIT_OWN_TOURNAMENT,
    PERMISSIONS.EDIT_ALL_TOURNAMENTS,
    PERMISSIONS.DELETE_OWN_TOURNAMENT,
    PERMISSIONS.DELETE_ALL_TOURNAMENTS,
    PERMISSIONS.MANAGE_TOURNAMENT_REGISTRATIONS,
    PERMISSIONS.MANAGE_TOURNAMENT_TIMER,
    PERMISSIONS.MANAGE_ELIMINATIONS,
    PERMISSIONS.MANAGE_REBUYS,
    PERMISSIONS.FINALIZE_TOURNAMENT,
    PERMISSIONS.EXPORT_TOURNAMENT_PDF,
    // Joueurs : consultation et création (pas edit/delete)
    PERMISSIONS.VIEW_PLAYERS,
    PERMISSIONS.CREATE_PLAYER,
    // Classements et stats
    PERMISSIONS.VIEW_LEADERBOARD,
    PERMISSIONS.VIEW_PLAYER_STATS,
    // Chipsets : lecture seule
    PERMISSIONS.VIEW_CHIPSETS,
  ],

  [ROLES.SUPERADMIN]: Object.values(PERMISSIONS), // Bypass total
};

// ============================================
// HELPERS DE VÉRIFICATION
// ============================================

/**
 * Vérifie si un rôle a une permission spécifique
 * Seul SUPERADMIN a le bypass total
 */
export function hasPermission(role: PlayerRole, permission: string): boolean {
  // SUPERADMIN bypass - accès total garanti
  if (role === ROLES.SUPERADMIN) {
    return true;
  }
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Vérifie si un rôle peut voir tous les tournois
 */
export function canViewAllTournaments(role: PlayerRole): boolean {
  return hasPermission(role, PERMISSIONS.VIEW_ALL_TOURNAMENTS);
}

/**
 * Vérifie si un rôle peut créer un tournoi
 */
export function canCreateTournament(role: PlayerRole): boolean {
  return hasPermission(role, PERMISSIONS.CREATE_TOURNAMENT);
}

/**
 * Vérifie si un utilisateur peut éditer un tournoi spécifique
 */
export function canEditTournament(
  role: PlayerRole,
  tournamentCreatorId: string | null,
  userId: string
): boolean {
  // Admin peut tout éditer
  if (hasPermission(role, PERMISSIONS.EDIT_ALL_TOURNAMENTS)) {
    return true;
  }

  // Tournament Director peut éditer ses propres tournois
  if (hasPermission(role, PERMISSIONS.EDIT_OWN_TOURNAMENT)) {
    return tournamentCreatorId === userId;
  }

  return false;
}

/**
 * Vérifie si un utilisateur peut supprimer un tournoi spécifique
 */
export function canDeleteTournament(
  role: PlayerRole,
  tournamentCreatorId: string | null,
  userId: string
): boolean {
  // Admin peut tout supprimer
  if (hasPermission(role, PERMISSIONS.DELETE_ALL_TOURNAMENTS)) {
    return true;
  }

  // Tournament Director peut supprimer ses propres tournois
  if (hasPermission(role, PERMISSIONS.DELETE_OWN_TOURNAMENT)) {
    return tournamentCreatorId === userId;
  }

  return false;
}

/**
 * Vérifie si un rôle peut gérer les joueurs
 */
export function canManagePlayers(role: PlayerRole): boolean {
  return hasPermission(role, PERMISSIONS.EDIT_PLAYER);
}

/**
 * Vérifie si un rôle peut gérer les saisons
 */
export function canManageSeasons(role: PlayerRole): boolean {
  return hasPermission(role, PERMISSIONS.EDIT_SEASON);
}

/**
 * Vérifie si un rôle peut gérer les chipsets
 */
export function canManageChipsets(role: PlayerRole): boolean {
  return hasPermission(role, PERMISSIONS.EDIT_CHIPSET);
}

/**
 * Vérifie si un rôle peut gérer les settings globaux
 */
export function canManageSettings(role: PlayerRole): boolean {
  return hasPermission(role, PERMISSIONS.EDIT_SETTINGS);
}

/**
 * Vérifie si un rôle est admin (ADMIN ou SUPERADMIN)
 */
export function isAdmin(role: PlayerRole): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPERADMIN;
}

/**
 * Vérifie si un rôle est SUPERADMIN
 */
export function isSuperAdmin(role: PlayerRole): boolean {
  return role === ROLES.SUPERADMIN;
}

/**
 * Vérifie si un rôle est Tournament Director ou supérieur
 */
export function isTournamentDirectorOrAbove(role: PlayerRole): boolean {
  return role === ROLES.TOURNAMENT_DIRECTOR || role === ROLES.ADMIN || role === ROLES.SUPERADMIN;
}

/**
 * Récupère toutes les permissions d'un rôle
 */
export function getRolePermissions(role: PlayerRole): string[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Récupère le label d'un rôle
 */
export function getRoleLabel(role: PlayerRole): string {
  return ROLE_LABELS[role] || role;
}

/**
 * Récupère la description d'un rôle
 */
export function getRoleDescription(role: PlayerRole): string {
  return ROLE_DESCRIPTIONS[role] || '';
}

// ============================================
// HELPERS MULTI-RÔLES
// ============================================

/**
 * Vérifie si un joueur a un rôle spécifique
 * Supporte à la fois le rôle unique (legacy) et les multi-rôles
 *
 * @param primaryRole - Rôle principal du joueur (champ Player.role)
 * @param additionalRoles - Rôles additionnels (de PlayerRoleAssignment)
 * @param targetRole - Rôle recherché
 */
export function hasRoleInSet(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined,
  targetRole: PlayerRole
): boolean {
  // Vérifier le rôle principal
  if (primaryRole === targetRole) {
    return true;
  }
  // Vérifier les rôles additionnels
  if (additionalRoles && additionalRoles.includes(targetRole)) {
    return true;
  }
  return false;
}

/**
 * Vérifie si un joueur a au moins un des rôles spécifiés
 */
export function hasAnyRoleInSet(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined,
  targetRoles: PlayerRole[]
): boolean {
  return targetRoles.some(role => hasRoleInSet(primaryRole, additionalRoles, role));
}

/**
 * Vérifie si un joueur a une permission donnée en tenant compte de tous ses rôles
 * ADMIN a toujours accès (bypass)
 */
export function hasPermissionMultiRole(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined,
  permission: string
): boolean {
  // SUPERADMIN bypass total
  if (hasRoleInSet(primaryRole, additionalRoles, ROLES.SUPERADMIN as PlayerRole)) {
    return true;
  }

  // Collecter toutes les permissions de tous les rôles
  const allRoles = [primaryRole, ...(additionalRoles || [])];
  const uniqueRoles = [...new Set(allRoles)];

  for (const role of uniqueRoles) {
    if (hasPermission(role, permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Récupère l'ensemble des rôles d'un joueur (primaryRole + additionalRoles)
 */
export function getAllRoles(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined
): PlayerRole[] {
  const allRoles = [primaryRole, ...(additionalRoles || [])];
  return [...new Set(allRoles)]; // Déduplique
}

/**
 * Vérifie si un joueur est ADMIN ou SUPERADMIN (multi-rôle aware)
 * Utilisé pour les vérifications UI (afficher menus admin, etc.)
 * Pour le bypass de permissions, utiliser isSuperAdminMultiRole()
 */
export function isAdminMultiRole(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined
): boolean {
  return hasRoleInSet(primaryRole, additionalRoles, ROLES.SUPERADMIN as PlayerRole)
    || hasRoleInSet(primaryRole, additionalRoles, ROLES.ADMIN as PlayerRole);
}

/**
 * Vérifie si un joueur est SUPERADMIN (multi-rôle aware)
 */
export function isSuperAdminMultiRole(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined
): boolean {
  return hasRoleInSet(primaryRole, additionalRoles, ROLES.SUPERADMIN as PlayerRole);
}

/**
 * Vérifie si un joueur est Tournament Director (multi-rôle aware)
 */
export function isTournamentDirectorMultiRole(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined
): boolean {
  return hasRoleInSet(primaryRole, additionalRoles, ROLES.TOURNAMENT_DIRECTOR as PlayerRole);
}

/**
 * Vérifie si un joueur est TD ou Admin (multi-rôle aware)
 */
export function isTournamentDirectorOrAdminMultiRole(
  primaryRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined
): boolean {
  return hasAnyRoleInSet(primaryRole, additionalRoles, [
    ROLES.TOURNAMENT_DIRECTOR as PlayerRole,
    ROLES.ADMIN as PlayerRole,
    ROLES.SUPERADMIN as PlayerRole,
  ]);
}
