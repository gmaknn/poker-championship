/**
 * Helpers d'authentification et d'autorisation
 * Supporte NextAuth (prod) et cookie player-id (dev)
 * Supporte multi-rôles et TD par tournoi
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PlayerRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { hasPermission, isAdminMultiRole } from '@/lib/permissions';

/**
 * Récupère le joueur/user actuel
 * 1. Essaie NextAuth (production)
 * 2. Fallback sur cookie player-id (dev mode)
 */
export async function getCurrentPlayer(request: NextRequest) {
  // 1. Essayer NextAuth d'abord (production)
  try {
    const session = await auth();
    if (session?.user?.id) {
      // NextAuth user - chercher dans la table User
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (user) {
        // Retourner un objet compatible avec le format Player
        // Note: les users NextAuth n'ont pas de rôles additionnels (multi-rôle via Player uniquement)
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
    }
  } catch {
    // NextAuth non disponible, continuer avec fallback
  }

  // 2. Fallback: header X-Player-Id ou cookie player-id (dev mode)
  let playerId = request.headers.get('x-player-id');

  if (!playerId) {
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const playerIdMatch = cookies.match(/player-id=([^;]+)/);
      if (playerIdMatch) {
        playerId = playerIdMatch[1];
      }
    }
  }

  if (!playerId) {
    return null;
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      nickname: true,
      email: true,
      avatar: true,
      role: true,
      status: true,
      roles: {
        select: { role: true },
      },
    },
  });

  if (!player) {
    return null;
  }

  // Ajouter les rôles additionnels au retour
  return {
    ...player,
    additionalRoles: player.roles?.map(r => r.role) ?? [],
  };
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
 * Pour les Users NextAuth, trouve ou crée automatiquement le Player correspondant
 * Utilisé principalement pour les opérations qui nécessitent un Player.id (ex: créer un tournoi)
 *
 * @param request - NextRequest
 * @param autoCreatePlayer - Si true, crée automatiquement un Player si non trouvé (default: false)
 * @returns CurrentActor ou null si non authentifié
 */
export async function getCurrentActor(
  request: NextRequest,
  autoCreatePlayer: boolean = false
): Promise<CurrentActor | null> {
  // 1. Essayer NextAuth d'abord (production)
  try {
    const session = await auth();
    if (session?.user?.id && session?.user?.email) {
      // Récupérer le User complet
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return null;
      }

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

      if (!player) {
        return null;
      }

      return {
        user,
        player,
      };
    }
  } catch (e) {
    // NextAuth non disponible, continuer avec fallback
    console.error('[Auth] NextAuth error:', e);
  }

  // 2. Fallback: cookie player-id (dev mode) - pas de User dans ce cas
  let playerId = request.headers.get('x-player-id');

  if (!playerId) {
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const playerIdMatch = cookies.match(/player-id=([^;]+)/);
      if (playerIdMatch) {
        playerId = playerIdMatch[1];
      }
    }
  }

  if (!playerId) {
    return null;
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
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

  if (!player) {
    return null;
  }

  // En mode dev, créer un "fake" user basé sur le player
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
