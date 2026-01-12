/**
 * RBAC tests for /api/tournaments/[id]/rebuys endpoint
 * Tests: POST rebuy (standard and light)
 */

import { createAuthenticatedRequest, createMockRequest } from '@/test-utils/request';
import { TEST_IDS, MOCK_SEASON, MOCK_PLAYERS } from '@/test-utils/mocks';
import { resetMockPrisma, mockPrismaClient } from '@/test-utils/prisma';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Mock auth - returns null by default (not authenticated via NextAuth)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

// Player ID for rebuy tests (must be valid CUID)
const REBUY_PLAYER_ID = 'cltestrebuyplayer001';

// Mock tournament data with rebuy settings
const MOCK_TOURNAMENT_REBUY = {
  id: TEST_IDS.TOURNAMENT,
  name: 'Test Tournament',
  seasonId: TEST_IDS.SEASON,
  date: new Date('2025-01-15'),
  buyInAmount: 10,
  startingChips: 5000,
  targetDuration: 180,
  status: 'IN_PROGRESS',
  currentLevel: 3,
  rebuyEndLevel: 6,
  lightRebuyEnabled: true,
  createdById: TEST_IDS.TD_PLAYER,
  season: {
    ...MOCK_SEASON,
    freeRebuysCount: 2,
    rebuyPenaltyTier1: -3,
    rebuyPenaltyTier2: -5,
    rebuyPenaltyTier3: -7,
  },
};

// Mock tournament player
const MOCK_TOURNAMENT_PLAYER = {
  tournamentId: TEST_IDS.TOURNAMENT,
  playerId: REBUY_PLAYER_ID,
  finalRank: null,
  rebuysCount: 0,
  lightRebuyUsed: false,
  penaltyPoints: 0,
  player: { id: REBUY_PLAYER_ID, firstName: 'Rebuy', lastName: 'Player', nickname: 'rebuyPlayer' },
};

// Dynamic import after mocks
let rebuysPOST: typeof import('@/app/api/tournaments/[id]/rebuys/route').POST;

describe('API /api/tournaments/[id]/rebuys RBAC', () => {
  beforeAll(async () => {
    const module = await import('@/app/api/tournaments/[id]/rebuys/route');
    rebuysPOST = module.POST;
  });

  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();

    // Add test player to mock store
    mockPrismaClient.player.findUnique.mockImplementation(({ where }: { where: { id?: string; nickname?: string } }) => {
      if (where.id === REBUY_PLAYER_ID) {
        return Promise.resolve({ id: REBUY_PLAYER_ID, firstName: 'Rebuy', lastName: 'Player', nickname: 'rebuyPlayer', email: 'rebuy@test.com', avatar: null, role: 'PLAYER', status: 'ACTIVE' });
      }
      // Fall through to original mock
      if (where.id === TEST_IDS.ADMIN_PLAYER) return Promise.resolve(MOCK_PLAYERS.admin);
      if (where.id === TEST_IDS.TD_PLAYER) return Promise.resolve(MOCK_PLAYERS.tournamentDirector);
      if (where.id === TEST_IDS.REGULAR_PLAYER) return Promise.resolve(MOCK_PLAYERS.player);
      return Promise.resolve(null);
    });

    // Setup tournament mock with rebuy settings
    mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === TEST_IDS.TOURNAMENT) {
        return Promise.resolve({ ...MOCK_TOURNAMENT_REBUY });
      }
      return Promise.resolve(null);
    });

    // Setup tournamentPlayer mock
    mockPrismaClient.tournamentPlayer = {
      findMany: jest.fn().mockResolvedValue([MOCK_TOURNAMENT_PLAYER]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockImplementation(({ where }: { where: { tournamentId_playerId: { tournamentId: string; playerId: string } } }) => {
        if (where.tournamentId_playerId.tournamentId === TEST_IDS.TOURNAMENT &&
            where.tournamentId_playerId.playerId === REBUY_PLAYER_ID) {
          return Promise.resolve({ ...MOCK_TOURNAMENT_PLAYER });
        }
        return Promise.resolve(null);
      }),
      update: jest.fn().mockImplementation(({ where, data, include }) => {
        return Promise.resolve({
          ...MOCK_TOURNAMENT_PLAYER,
          ...data,
          player: MOCK_TOURNAMENT_PLAYER.player,
        });
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(5),
      aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
    };

    // Setup transaction mock - for atomic rebuys
    mockPrismaClient.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        tournamentPlayer: {
          findUnique: jest.fn().mockResolvedValue({ ...MOCK_TOURNAMENT_PLAYER }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return fn(tx);
    });
  });

  const createParams = (id: string) => Promise.resolve({ id });

  describe('POST /api/tournaments/[id]/rebuys', () => {
    const validStandardRebuy = {
      playerId: REBUY_PLAYER_ID,
      type: 'STANDARD',
    };

    const validLightRebuy = {
      playerId: REBUY_PLAYER_ID,
      type: 'LIGHT',
    };

    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`, {
        method: 'POST',
        body: validStandardRebuy,
      });
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.REGULAR_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 200 for tournament creator (TD) with standard rebuy', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.rebuyType).toBe('STANDARD');
    });

    it('should return 200 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
    });

    it('should return 200 for light rebuy when enabled', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validLightRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.rebuyType).toBe('LIGHT');
    });

    it('should return 404 for non-existent tournament', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/non-existent/rebuys',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams('non-existent') });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid payload (Zod validation)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: {
            playerId: 'invalid-id', // Not a valid CUID
            type: 'INVALID_TYPE', // Not a valid enum value
          },
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 400 when tournament is not in progress', async () => {
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({ ...MOCK_TOURNAMENT_REBUY, status: 'PLANNED' });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not in progress');
    });

    it('should return 400 when rebuy period has ended', async () => {
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({ ...MOCK_TOURNAMENT_REBUY, currentLevel: 10, rebuyEndLevel: 6 }); // Past rebuy end
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Période de recaves terminée');
    });

    it('should return 404 when player is not enrolled in tournament', async () => {
      mockPrismaClient.tournamentPlayer.findUnique.mockResolvedValue(null);

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not enrolled');
    });

    it('should return 400 when player has been eliminated', async () => {
      mockPrismaClient.tournamentPlayer.findUnique.mockResolvedValue({
        ...MOCK_TOURNAMENT_PLAYER,
        finalRank: 5, // Player was eliminated
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validStandardRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('eliminated');
    });

    it('should return 400 for light rebuy when not enabled', async () => {
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({ ...MOCK_TOURNAMENT_REBUY, lightRebuyEnabled: false });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validLightRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Light rebuy is not enabled');
    });

    it('should return 400 when light rebuy already used', async () => {
      mockPrismaClient.tournamentPlayer.findUnique.mockResolvedValue({
        ...MOCK_TOURNAMENT_PLAYER,
        lightRebuyUsed: true,
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/rebuys`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validLightRebuy,
        }
      );
      const response = await rebuysPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('already used their light rebuy');
    });
  });
});
