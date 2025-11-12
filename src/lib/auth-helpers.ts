/**
 * Helpers d'authentification et d'autorisation
 * Pour l'instant, utilise un header X-Player-Id pour identifier le joueur
 * À remplacer par NextAuth ou un vrai système d'auth plus tard
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PlayerRole } from '@prisma/client';

/**
 * Récupère le joueur actuel depuis le header X-Player-Id ou le cookie player-id
 * TEMPORAIRE : À remplacer par une vraie authentification
 */
export async function getCurrentPlayer(request: NextRequest) {
  // D'abord essayer le header (priorité)
  let playerId = request.headers.get('x-player-id');

  // Sinon, essayer le cookie
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
