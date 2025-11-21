/**
 * Helpers d'authentification et d'autorisation
 * Gère à la fois les admins (via NextAuth) et les joueurs (via cookie)
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PlayerRole } from '@prisma/client';
import { auth } from '@/lib/auth';

/**
 * Récupère le joueur ou l'admin actuel
 * Vérifie d'abord la session NextAuth (admins), puis le cookie player-id (joueurs)
 */
export async function getCurrentPlayer(request?: NextRequest) {
  // D'abord vérifier la session NextAuth (pour les admins)
  const session = await auth();

  if (session?.user) {
    // Si l'utilisateur est un admin connecté via User model
    if (session.user.userType === 'admin') {
      // Retourner un objet qui mime un Player avec role ADMIN
      return {
        id: session.user.id,
        firstName: session.user.name?.split(' ')[0] || 'Admin',
        lastName: session.user.name?.split(' ')[1] || '',
        nickname: session.user.name || 'Admin',
        email: session.user.email || '',
        avatar: null,
        role: PlayerRole.ADMIN,
        status: 'ACTIVE' as const,
      };
    }

    // Si l'utilisateur est un joueur connecté via Player model
    if (session.user.userType === 'player' && session.user.id) {
      const player = await prisma.player.findUnique({
        where: { id: session.user.id },
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
  }

  // Fallback: essayer le cookie player-id (pour compatibilité)
  if (request) {
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

    if (playerId) {
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
