/**
 * Helpers d'authentification et d'autorisation
 * Utilise Auth.js v5 avec vérification JWT signée comme fallback sécurisé
 * Supporte multi-rôles et TD par tournoi
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PlayerRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { hasPermission, isAdminMultiRole } from '@/lib/permissions';
import { jwtVerify } from 'jose';

/**
 * Récupère le secret Auth.js pour la vérification JWT
 * Auth.js v5 utilise AUTH_SECRET, avec fallback sur NEXTAUTH_SECRET
 */
function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET or NEXTAUTH_SECRET must be defined');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Noms des cookies de session Auth.js v5
 * En HTTPS (production): __Secure-authjs.session-token
 * En HTTP (local): authjs.session-token
 */
const SESSION_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
];

/**
 * Interface pour le payload JWT Auth.js
 */
interface AuthJsJwtPayload {
  id?: string;
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Vérifie et décode le JWT de session depuis les cookies
 * Utilise jose pour vérifier la signature HMAC avec le secret
 *
 * SÉCURITÉ: Cette fonction vérifie la signature du token.
 * Un token forgé ou modifié sera rejeté.
 */
async function verifySessionFromCookies(request: NextRequest): Promise<AuthJsJwtPayload | null> {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;

  const secret = getAuthSecret();

  for (const cookieName of SESSION_COOKIE_NAMES) {
    // Escape special regex characters in cookie name
    const regex = new RegExp(`${cookieName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]+)`);
    const match = cookies.match(regex);

    if (match) {
      try {
        const token = decodeURIComponent(match[1]);

        // Vérifier la signature JWT avec jose
        const { payload } = await jwtVerify(token, secret, {
          algorithms: ['HS256', 'HS384', 'HS512'],
        });

        // Extraire les infos utilisateur du payload vérifié
        const userId = (payload.id as string) || (payload.sub as string);
        if (userId) {
          return {
            id: payload.id as string,
            sub: payload.sub as string,
            email: payload.email as string,
            name: payload.name as string,
            role: payload.role as string,
          };
        }
      } catch (e) {
        // Token invalide ou signature incorrecte - continuer avec le suivant
        // Note: On ne log pas l'erreur en détail pour éviter les fuites d'info
        console.debug('[Auth] JWT verification failed for cookie:', cookieName);
      }
    }
  }

  return null;
}

/**
 * Fallback pour les tests uniquement
 * Lit le player-id depuis les headers ou cookies
 * SÉCURITÉ: Cette fonction ne doit JAMAIS être utilisée en production
 */
function getTestFallbackPlayerId(request: NextRequest): string | null {
  // Vérifier explicitement qu'on est en mode test
  if (process.env.NODE_ENV !== 'test') {
    return null;
  }

  // Header X-Player-Id (utilisé par certains tests)
  const headerPlayerId = request.headers.get('x-player-id');
  if (headerPlayerId) {
    return headerPlayerId;
  }

  // Cookie player-id (utilisé par la plupart des tests)
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const match = cookies.match(/player-id=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Récupère le joueur/user actuel
 * 1. Essaie Auth.js auth() (méthode officielle)
 * 2. Fallback: vérification JWT signée depuis cookies (si auth() échoue dans Route Handler)
 * 3. Fallback TEST ONLY: player-id cookie (pour les tests existants)
 *
 * SÉCURITÉ: Le fallback player-id n'est actif qu'en NODE_ENV=test
 */
export async function getCurrentPlayer(request: NextRequest) {
  let userId: string | null = null;

  // 1. Essayer auth() d'abord (méthode officielle Auth.js v5)
  try {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  } catch (e) {
    // auth() peut échouer dans certains contextes Route Handler
    // Fallback sur vérification JWT signée
    console.debug('[Auth] auth() threw, using JWT verification fallback');
  }

  // 2. Fallback sécurisé: vérifier le JWT avec signature
  if (!userId) {
    const verifiedPayload = await verifySessionFromCookies(request);
    if (verifiedPayload) {
      userId = verifiedPayload.id || verifiedPayload.sub || null;
    }
  }

  // Si on a trouvé un userId, récupérer le User
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      // Retourner un objet compatible avec le format Player
      return {
        id: user.id,
        firstName: user.name || '',
        lastName: '',
        nickname: user.name || user.email,
        email: user.email,
        avatar: null,
        role: user.role as PlayerRole,
        status: 'ACTIVE' as const,
        additionalRoles: [] as PlayerRole[],
      };
    }
    // User ID valide dans le token mais pas en DB (supprimé?)
    console.warn('[Auth] User ID from verified token not found in database:', userId);
  }

  // 3. Fallback TEST ONLY: player-id cookie/header
  // SÉCURITÉ: Ce fallback n'est actif qu'en mode test (NODE_ENV=test)
  if (process.env.NODE_ENV === 'test') {
    const testPlayerId = getTestFallbackPlayerId(request);
    if (testPlayerId) {
      const player = await prisma.player.findUnique({
        where: { id: testPlayerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nickname: true,
          email: true,
          avatar: true,
          role: true,
          status: true,
          roles: { select: { role: true } },
        },
      });
      if (player) {
        return {
          ...player,
          additionalRoles: player.roles?.map(r => r.role) ?? [],
        };
      }
    }
  }

  return null;
}

/**
 * Type pour l'acteur courant (User NextAuth + Player lié)
 */
export type CurrentActor = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    email: string | null;
    avatar: string | null;
    role: PlayerRole;
    status: string;
  };
};

