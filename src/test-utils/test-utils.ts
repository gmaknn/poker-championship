/**
 * Utilitaires pour les tests API
 * Fournit des helpers pour simuler l'authentification et les requêtes
 */

import { NextRequest } from 'next/server';
import { PlayerRole } from '@prisma/client';

/**
 * Données de test pour les différents rôles
 */
export const TEST_PLAYERS = {
  admin: {
    id: 'test-admin-id',
    firstName: 'Admin',
    lastName: 'Test',
    nickname: 'admin-test',
    email: 'admin@test.com',
    avatar: null,
    role: 'ADMIN' as PlayerRole,
    status: 'ACTIVE' as const,
  },
  tournamentDirector: {
    id: 'test-td-id',
    firstName: 'Director',
    lastName: 'Test',
    nickname: 'td-test',
    email: 'td@test.com',
    avatar: null,
    role: 'TOURNAMENT_DIRECTOR' as PlayerRole,
    status: 'ACTIVE' as const,
  },
  animator: {
    id: 'test-animator-id',
    firstName: 'Animator',
    lastName: 'Test',
    nickname: 'animator-test',
    email: 'animator@test.com',
    avatar: null,
    role: 'ANIMATOR' as PlayerRole,
    status: 'ACTIVE' as const,
  },
  player: {
    id: 'test-player-id',
    firstName: 'Player',
    lastName: 'Test',
    nickname: 'player-test',
    email: 'player@test.com',
    avatar: null,
    role: 'PLAYER' as PlayerRole,
    status: 'ACTIVE' as const,
  },
  inactive: {
    id: 'test-inactive-id',
    firstName: 'Inactive',
    lastName: 'Test',
    nickname: 'inactive-test',
    email: 'inactive@test.com',
    avatar: null,
    role: 'PLAYER' as PlayerRole,
    status: 'ARCHIVED' as const,
  },
};

export type TestPlayerKey = keyof typeof TEST_PLAYERS;

/**
 * Crée une requête NextRequest avec les headers d'authentification
 */
export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string;
    playerId?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', playerId, body, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (playerId) {
    requestHeaders['x-player-id'] = playerId;
  }

  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3003'), init);
}

/**
 * Crée une requête non authentifiée
 */
export function createUnauthenticatedRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  return createAuthenticatedRequest(url, { ...options, playerId: undefined });
}

/**
 * Crée une requête authentifiée avec un rôle spécifique
 */
export function createRequestWithRole(
  url: string,
  role: TestPlayerKey,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  return createAuthenticatedRequest(url, {
    ...options,
    playerId: TEST_PLAYERS[role].id,
  });
}

/**
 * Parse la réponse JSON d'une NextResponse
 */
export async function parseJsonResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = await response.json();
  return {
    status: response.status,
    data,
  };
}

/**
 * Helper pour vérifier qu'une réponse est une erreur 401
 */
export function expectUnauthorized(status: number, data: unknown): void {
  expect(status).toBe(401);
  expect(data).toHaveProperty('error');
}

/**
 * Helper pour vérifier qu'une réponse est une erreur 403
 */
export function expectForbidden(status: number, data: unknown): void {
  expect(status).toBe(403);
  expect(data).toHaveProperty('error');
}

/**
 * Helper pour vérifier qu'une réponse est un succès
 */
export function expectSuccess(status: number): void {
  expect(status).toBeGreaterThanOrEqual(200);
  expect(status).toBeLessThan(300);
}
