/**
 * Tests API /api/tournaments/[id]
 * Vérifie l'authentification et les permissions RBAC sur GET/PATCH/DELETE
 */

import { GET, PATCH, DELETE } from '@/app/api/tournaments/[id]/route';
import {
  createMockRequest,
  createAuthenticatedRequest
} from '@/test-utils/request';
import { MOCK_PLAYERS, MOCK_TOURNAMENT, TEST_IDS } from '@/test-utils/mocks';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    tournament: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tournamentPlayer: {
      findMany: jest.fn(),
    },
    season: {
      findUnique: jest.fn(),
    },
    tournamentDirector: {
      findUnique: jest.fn().mockResolvedValue(null), // Default: not assigned as director
    },
  },
}));

// Mock NextAuth - retourne null par défaut (pas de session)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper pour créer les params Promise
const createParams = (id: string) => Promise.resolve({ id });

describe('/api/tournaments/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration par défaut des mocks
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === TEST_IDS.ADMIN_PLAYER) {
          return Promise.resolve(MOCK_PLAYERS.admin);
        }
        if (where.id === TEST_IDS.TD_PLAYER) {
          return Promise.resolve(MOCK_PLAYERS.tournamentDirector);
        }
        if (where.id === TEST_IDS.REGULAR_PLAYER) {
          return Promise.resolve(MOCK_PLAYERS.player);
        }
        return Promise.resolve(null);
      }
    );
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_TOURNAMENT,
      season: { id: TEST_IDS.SEASON, name: 'Test Season', year: 2025 },
      tournamentPlayers: [],
      blindLevels: [],
      eliminations: [],
      tableAssignments: [],
      _count: { tournamentPlayers: 0, blindLevels: 0 },
    });
    (mockPrisma.tournament.update as jest.Mock).mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        return Promise.resolve({
          ...MOCK_TOURNAMENT,
          ...data,
          season: { id: TEST_IDS.SEASON, name: 'Test Season', year: 2025 },
          _count: { tournamentPlayers: 0 },
        });
      }
    );
    (mockPrisma.tournament.delete as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  describe('GET /api/tournaments/[id]', () => {
    describe('Protection authentification', () => {
      it('retourne 401 pour une requête non authentifiée', async () => {
        const request = createMockRequest('/api/tournaments/test-id');

        const response = await GET(request, { params: createParams('test-id') });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });

      it('retourne 200 pour une requête authentifiée (ADMIN)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.ADMIN_PLAYER
        );

        const response = await GET(request, { params: createParams('test-id') });

        expect(response.status).toBe(200);
      });

      it('retourne 200 pour une requête authentifiée (PLAYER)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.REGULAR_PLAYER
        );

        const response = await GET(request, { params: createParams('test-id') });

        // Les joueurs peuvent voir les tournois (pas de restriction RBAC sur GET)
        expect(response.status).toBe(200);
      });

      it('retourne 200 pour une requête authentifiée (TOURNAMENT_DIRECTOR)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.TD_PLAYER
        );

        const response = await GET(request, { params: createParams('test-id') });

        expect(response.status).toBe(200);
      });
    });

    describe('Gestion des erreurs', () => {
      it('retourne 404 si le tournoi n\'existe pas', async () => {
        (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValueOnce(null);

        const request = createAuthenticatedRequest(
          '/api/tournaments/inexistant',
          TEST_IDS.ADMIN_PLAYER
        );

        const response = await GET(request, { params: createParams('inexistant') });

        expect(response.status).toBe(404);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });
    });
  });

  describe('PATCH /api/tournaments/[id]', () => {
    const validUpdateData = {
      name: 'Tournoi Modifié',
    };

    describe('Protection authentification', () => {
      it('retourne 401 pour une requête non authentifiée', async () => {
        const request = createMockRequest('/api/tournaments/test-id', {
          method: 'PATCH',
          body: validUpdateData,
        });

        const response = await PATCH(request, { params: createParams('test-id') });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });
    });

    describe('Protection RBAC', () => {
      it('ADMIN - peut modifier n\'importe quel tournoi (200)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.ADMIN_PLAYER,
          { method: 'PATCH', body: validUpdateData }
        );

        const response = await PATCH(request, { params: createParams('test-id') });

        expect(response.status).toBe(200);
      });

      it('TOURNAMENT_DIRECTOR - peut modifier son propre tournoi (200)', async () => {
        // Le tournoi est créé par TD_PLAYER
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.TD_PLAYER,
          { method: 'PATCH', body: validUpdateData }
        );

        const response = await PATCH(request, { params: createParams('test-id') });

        expect(response.status).toBe(200);
      });

      it('TOURNAMENT_DIRECTOR - ne peut pas modifier le tournoi d\'un autre (403)', async () => {
        // Changer le créateur du tournoi
        (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValueOnce({
          ...MOCK_TOURNAMENT,
          createdById: 'autre-directeur-id',
        });

        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.TD_PLAYER,
          { method: 'PATCH', body: validUpdateData }
        );

        const response = await PATCH(request, { params: createParams('test-id') });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });

      it('PLAYER - ne peut pas modifier un tournoi (403)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.REGULAR_PLAYER,
          { method: 'PATCH', body: validUpdateData }
        );

        const response = await PATCH(request, { params: createParams('test-id') });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });
    });
  });

  describe('DELETE /api/tournaments/[id]', () => {
    beforeEach(() => {
      // Tournoi sans joueurs inscrits et pas terminé
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...MOCK_TOURNAMENT,
        status: 'PLANNED',
        createdById: TEST_IDS.TD_PLAYER,
        _count: { tournamentPlayers: 0 },
      });
    });

    describe('Protection authentification', () => {
      it('retourne 401 pour une requête non authentifiée', async () => {
        const request = createMockRequest('/api/tournaments/test-id', {
          method: 'DELETE',
        });

        const response = await DELETE(request, { params: createParams('test-id') });

        expect(response.status).toBe(401);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });
    });

    describe('Protection RBAC', () => {
      it('ADMIN - peut supprimer n\'importe quel tournoi (200)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.ADMIN_PLAYER,
          { method: 'DELETE' }
        );

        const response = await DELETE(request, { params: createParams('test-id') });

        expect(response.status).toBe(200);
      });

      it('TOURNAMENT_DIRECTOR - peut supprimer son propre tournoi (200)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.TD_PLAYER,
          { method: 'DELETE' }
        );

        const response = await DELETE(request, { params: createParams('test-id') });

        expect(response.status).toBe(200);
      });

      it('TOURNAMENT_DIRECTOR - ne peut pas supprimer le tournoi d\'un autre (403)', async () => {
        (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValueOnce({
          ...MOCK_TOURNAMENT,
          status: 'PLANNED',
          createdById: 'autre-directeur-id',
          _count: { tournamentPlayers: 0 },
        });

        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.TD_PLAYER,
          { method: 'DELETE' }
        );

        const response = await DELETE(request, { params: createParams('test-id') });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });

      it('PLAYER - ne peut pas supprimer un tournoi (403)', async () => {
        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.REGULAR_PLAYER,
          { method: 'DELETE' }
        );

        const response = await DELETE(request, { params: createParams('test-id') });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toBeDefined();
      });
    });

    describe('Règles métier', () => {
      it('ne peut pas supprimer un tournoi avec des joueurs inscrits (400)', async () => {
        (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValueOnce({
          ...MOCK_TOURNAMENT,
          status: 'PLANNED',
          createdById: TEST_IDS.ADMIN_PLAYER,
          _count: { tournamentPlayers: 5 },
        });

        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.ADMIN_PLAYER,
          { method: 'DELETE' }
        );

        const response = await DELETE(request, { params: createParams('test-id') });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('joueurs inscrits');
      });

      it('ne peut pas supprimer un tournoi terminé (400)', async () => {
        (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValueOnce({
          ...MOCK_TOURNAMENT,
          status: 'FINISHED',
          createdById: TEST_IDS.ADMIN_PLAYER,
          _count: { tournamentPlayers: 0 },
        });

        const request = createAuthenticatedRequest(
          '/api/tournaments/test-id',
          TEST_IDS.ADMIN_PLAYER,
          { method: 'DELETE' }
        );

        const response = await DELETE(request, { params: createParams('test-id') });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('terminé');
      });
    });
  });

  describe('PATCH - rebuyEndLevel=0 persistence', () => {
    beforeEach(() => {
      // Setup: tournament IN_PROGRESS owned by TD with rebuyEndLevel null
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...MOCK_TOURNAMENT,
        status: 'IN_PROGRESS',
        createdById: TEST_IDS.TD_PLAYER,
        rebuyEndLevel: null,
      });
    });

    it('should call Prisma with rebuyEndLevel=0 (not undefined, not null)', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/test-id',
        TEST_IDS.TD_PLAYER,
        { method: 'PATCH', body: { rebuyEndLevel: 0 } }
      );

      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(200);

      // CRITICAL: Verify Prisma was called with rebuyEndLevel: 0 (not undefined)
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rebuyEndLevel: 0,
          }),
        })
      );
    });

    it('should return rebuyEndLevel=0 in response body', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/test-id',
        TEST_IDS.TD_PLAYER,
        { method: 'PATCH', body: { rebuyEndLevel: 0 } }
      );

      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.rebuyEndLevel).toBe(0);
    });

    it('should include diagnostic headers in response', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/test-id',
        TEST_IDS.TD_PLAYER,
        { method: 'PATCH', body: { rebuyEndLevel: 0 } }
      );

      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(200);
      expect(response.headers.get('X-App-Commit')).toBeTruthy();
      expect(response.headers.get('X-Recipe-Diagnostics')).toBe('off');
    });
  });

  describe('PATCH - Finish Invariants', () => {
    beforeEach(() => {
      // Setup: tournament IN_PROGRESS owned by TD
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...MOCK_TOURNAMENT,
        status: 'IN_PROGRESS',
        createdById: TEST_IDS.TD_PLAYER,
      });
    });

    it('should return 400 when finishing tournament with incomplete final ranks', async () => {
      // 3 players, only 2 have finalRank
      (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([
        { finalRank: 1 },
        { finalRank: 2 },
        { finalRank: null }, // Incomplete - player without rank
      ]);

      const request = createAuthenticatedRequest(
        '/api/tournaments/test-id',
        TEST_IDS.TD_PLAYER,
        { method: 'PATCH', body: { status: 'FINISHED' } }
      );

      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot finish tournament: final ranks are incomplete');
    });

    it('should return 400 when finishing tournament with duplicate final ranks', async () => {
      // 3 players, all have ranks but with duplicate
      (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([
        { finalRank: 1 },
        { finalRank: 2 },
        { finalRank: 2 }, // Duplicate rank
      ]);

      const request = createAuthenticatedRequest(
        '/api/tournaments/test-id',
        TEST_IDS.TD_PLAYER,
        { method: 'PATCH', body: { status: 'FINISHED' } }
      );

      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot finish tournament: final ranks are not unique');
    });

    it('should return 400 when finishing tournament with out of bounds ranks', async () => {
      // 3 players, all have unique ranks but one is out of bounds
      (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([
        { finalRank: 1 },
        { finalRank: 2 },
        { finalRank: 5 }, // Out of bounds (should be 1-3)
      ]);

      const request = createAuthenticatedRequest(
        '/api/tournaments/test-id',
        TEST_IDS.TD_PLAYER,
        { method: 'PATCH', body: { status: 'FINISHED' } }
      );

      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot finish tournament: final ranks are out of bounds');
    });

    it('should allow finishing tournament when final ranks are complete and valid', async () => {
      // 3 players, all have valid unique ranks 1-3
      (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([
        { finalRank: 1 },
        { finalRank: 2 },
        { finalRank: 3 },
      ]);

      const request = createAuthenticatedRequest(
        '/api/tournaments/test-id',
        TEST_IDS.TD_PLAYER,
        { method: 'PATCH', body: { status: 'FINISHED' } }
      );

      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(200);
    });
  });
});
