/**
 * Utilitaires de rôles client-safe
 * Utilisables dans les composants React (pas d'import Prisma)
 *
 * Centralise les vérifications "est-ce un admin ?" pour éviter
 * les comparaisons === 'ADMIN' dispersées dans le frontend.
 */

/** Rôles considérés comme "admin" (accès dashboard, gestion globale) */
const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN'] as const;

/**
 * Vérifie si un rôle est un rôle admin (ADMIN ou SUPERADMIN)
 * Remplace les `=== 'ADMIN'` dans le frontend
 */
export function isAdminRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

/**
 * Vérifie si un rôle est SUPERADMIN
 */
export function isSuperAdminRole(role: string | undefined | null): boolean {
  return role === 'SUPERADMIN';
}

/**
 * Vérifie si un tableau de rôles contient un rôle admin
 */
export function hasAdminInRoles(roles: string[]): boolean {
  return roles.some(r => (ADMIN_ROLES as readonly string[]).includes(r));
}

/**
 * Vérifie si un rôle est TD ou admin
 */
export function isTDOrAdminRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return role === 'TOURNAMENT_DIRECTOR' || isAdminRole(role);
}

/**
 * Vérifie si un rôle est Animateur ou admin
 */
export function isAnimatorOrAdminRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return role === 'ANIMATOR' || isAdminRole(role);
}
