/**
 * Tests API /api/players
 * Vérifie l'authentification et les permissions RBAC
 */

import { GET, POST } from '@/app/api/players/route';
import {
  createUnauthenticatedRequest,
  createRequestWithRole,
  parseJsonResponse,
  TEST_PLAYERS,
} from '@/test-utils/test-utils';
import { mockPrismaResults, mockPlayerFindUnique } from '@/test-utils/mock-prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

// Mock NextAuth - retourne null par défaut (pas de session)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/players', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration par défaut des mocks
    (mockPrisma.player.findMany as jest.Mock).mockResolvedValue(
      mockPrismaResults.players
    );
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string; nickname?: string } }) => {
        if (where.id) {
          return Promise.resolve(mockPlayerFindUnique(where.id));
        }
        return Promise.resolve(null);
      }
    );
    (mockPrisma.player.create as jest.Mock).mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        return Promise.resolve({
          id: 'new-player-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    );
  });

  describe('GET /api/players', () => {
    describe('Accès public', () => {
      it('retourne 200 pour une requête non authentifiée', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/players'
        );

        const response = await GET(request);
        const { status, data } = await parseJsonResponse(response);

        expect(status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
      });

      it('masque les emails pour les utilisateurs non authentifiés', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/players'
        );

        const response = await GET(request);
        const { data } = await parseJsonResponse<Array<{ email?: string }>>(
          response
        );

        // Les emails doivent être undefined pour les non-auth
        data.forEach((player) => {
          expect(player.email).toBeUndefined();
        });
      });
    });

    describe('Accès authentifié par rôle', () => {
      it('ADMIN - retourne les données complètes avec emails', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'admin'
        );

        const response = await GET(request);
        const { status, data } = await parseJsonResponse<
          Array<{ email?: string }>
        >(response);

        expect(status).toBe(200);
        // Admin a VIEW_PLAYERS permission, donc les emails sont visibles
        expect(data.some((p) => p.email !== undefined)).toBe(true);
      });

      it('PLAYER - retourne les données sans emails sensibles', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'player'
        );

        const response = await GET(request);
        const { status, data } = await parseJsonResponse<
          Array<{ email?: string }>
        >(response);

        expect(status).toBe(200);
        // Player n'a pas VIEW_PLAYERS permission, emails masqués
        data.forEach((player) => {
          expect(player.email).toBeUndefined();
        });
      });

      it('TOURNAMENT_DIRECTOR - retourne les données sans emails sensibles', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'tournamentDirector'
        );

        const response = await GET(request);
        const { status, data } = await parseJsonResponse<
          Array<{ email?: string }>
        >(response);

        expect(status).toBe(200);
        // TD n'a pas VIEW_PLAYERS permission
        data.forEach((player) => {
          expect(player.email).toBeUndefined();
        });
      });
    });
  });

  describe('POST /api/players', () => {
    const validPlayerData = {
      firstName: 'Nouveau',
      lastName: 'Joueur',
      nickname: 'nouveau-joueur',
      email: 'nouveau@test.com',
    };

    describe('Protection authentification', () => {
      it('retourne 401 pour une requête non authentifiée', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/players',
          { method: 'POST', body: validPlayerData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(401);
        expect(data.error).toBeDefined();
      });
    });

    describe('Protection RBAC', () => {
      it('ADMIN - peut créer un joueur (201)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'admin',
          { method: 'POST', body: validPlayerData }
        );

        const response = await POST(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(201);
      });

      it('PLAYER - ne peut pas créer un joueur (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'player',
          { method: 'POST', body: validPlayerData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });

      it('TOURNAMENT_DIRECTOR - ne peut pas créer un joueur (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'tournamentDirector',
          { method: 'POST', body: validPlayerData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });

      it('ANIMATOR - ne peut pas créer un joueur (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'animator',
          { method: 'POST', body: validPlayerData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });
    });

    describe('Protection élévation de privilèges', () => {
      it('ADMIN - peut créer un joueur avec rôle ADMIN', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'admin',
          {
            method: 'POST',
            body: { ...validPlayerData, role: 'ADMIN' },
          }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ role: string }>(
          response
        );

        expect(status).toBe(201);
        expect(data.role).toBe('ADMIN');
      });

      it('ADMIN - peut créer un joueur avec rôle TOURNAMENT_DIRECTOR', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'admin',
          {
            method: 'POST',
            body: {
              ...validPlayerData,
              nickname: 'autre-joueur',
              role: 'TOURNAMENT_DIRECTOR',
            },
          }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ role: string }>(
          response
        );

        expect(status).toBe(201);
        expect(data.role).toBe('TOURNAMENT_DIRECTOR');
      });
    });

    describe('Validation des données', () => {
      it('retourne 400 si le pseudo est manquant', async () => {
        const invalidData = {
          firstName: 'Test',
          lastName: 'User',
          // nickname manquant
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'admin',
          { method: 'POST', body: invalidData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(400);
        expect(data.error).toBeDefined();
      });
    });

    describe('Compte inactif', () => {
      it('retourne 403 si le compte est inactif', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/players',
          'inactive',
          { method: 'POST', body: validPlayerData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });
    });
  });
});