/**
 * Récupère l'acteur courant avec son Player lié
 * Pour les Users Auth.js, trouve ou crée automatiquement le Player correspondant
 * Utilisé principalement pour les opérations qui nécessitent un Player.id (ex: créer un tournoi)
 *
 * @param request - NextRequest
 * @param autoCreatePlayer - Si true, crée automatiquement un Player si non trouvé (default: false)
 * @returns CurrentActor ou null si non authentifié
 *
 * SÉCURITÉ: Le fallback player-id n'est actif qu'en NODE_ENV=test
 */
export async function getCurrentActor(
  request: NextRequest,
  autoCreatePlayer: boolean = false
): Promise<CurrentActor | null> {
  let userId: string | null = null;

  // 1. Essayer auth() d'abord (méthode officielle Auth.js v5)
  try {
    const session = await auth();
    if (session?.user?.id && session?.user?.email) {
      userId = session.user.id;
    }
  } catch (e) {
    // auth() peut échouer dans certains contextes Route Handler
    console.debug('[Auth] auth() threw in getCurrentActor, using JWT verification fallback');
  }

  // 2. Fallback sécurisé: vérifier le JWT avec signature
  if (!userId) {
    const verifiedPayload = await verifySessionFromCookies(request);
    if (verifiedPayload) {
      userId = verifiedPayload.id || verifiedPayload.sub || null;
    }
  }

  // Si on a trouvé un userId, récupérer le User
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      // Chercher un Player avec le même email
      let player = await prisma.player.findFirst({
        where: { email: user.email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nickname: true,
          email: true,
          avatar: true,
          role: true,
          status: true,
        },
      });

      // Si pas de Player trouvé et autoCreatePlayer est activé
      if (!player && autoCreatePlayer) {
        // Générer un nickname unique basé sur l'email
        const baseNickname = user.email.split('@')[0];
        let nickname = baseNickname;
        let suffix = 1;

        // Vérifier l'unicité du nickname
        while (await prisma.player.findUnique({ where: { nickname } })) {
          nickname = `${baseNickname}${suffix}`;
          suffix++;
        }

        // Créer le Player automatiquement
        const nameParts = (user.name || '').split(' ');
        player = await prisma.player.create({
          data: {
            firstName: nameParts[0] || 'Admin',
            lastName: nameParts.slice(1).join(' ') || '',
            nickname,
            email: user.email,
            role: user.role as PlayerRole,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            avatar: true,
            role: true,
            status: true,
          },
        });

        console.log(`[Auth] Auto-created Player for User ${user.email}: ${player.id}`);
      }

      if (player) {
        return { user, player };
      }
    }
    console.warn('[Auth] User ID from verified token not found in database:', userId);
  }

  // 3. Fallback TEST ONLY: player-id cookie/header
  // SÉCURITÉ: Ce fallback n'est actif qu'en mode test (NODE_ENV=test)
  if (process.env.NODE_ENV === 'test') {
    const testPlayerId = getTestFallbackPlayerId(request);
    if (testPlayerId) {
      const player = await prisma.player.findUnique({
        where: { id: testPlayerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nickname: true,
          email: true,
          avatar: true,
          role: true,
          status: true,
        },
      });
      if (player) {
        // En mode test, créer un "fake" user basé sur le player
        return {
          user: {
            id: player.id,
            email: player.email || '',
            name: `${player.firstName} ${player.lastName}`.trim(),
            role: player.role,
          },
          player,
        };
      }
    }
  }

  return null;
}

