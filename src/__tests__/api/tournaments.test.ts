/**
 * Tests API /api/tournaments
 * Vérifie l'authentification et les permissions RBAC
 */

import { GET, POST } from '@/app/api/tournaments/route';
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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    tournament: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    season: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock NextAuth - retourne null par défaut (pas de session)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/tournaments', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration par défaut des mocks
    (mockPrisma.tournament.findMany as jest.Mock).mockResolvedValue(
      mockPrismaResults.tournaments
    );
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string; nickname?: string } }) => {
        if (where.id) {
          return Promise.resolve(mockPlayerFindUnique(where.id));
        }
        return Promise.resolve(null);
      }
    );
    (mockPrisma.player.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.season.findUnique as jest.Mock).mockResolvedValue(
      mockPrismaResults.seasons[0]
    );
    (mockPrisma.tournament.create as jest.Mock).mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        return Promise.resolve({
          id: 'new-tournament-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: TEST_PLAYERS.tournamentDirector,
          season: mockPrismaResults.seasons[0],
          _count: { tournamentPlayers: 0 },
        });
      }
    );
  });

  describe('GET /api/tournaments', () => {
    describe('Accès public', () => {
      it('retourne 200 pour une requête non authentifiée', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/tournaments'
        );

        const response = await GET(request);
        const { status, data } = await parseJsonResponse(response);

        expect(status).toBe(200);
        expect(Array.isArray(data)).toBe(true);
      });

      it('retourne tous les tournois pour un utilisateur non authentifié', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/tournaments'
        );

        const response = await GET(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
        // Vérifie que findMany a été appelé sans filtre createdById
        expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {},
          })
        );
      });
    });

    describe('Accès authentifié par rôle', () => {
      it('ADMIN - voit tous les tournois', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'admin'
        );

        const response = await GET(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
        // Admin a canViewAllTournaments, donc pas de filtre createdById
        expect(mockPrisma.tournament.findMany).toHaveBeenCalled();
      });

      it('TOURNAMENT_DIRECTOR - ne voit que ses propres tournois', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'tournamentDirector'
        );

        const response = await GET(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
        // TD n'a pas canViewAllTournaments, donc filtre par createdById
        expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdById: TEST_PLAYERS.tournamentDirector.id,
            }),
          })
        );
      });

      it('PLAYER - ne voit que ses propres tournois (aucun)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'player'
        );

        const response = await GET(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
        // Player n'a pas canViewAllTournaments
        expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdById: TEST_PLAYERS.player.id,
            }),
          })
        );
      });

      it('ANIMATOR - voit tous les tournois', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'animator'
        );

        const response = await GET(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
        // Animator a VIEW_ALL_TOURNAMENTS permission
      });
    });
  });

  describe('POST /api/tournaments', () => {
    const validTournamentData = {
      name: 'Nouveau Tournoi',
      seasonId: 'test-season-id',
      date: new Date().toISOString(),
      buyInAmount: 10,
      startingChips: 5000,
      targetDuration: 180,
    };

    describe('Protection authentification', () => {
      it('retourne 401 pour une requête non authentifiée', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/tournaments',
          { method: 'POST', body: validTournamentData }
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
      it('ADMIN - peut créer un tournoi (201)', async () => {
        // Pour getCurrentActor avec autoCreatePlayer, on doit aussi mocker findFirst
        (mockPrisma.player.findFirst as jest.Mock).mockResolvedValue(
          TEST_PLAYERS.admin
        );

        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'admin',
          { method: 'POST', body: validTournamentData }
        );

        const response = await POST(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(201);
      });

      it('TOURNAMENT_DIRECTOR - peut créer un tournoi (201)', async () => {
        (mockPrisma.player.findFirst as jest.Mock).mockResolvedValue(
          TEST_PLAYERS.tournamentDirector
        );

        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'tournamentDirector',
          { method: 'POST', body: validTournamentData }
        );

        const response = await POST(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(201);
      });

      it('PLAYER - ne peut pas créer un tournoi (403)', async () => {
        (mockPrisma.player.findFirst as jest.Mock).mockResolvedValue(
          TEST_PLAYERS.player
        );

        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'player',
          { method: 'POST', body: validTournamentData }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });

      it('ANIMATOR - ne peut pas créer un tournoi (403)', async () => {
        (mockPrisma.player.findFirst as jest.Mock).mockResolvedValue(
          TEST_PLAYERS.animator
        );

        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'animator',
          { method: 'POST', body: validTournamentData }
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
      it('retourne 400 si la saison est manquante', async () => {
        (mockPrisma.player.findFirst as jest.Mock).mockResolvedValue(
          TEST_PLAYERS.admin
        );

        const invalidData = {
          name: 'Tournoi Sans Saison',
          date: new Date().toISOString(),
          // seasonId manquant
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
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

      it('retourne 404 si la saison n\'existe pas', async () => {
        (mockPrisma.player.findFirst as jest.Mock).mockResolvedValue(
          TEST_PLAYERS.admin
        );
        (mockPrisma.season.findUnique as jest.Mock).mockResolvedValue(null);

        const request = createRequestWithRole(
          'http://localhost:3003/api/tournaments',
          'admin',
          {
            method: 'POST',
            body: { ...validTournamentData, seasonId: 'inexistant' },
          }
        );

        const response = await POST(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(404);
        expect(data.error).toBeDefined();
      });
    });
  });
});
