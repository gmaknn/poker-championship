/**
 * Système de permissions pour les rôles
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
};

export const ROLE_LABELS = {
  [ROLES.PLAYER]: 'Joueur',
  [ROLES.TOURNAMENT_DIRECTOR]: 'Directeur de Tournoi',
  [ROLES.ANIMATOR]: 'Animateur',
  [ROLES.ADMIN]: 'Administrateur',
};

export const ROLE_DESCRIPTIONS = {
  [ROLES.PLAYER]: 'Peut participer aux tournois et voir son profil',
  [ROLES.TOURNAMENT_DIRECTOR]: 'Peut créer et gérer des tournois',
  [ROLES.ANIMATOR]: 'Peut publier des messages et statistiques sur WhatsApp',
  [ROLES.ADMIN]: 'Accès complet à toutes les fonctionnalités',
};

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

  [ROLES.ADMIN]: Object.values(PERMISSIONS), // Toutes les permissions
};

// ============================================
// HELPERS DE VÉRIFICATION
// ============================================

/**
 * Vérifie si un rôle a une permission spécifique
 * ADMIN a toujours accès (bypass explicite pour éviter les régressions)
 */
export function hasPermission(role: PlayerRole, permission: string): boolean {
  // ADMIN bypass - accès total garanti
  if (role === ROLES.ADMIN) {
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
 * Vérifie si un rôle est admin
 */
export function isAdmin(role: PlayerRole): boolean {
  return role === ROLES.ADMIN;
}

/**
 * Vérifie si un rôle est Tournament Director ou supérieur
 */
export function isTournamentDirectorOrAbove(role: PlayerRole): boolean {
  return role === ROLES.TOURNAMENT_DIRECTOR || role === ROLES.ADMIN;
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