/**
 * Récupère le rôle du joueur actuel
 */
export async function getCurrentPlayerRole(request: NextRequest): Promise<PlayerRole | null> {
  const player = await getCurrentPlayer(request);
  return player?.role || null;
}

/**
 * Vérifie si un joueur est authentifié
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const player = await getCurrentPlayer(request);
  return player !== null && player.status === 'ACTIVE';
}

/**
 * Vérifie si le joueur actuel a un rôle spécifique
 */
export async function hasRole(request: NextRequest, role: PlayerRole): Promise<boolean> {
  const playerRole = await getCurrentPlayerRole(request);
  return playerRole === role;
}

/**
 * Vérifie si le joueur actuel est admin
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  return hasRole(request, PlayerRole.ADMIN);
}

/**
 * Vérifie si le joueur actuel est Tournament Director ou Admin
 */
export async function isTournamentDirectorOrAdmin(request: NextRequest): Promise<boolean> {
  const playerRole = await getCurrentPlayerRole(request);
  return playerRole === PlayerRole.TOURNAMENT_DIRECTOR || playerRole === PlayerRole.ADMIN;
}

/**
 * Type pour le résultat de requirePermission
 */
export type RequirePermissionResult =
  | { success: true; player: NonNullable<Awaited<ReturnType<typeof getCurrentPlayer>>> }
  | { success: false; error: string; status: 401 | 403 };

/**
 * Helper centralisé pour vérifier l'authentification et les permissions
 * Utilisé par toutes les routes API WRITE pour garantir un comportement cohérent
 *
 * @param request - La requête NextRequest
 * @param permission - La permission requise (ou null pour juste vérifier l'auth)
 * @returns { success: true, player } ou { success: false, error, status }
 */
export async function requirePermission(
  request: NextRequest,
  permission: string | null = null
): Promise<RequirePermissionResult> {
  const player = await getCurrentPlayer(request);

  if (!player) {
    return {
      success: false,
      error: 'Non authentifié',
      status: 401
    };
  }

  if (player.status !== 'ACTIVE') {
    return {
      success: false,
      error: 'Compte inactif',
      status: 403
    };
  }

  // Si une permission est requise, la vérifier
  // Note: hasPermission() inclut le bypass ADMIN
  if (permission && !hasPermission(player.role, permission)) {
    return {
      success: false,
      error: 'Permission refusée',
      status: 403
    };
  }

  return { success: true, player };
}

/**
 * Helper pour vérifier les permissions sur un tournoi spécifique
 * Gère la logique "own tournament" vs "all tournaments" et TD assignés
 */
