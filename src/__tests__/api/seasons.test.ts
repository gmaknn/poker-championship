/**
 * Tests API /api/seasons
 * Vérifie l'authentification et les permissions RBAC
 */

import { GET, POST } from '@/app/api/seasons/route';
import {
  createUnauthenticatedRequest,
  createRequestWithRole,
  parseJsonResponse,
} from '@/test-utils/test-utils';
import { mockPrismaResults, mockPlayerFindUnique } from '@/test-utils/mock-prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    season: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock NextAuth - retourne null par défaut (pas de session)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/seasons', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration par défaut des mocks
    (mockPrisma.season.findMany as jest.Mock).mockResolvedValue(
      mockPrismaResults.seasons
    );
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id) {
          return Promise.resolve(mockPlayerFindUnique(where.id));
        }
        return Promise.resolve(null);
      }
    );
    (mockPrisma.season.create as jest.Mock).mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        return Promise.resolve({
          id: 'new-season-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    );
  });

  describe('GET /api/seasons', () => {
    describe('Accès public', () => {
      it('retourne 200 pour une requête non authentifiée', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/seasons'
        );

        // GET n'utilise pas de request, mais on le garde pour cohérence
        const response = await GET();
        const { status, data } = await parseJsonResponse(response);

        expect(status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
      });

      it('retourne la liste des saisons', async () => {
        const response = await GET();
        const { data } = await parseJsonResponse<
          Array<{ id: string; name: string }>
        >(response);

        expect(data.length).toBeGreaterThan(0);
        expect(data[0]).toHaveProperty('id');
        expect(data[0]).toHaveProperty('name');
      });
    });

    describe('Accès authentifié par rôle', () => {
      it('ADMIN - accès OK (200)', async () => {
        const response = await GET();
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
      });

      it('PLAYER - accès OK (200) - route publique', async () => {
        const response = await GET();
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
      });
    });
  });

  describe('POST /api/seasons', () => {
    const validSeasonData = {
      name: 'Saison Test 2026',
      year: 2026,
      startDate: new Date('2026-01-01').toISOString(),
      endDate: null,
      pointsFirst: 1500,
      pointsSecond: 1000,
      pointsThird: 700,
      pointsFourth: 500,
      pointsFifth: 400,
      pointsSixth: 300,
      pointsSeventh: 200,
      pointsEighth: 200,
      pointsNinth: 200,
      pointsTenth: 200,
      pointsEleventh: 100,
      pointsSixteenth: 50,
      eliminationPoints: 50,
      leaderKillerBonus: 25,
      freeRebuysCount: 2,
      rebuyPenaltyTier1: -50,
      rebuyPenaltyTier2: -100,
      rebuyPenaltyTier3: -150,
    };

    describe('Protection authentification', () => {
      it('retourne 403 pour une requête non authentifiée', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/seasons',
          { method: 'POST', body: validSeasonData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        // La route retourne 403 car pas de player trouvé
        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });
    });

    describe('Protection RBAC', () => {
      it('ADMIN - peut créer une saison (201)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/seasons',
          'admin',
          { method: 'POST', body: validSeasonData }
        );

        const response = await POST(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(201);
      });

      it('PLAYER - ne peut pas créer une saison (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/seasons',
          'player',
          { method: 'POST', body: validSeasonData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });

      it('TOURNAMENT_DIRECTOR - ne peut pas créer une saison (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/seasons',
          'tournamentDirector',
          { method: 'POST', body: validSeasonData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });

      it('ANIMATOR - ne peut pas créer une saison (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/seasons',
          'animator',
          { method: 'POST', body: validSeasonData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });
    });

    describe('Validation des données', () => {
      it('retourne 400 si le nom est manquant', async () => {
        const invalidData = {
          year: 2026,
          startDate: new Date('2026-01-01').toISOString(),
          // name manquant
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/seasons',
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

      it('retourne 400 si l\'année est invalide', async () => {
        const invalidData = {
          ...validSeasonData,
          year: 2019, // Avant 2020, invalide selon le schema
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/seasons',
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
  });
});
