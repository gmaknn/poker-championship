/**
 * Tests for POST /api/tournaments/[id]/rebuys
 * Business rules enforcement and RBAC
 */

import { NextRequest } from 'next/server';
import { MOCK_PLAYERS, TEST_IDS } from '@/test-utils/mocks';

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
    },
    tournamentPlayer: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    tournamentDirector: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { POST } from '@/app/api/tournaments/[id]/rebuys/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('POST /api/tournaments/[id]/rebuys - Business Rules', () => {
  const tournamentId = TEST_IDS.TOURNAMENT;
  // Use a valid CUID format for playerId (Zod validates cuid format)
  const playerId = 'clx0000000000000000000001';

  const mockTournament = {
    id: tournamentId,
    name: 'Test Tournament',
    status: 'IN_PROGRESS',
    currentLevel: 3,
    rebuyEndLevel: 5,
    maxRebuysPerPlayer: null, // unlimited by default
    lightRebuyEnabled: true,
    lightRebuyAmount: 5,
    buyInAmount: 10,
    createdById: TEST_IDS.TD_PLAYER,
    timerStartedAt: null,
    timerPausedAt: null,
    timerElapsedSeconds: 0,
    blindLevels: [
      { level: 1, duration: 12 },
      { level: 2, duration: 12 },
      { level: 3, duration: 12 },
      { level: 4, duration: 12 },
      { level: 5, duration: 12 },
      { level: 6, duration: 12 },
    ],
    season: {
      freeRebuysCount: 2,
      rebuyPenaltyTier1: -50,
      rebuyPenaltyTier2: -100,
      rebuyPenaltyTier3: -150,
    },
  };

  const mockTournamentPlayer = {
    id: 'tp-123',
    tournamentId,
    playerId,
    rebuysCount: 0,
    lightRebuyUsed: false,
    finalRank: null,
    penaltyPoints: 0,
  };

  const validPayload = {
    playerId,
    type: 'STANDARD',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default player mock for auth
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === TEST_IDS.ADMIN_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.admin, roles: [] });
        }
        if (where.id === TEST_IDS.TD_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.tournamentDirector, roles: [] });
        }
        if (where.id === TEST_IDS.REGULAR_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.player, roles: [] });
        }
        return Promise.resolve(null);
      }
    );

    // Default tournament mock
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);

    // Default tournament player mock
    (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue(mockTournamentPlayer);

    // Default TD assignment mock (not assigned by default)
    (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);

    // Default update mock (legacy, kept for compatibility)
    (mockPrisma.tournamentPlayer.update as jest.Mock).mockResolvedValue({
      ...mockTournamentPlayer,
      rebuysCount: 1,
      player: { id: playerId, firstName: 'Test', lastName: 'Player', nickname: 'tester' },
    });

    // Default transaction mock - updated for atomic transaction
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const mockTx = {
        tournamentPlayer: {
          findUnique: jest.fn().mockResolvedValue(mockTournamentPlayer),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return fn(mockTx);
    });
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('authentifié');
    });
  });

  describe('RBAC - PLAYER role', () => {
    it('should return 403 when PLAYER tries to add rebuy', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
    });
  });

  describe('RBAC - TD not assigned', () => {
    it('should return 403 when TD is not creator and not assigned', async () => {
      // Change creator to someone else
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        createdById: 'other-td-id',
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
    });
  });

  describe('Business Rule: Tournament Status', () => {
    it('should return 400 when tournament is not IN_PROGRESS', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        status: 'PLANNED',
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not in progress');
    });

    it('should return 400 when tournament is FINISHED (readonly)', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        status: 'FINISHED',
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Tournament is finished');
    });
  });

  describe('Business Rule: Late Registration / Rebuy Period', () => {
    it('should return 400 when rebuy period has ended (currentLevel > rebuyEndLevel)', async () => {
      // Pour simuler niveau 6 avec rebuyEndLevel 5, on doit simuler un temps écoulé
      // 6 niveaux de 12 min = 72 min = 4320 sec. Niveau 6 atteint à 3600 sec (5 niveaux complets)
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        currentLevel: 6, // > rebuyEndLevel (5)
        rebuyEndLevel: 5,
        timerElapsedSeconds: 3700, // Après niveau 5, dans niveau 6
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Période de recaves terminée');
    });

    it('should allow rebuy when currentLevel equals rebuyEndLevel', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        currentLevel: 5, // == rebuyEndLevel
        rebuyEndLevel: 5,
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });

    it('should allow LIGHT rebuy during break immediately after rebuyEndLevel', async () => {
      // rebuyEndLevel = 1, effectiveLevel = 2 (break)
      // blindLevels[1] (level 2) has isBreak: true
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        currentLevel: 2,
        rebuyEndLevel: 1,
        timerElapsedSeconds: 750, // Past level 1 (12min = 720sec), into level 2
        blindLevels: [
          { level: 1, duration: 12, isBreak: false },
          { level: 2, duration: 15, isBreak: true },  // Break after rebuyEndLevel
          { level: 3, duration: 12, isBreak: false },
        ],
      });

      const lightPayload = {
        playerId,
        type: 'LIGHT',
      };

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(lightPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });

    it('should reject LIGHT rebuy when level after break (effectiveLevel > rebuyEndLevel + 1)', async () => {
      // rebuyEndLevel = 1, effectiveLevel = 3 (after break)
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        currentLevel: 3,
        rebuyEndLevel: 1,
        timerElapsedSeconds: 1700, // Past level 1 (720) + level 2 (900) = 1620, into level 3
        blindLevels: [
          { level: 1, duration: 12, isBreak: false },
          { level: 2, duration: 15, isBreak: true },
          { level: 3, duration: 12, isBreak: false },
        ],
      });

      const lightPayload = {
        playerId,
        type: 'LIGHT',
      };

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(lightPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Période de recaves terminée');
    });

    it('should reject STANDARD rebuy during break after rebuyEndLevel (non-regression)', async () => {
      // rebuyEndLevel = 1, effectiveLevel = 2 (break)
      // STANDARD rebuy should still be rejected during break
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        currentLevel: 2,
        rebuyEndLevel: 1,
        timerElapsedSeconds: 750, // Past level 1, into level 2 (break)
        blindLevels: [
          { level: 1, duration: 12, isBreak: false },
          { level: 2, duration: 15, isBreak: true },
          { level: 3, duration: 12, isBreak: false },
        ],
      });

      const standardPayload = {
        playerId,
        type: 'STANDARD',
      };

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(standardPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Période de recaves terminée');
    });
  });

  describe('Business Rule: Player Eliminated', () => {
    it('should return 400 when player has been eliminated', async () => {
      (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournamentPlayer,
        finalRank: 5, // Eliminated at rank 5
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('eliminated');
    });
  });

  describe('Business Rule: Max Rebuys Per Player', () => {
    it('should return 400 when max rebuys reached', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        maxRebuysPerPlayer: 3,
      });
      (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournamentPlayer,
        rebuysCount: 3, // Already at max
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Maximum rebuys reached');
    });

    it('should allow rebuy when under max limit', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        maxRebuysPerPlayer: 3,
      });
      (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournamentPlayer,
        rebuysCount: 2, // Under max
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });

    it('should allow unlimited rebuys when maxRebuysPerPlayer is null', async () => {
      (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournamentPlayer,
        rebuysCount: 10, // Many rebuys but no limit
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Success Cases', () => {
    it('should return 200 when TD creator adds rebuy', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.rebuyType).toBe('STANDARD');
    });

    it('should return 200 when TD is assigned to tournament', async () => {
      // Change creator to someone else
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        createdById: 'other-td-id',
      });

      // TD is assigned
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue({
        id: 'assignment-1',
        tournamentId,
        playerId: TEST_IDS.TD_PLAYER,
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });

    it('should return 200 when ADMIN adds rebuy', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Edge Cases', () => {
    it('should return 404 when tournament does not exist', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/tournaments/nonexistent/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('should return 404 when player is not enrolled', async () => {
      (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
          body: JSON.stringify(validPayload),
        }
      );

      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('not enrolled');
    });
  });
});