export async function requireTournamentPermission(
  request: NextRequest,
  tournamentCreatorId: string | null,
  action: 'edit' | 'delete' | 'manage',
  tournamentId?: string
): Promise<RequirePermissionResult> {
  const player = await getCurrentPlayer(request);

  if (!player) {
    return { success: false, error: 'Non authentifié', status: 401 };
  }

  if (player.status !== 'ACTIVE') {
    return { success: false, error: 'Compte inactif', status: 403 };
  }

  // ADMIN bypass (multi-role aware)
  if (isAdminMultiRole(player.role, player.additionalRoles)) {
    return { success: true, player };
  }

  // Pour les actions de gestion (registrations, timer, eliminations, rebuys, finalize)
  if (action === 'manage') {
    // Vérifier si le joueur est TD assigné à ce tournoi
    let isAssignedDirector = false;
    if (tournamentId) {
      isAssignedDirector = await checkIsTournamentDirector(player.id, tournamentId);
    }

    // TD peut gérer : ses tournois créés OU tournois où il est assigné
    const canManage =
      (player.role === PlayerRole.TOURNAMENT_DIRECTOR || player.additionalRoles?.includes(PlayerRole.TOURNAMENT_DIRECTOR)) &&
      (tournamentCreatorId === null || tournamentCreatorId === player.id || isAssignedDirector);

    if (!canManage) {
      return { success: false, error: 'Permission refusée', status: 403 };
    }
    return { success: true, player };
  }

  // Pour edit/delete
  const allPermission = action === 'edit' ? 'edit_all_tournaments' : 'delete_all_tournaments';
  const ownPermission = action === 'edit' ? 'edit_own_tournament' : 'delete_own_tournament';

  if (hasPermission(player.role, allPermission)) {
    return { success: true, player };
  }

  // Vérifier si TD assigné pour edit
  if (action === 'edit' && tournamentId) {
    const isAssigned = await checkIsTournamentDirector(player.id, tournamentId);
    if (isAssigned && hasPermission(player.role, ownPermission)) {
      return { success: true, player };
    }
  }

  if (hasPermission(player.role, ownPermission) && tournamentCreatorId === player.id) {
    return { success: true, player };
  }

  return { success: false, error: 'Permission refusée', status: 403 };
}

/**
 * Vérifie si un joueur est directeur assigné à un tournoi
 */
export async function checkIsTournamentDirector(
  playerId: string,
  tournamentId: string
): Promise<boolean> {
  const assignment = await prisma.tournamentDirector.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId,
      },
    },
  });
  return assignment !== null;
}

/**
 * Vérifie si un joueur peut gérer un tournoi
 * ADMIN = toujours OK
 * TD = OK si créateur OU assigné comme directeur
 */
export async function canManageTournament(
  playerId: string,
  playerRole: PlayerRole,
  additionalRoles: PlayerRole[] | undefined,
  tournamentId: string,
  tournamentCreatorId: string | null
): Promise<boolean> {
  // ADMIN bypass
  if (isAdminMultiRole(playerRole, additionalRoles)) {
    return true;
  }

  // Vérifier si TD (rôle principal ou additionnel)
  const isTD =
    playerRole === PlayerRole.TOURNAMENT_DIRECTOR ||
    additionalRoles?.includes(PlayerRole.TOURNAMENT_DIRECTOR);

  if (!isTD) {
    return false;
  }

  // Vérifier si créateur
  if (tournamentCreatorId === playerId) {
    return true;
  }

  // Vérifier si assigné comme directeur
  return checkIsTournamentDirector(playerId, tournamentId);
}

/**
 * Récupère la liste des directeurs assignés à un tournoi
 */
export async function getTournamentDirectors(tournamentId: string) {
  const directors = await prisma.tournamentDirector.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          nickname: true,
          avatar: true,
        },
      },
    },
    orderBy: { assignedAt: 'asc' },
  });
  return directors;
}

/**
 * Type pour le résultat de requireActivePlayer
 */
export type RequireActivePlayerResult =
  | { success: true; player: NonNullable<Awaited<ReturnType<typeof getCurrentPlayer>>> }
  | { success: false; error: string; status: 401 | 403 };

/**
 * Helper pour vérifier qu'un joueur est authentifié et ACTIVE
 * Pour les endpoints read-only accessibles à tous les joueurs actifs
 * (leaderboards, stats, etc.)
 *
 * @param request - La requête NextRequest
 * @returns { success: true, player } ou { success: false, error, status }
 */
export async function requireActivePlayer(
  request: NextRequest
): Promise<RequireActivePlayerResult> {
  const player = await getCurrentPlayer(request);

  if (!player) {
    return {
      success: false,
      error: 'Non authentifié',
      status: 401
    };
  }

  if (player.status !== 'ACTIVE') {
    return {
      success: false,
      error: 'Compte inactif - Veuillez activer votre compte',
      status: 403
    };
  }

  return { success: true, player };
}
