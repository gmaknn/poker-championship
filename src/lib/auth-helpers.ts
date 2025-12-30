/**
 * Helpers d'authentification et d'autorisation
 * Supporte NextAuth (prod) et cookie player-id (dev)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PlayerRole } from '@prisma/client';
import { auth } from '@/lib/auth';

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
        return {
          id: user.id,
          firstName: user.name || '',
          lastName: '',
          nickname: user.name || user.email,
          email: user.email,
          avatar: null,
          role: user.role as PlayerRole,
          status: 'ACTIVE' as const,
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
    },
  });

  return player;
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