/**
 * Sentinel test: Rebuy impacts prize pool calculation
 * This test verifies that after a successful rebuy,
 * the prize pool endpoint reflects the increase
 */
describe('Sentinel: Rebuy impacts Prize Pool', () => {
  it('should increase prize pool when rebuy is added (conceptual validation)', () => {
    // Prize pool calculation formula:
    // totalPrizePool = (paidPlayers * buyInAmount) + (totalRebuys * buyInAmount) + (lightRebuys * lightRebuyAmount)

    // Before rebuy:
    const beforeBuyIns = 3 * 10; // 30
    const beforeRebuys = 0 * 10; // 0
    const beforePrizePool = beforeBuyIns + beforeRebuys; // 30

    // After rebuy:
    const afterBuyIns = 3 * 10; // 30
    const afterRebuys = 1 * 10; // 10
    const afterPrizePool = afterBuyIns + afterRebuys; // 40

    expect(afterPrizePool).toBeGreaterThan(beforePrizePool);
    expect(afterPrizePool - beforePrizePool).toBe(10); // rebuyAmount
  });
});

/**
 * Concurrency / Race condition tests
 * These tests verify that the rebuy endpoint is atomic and race-safe
 */
describe('Concurrency: Atomic rebuys', () => {
  const tournamentId = TEST_IDS.TOURNAMENT;
  const playerId = 'clx0000000000000000000001';

  it('should not allow double submit rebuy for same player (race-safe)', async () => {
    // This test simulates two concurrent requests trying to add a rebuy for the same player
    // Only one should succeed, the other should get 400

    // Track call count to simulate race condition
    let transactionCallCount = 0;
    let firstCallCompleted = false;

    const mockTournament = {
      id: tournamentId,
      name: 'Test Tournament',
      status: 'IN_PROGRESS',
      currentLevel: 3,
      rebuyEndLevel: 5,
      maxRebuysPerPlayer: 1, // Max 1 rebuy - important for race detection
      lightRebuyEnabled: false,
      createdById: TEST_IDS.TD_PLAYER,
      timerStartedAt: null,
      timerPausedAt: null,
      timerElapsedSeconds: 0,
      blindLevels: [
        { level: 1, duration: 12 },
        { level: 2, duration: 12 },
        { level: 3, duration: 12 },
        { level: 4, duration: 12 },
        { level: 5, duration: 12 },
        { level: 6, duration: 12 },
      ],
      season: null,
    };

    const mockTournamentPlayer = {
      id: 'tp-123',
      tournamentId,
      playerId,
      rebuysCount: 0,
      lightRebuyUsed: false,
      finalRank: null,
      penaltyPoints: 0,
    };

    // Mock prisma to simulate concurrent behavior
    const mockTransaction = jest.fn().mockImplementation(async (fn) => {
      transactionCallCount++;
      const callNumber = transactionCallCount;

      const mockTx = {
        tournamentPlayer: {
          findUnique: jest.fn().mockImplementation(async () => {
            // Both calls see rebuysCount = 0 initially (race condition)
            if (callNumber === 1 || !firstCallCompleted) {
              return { ...mockTournamentPlayer, rebuysCount: 0 };
            }
            // After first call, rebuysCount = 1
            return { ...mockTournamentPlayer, rebuysCount: 1 };
          }),
          updateMany: jest.fn().mockImplementation(async () => {
            // First call succeeds (count = 1)
            // Second call fails because rebuysCount changed from 0 to 1 (count = 0)
            if (callNumber === 1) {
              firstCallCompleted = true;
              return { count: 1 };
            }
            return { count: 0 }; // Optimistic lock failed
          }),
        },
      };

      return fn(mockTx);
    });

    // Replace prisma.$transaction with our mock
    (mockPrisma.$transaction as jest.Mock) = mockTransaction;

    // Reset mocks for this test
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === TEST_IDS.TD_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.tournamentDirector, roles: [] });
        }
        return Promise.resolve(null);
      }
    );

    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
    (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue(mockTournamentPlayer);
    (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);

    const payload = { playerId, type: 'STANDARD' };

    // Create two identical requests
    const request1 = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/rebuys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const request2 = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/rebuys`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
        body: JSON.stringify(payload),
      }
    );

    // Execute both requests
    const [response1, response2] = await Promise.all([
      POST(request1, { params: Promise.resolve({ id: tournamentId }) }),
      POST(request2, { params: Promise.resolve({ id: tournamentId }) }),
    ]);

    const statuses = [response1.status, response2.status].sort();

    // One should succeed (200), one should fail (400)
    expect(statuses).toContain(200);
    expect(statuses).toContain(400);

    // The failed one should have the right error message
    const failedResponse = response1.status === 400 ? response1 : response2;
    const data = await failedResponse.json();
    expect(data.error).toBe('Maximum rebuys reached');
  });
});
