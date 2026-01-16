/**
 * RBAC tests for /api/tournaments/[id]/eliminations endpoint
 * Tests: GET eliminations (public), POST create elimination
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

// Mock socket to avoid WebSocket issues
jest.mock('@/lib/socket', () => ({
  emitToTournament: jest.fn(),
}));

// Additional player IDs for elimination tests (must be valid CUIDs)
const PLAYER_A_ID = 'cltestplayera00000001';
const PLAYER_B_ID = 'cltestplayerb00000002';

// Mock tournament data with players enrolled
// rebuyEndLevel: 2 et currentLevel: 3 => recaves fermées (currentLevel > rebuyEndLevel)
// timerElapsedSeconds: 1500 sec = 25 min = après niveau 2 (niveau 3)
const MOCK_TOURNAMENT_ELIM = {
  id: TEST_IDS.TOURNAMENT,
  name: 'Test Tournament',
  seasonId: TEST_IDS.SEASON,
  date: new Date('2025-01-15'),
  buyInAmount: 10,
  startingChips: 5000,
  targetDuration: 180,
  status: 'IN_PROGRESS',
  currentLevel: 3,
  rebuyEndLevel: 2, // Recaves fermées (currentLevel 3 > rebuyEndLevel 2)
  createdById: TEST_IDS.TD_PLAYER,
  timerStartedAt: null,
  timerPausedAt: null,
  timerElapsedSeconds: 1500, // 25 min = après niveau 2 (12+12=24 min), donc niveau 3
  blindLevels: [
    { level: 1, duration: 12 },
    { level: 2, duration: 12 },
    { level: 3, duration: 12 },
  ],
  season: MOCK_SEASON,
  tournamentPlayers: [
    {
      tournamentId: TEST_IDS.TOURNAMENT,
      playerId: PLAYER_A_ID,
      finalRank: null,
      rebuysCount: 0,
      eliminationsCount: 0,
      player: { id: PLAYER_A_ID, firstName: 'Player', lastName: 'A', nickname: 'playerA' },
    },
    {
      tournamentId: TEST_IDS.TOURNAMENT,
      playerId: PLAYER_B_ID,
      finalRank: null,
      rebuysCount: 0,
      eliminationsCount: 0,
      player: { id: PLAYER_B_ID, firstName: 'Player', lastName: 'B', nickname: 'playerB' },
    },
  ],
};

// Mock eliminations
const MOCK_ELIMINATIONS = [
  {
    id: 'elim-1',
    tournamentId: TEST_IDS.TOURNAMENT,
    eliminatedId: 'cltest-other-player',
    eliminatorId: PLAYER_A_ID,
    rank: 5,
    level: 2,
    isLeaderKill: false,
    createdAt: new Date(),
    eliminated: { id: 'cltest-other-player', firstName: 'Other', lastName: 'Player', nickname: 'other' },
    eliminator: { id: PLAYER_A_ID, firstName: 'Player', lastName: 'A', nickname: 'playerA' },
  },
];

// Dynamic import after mocks
let eliminationsGET: typeof import('@/app/api/tournaments/[id]/eliminations/route').GET;
let eliminationsPOST: typeof import('@/app/api/tournaments/[id]/eliminations/route').POST;

describe('API /api/tournaments/[id]/eliminations RBAC', () => {
  beforeAll(async () => {
    const module = await import('@/app/api/tournaments/[id]/eliminations/route');
    eliminationsGET = module.GET;
    eliminationsPOST = module.POST;
  });

  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();

    // Add test players to mock store
    mockPrismaClient.player.findUnique.mockImplementation(({ where }: { where: { id?: string; nickname?: string } }) => {
      if (where.id === PLAYER_A_ID) {
        return Promise.resolve({ id: PLAYER_A_ID, firstName: 'Player', lastName: 'A', nickname: 'playerA', email: 'a@test.com', avatar: null, role: 'PLAYER', status: 'ACTIVE' });
      }
      if (where.id === PLAYER_B_ID) {
        return Promise.resolve({ id: PLAYER_B_ID, firstName: 'Player', lastName: 'B', nickname: 'playerB', email: 'b@test.com', avatar: null, role: 'PLAYER', status: 'ACTIVE' });
      }
      // Fall through to original mock
      if (where.id === TEST_IDS.ADMIN_PLAYER) return Promise.resolve(MOCK_PLAYERS.admin);
      if (where.id === TEST_IDS.TD_PLAYER) return Promise.resolve(MOCK_PLAYERS.tournamentDirector);
      if (where.id === TEST_IDS.REGULAR_PLAYER) return Promise.resolve(MOCK_PLAYERS.player);
      return Promise.resolve(null);
    });

    // Setup tournament mock with players
    mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === TEST_IDS.TOURNAMENT) {
        return Promise.resolve({ ...MOCK_TOURNAMENT_ELIM });
      }
      return Promise.resolve(null);
    });

    // Setup elimination mock
    mockPrismaClient.elimination = {
      findMany: jest.fn().mockResolvedValue(MOCK_ELIMINATIONS),
      create: jest.fn().mockImplementation(({ data, include }) => {
        return Promise.resolve({
          id: 'new-elim-id',
          ...data,
          createdAt: new Date(),
          eliminated: { id: data.eliminatedId, firstName: 'Player', lastName: 'A', nickname: 'playerA' },
          eliminator: { id: data.eliminatorId, firstName: 'Player', lastName: 'B', nickname: 'playerB' },
        });
      }),
      groupBy: jest.fn().mockResolvedValue([]),
    };

    // Setup tournamentPlayer mock
    mockPrismaClient.tournamentPlayer = {
      findMany: jest.fn().mockResolvedValue(MOCK_TOURNAMENT_ELIM.tournamentPlayers),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(5),
      aggregate: jest.fn().mockResolvedValue({ _sum: {} }),
    };

    // Setup transaction mock - updated for atomic transaction
    mockPrismaClient.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        tournamentPlayer: {
          findMany: jest.fn().mockResolvedValue(MOCK_TOURNAMENT_ELIM.tournamentPlayers),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          update: jest.fn().mockResolvedValue({}),
        },
        elimination: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({
            id: 'new-elim-id',
            tournamentId: TEST_IDS.TOURNAMENT,
            eliminatedId: PLAYER_A_ID,
            eliminatorId: PLAYER_B_ID,
            rank: 2,
            level: 3,
            isLeaderKill: true,
            eliminated: { id: PLAYER_A_ID, firstName: 'Player', lastName: 'A', nickname: 'playerA' },
            eliminator: { id: PLAYER_B_ID, firstName: 'Player', lastName: 'B', nickname: 'playerB' },
          }),
        },
      };
      return fn(tx);
    });
  });

  const createParams = (id: string) => Promise.resolve({ id });

  describe('GET /api/tournaments/[id]/eliminations', () => {
    it('should return eliminations for unauthenticated users (public)', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`);
      const response = await eliminationsGET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/tournaments/[id]/eliminations', () => {
    const validEliminationData = {
      eliminatedId: PLAYER_A_ID,
      eliminatorId: PLAYER_B_ID,
    };

    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`, {
        method: 'POST',
        body: validEliminationData,
      });
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.REGULAR_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 201 for tournament creator (TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 201 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(201);
    });

    it('should return 404 for non-existent tournament', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/non-existent/eliminations',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams('non-existent') });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid payload (Zod validation)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: {
            eliminatedId: 'invalid-id', // Not a valid CUID
            eliminatorId: 'also-invalid',
          },
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 400 when tournament is not in progress', async () => {
      // Change tournament status to PLANNED
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({ ...MOCK_TOURNAMENT_ELIM, status: 'PLANNED' });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not in progress');
    });

    it('should return 400 when player not enrolled in tournament', async () => {
      // Remove players from tournament
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({ ...MOCK_TOURNAMENT_ELIM, tournamentPlayers: [] });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not enrolled');
    });

    it('should return 400 when player already eliminated', async () => {
      // Set player as already eliminated
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_ELIM,
            tournamentPlayers: [
              { ...MOCK_TOURNAMENT_ELIM.tournamentPlayers[0], finalRank: 5 }, // Already eliminated
              MOCK_TOURNAMENT_ELIM.tournamentPlayers[1],
            ],
          });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('already been eliminated');
    });

    it('should return 400 when recaves are still open (rebuyEndLevel null)', async () => {
      // rebuyEndLevel null => recaves toujours ouvertes
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_ELIM,
            currentLevel: 1,
            rebuyEndLevel: null, // null => recaves ouvertes
          });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('recaves encore ouverte');
    });

    it('should return 201 when rebuyEndLevel=0 and currentLevel=1 (recaves closed)', async () => {
      // CRITICAL TEST: rebuyEndLevel=0, currentLevel=1 => 1 > 0 => recaves fermees
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_ELIM,
            currentLevel: 1,
            rebuyEndLevel: 0, // 0 => recaves fermees si currentLevel > 0
          });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 400 when rebuyEndLevel=1 and currentLevel=1 (recaves still open)', async () => {
      // rebuyEndLevel=1, currentLevel=1 => 1 <= 1 => recaves OUVERTES
      // Doit réinitialiser timerElapsedSeconds à 0 pour que le niveau effectif soit 1
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_ELIM,
            currentLevel: 1,
            rebuyEndLevel: 1, // currentLevel <= rebuyEndLevel => recaves ouvertes
            timerElapsedSeconds: 0, // Réinitialiser pour niveau effectif = 1
          });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/eliminations`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validEliminationData,
        }
      );
      const response = await eliminationsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('recaves encore ouverte');
    });
  });
});
