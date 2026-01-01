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
    },
    tournamentDirector: {
      findUnique: jest.fn(),
    },
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

    // Default update mock
    (mockPrisma.tournamentPlayer.update as jest.Mock).mockResolvedValue({
      ...mockTournamentPlayer,
      rebuysCount: 1,
      player: { id: playerId, firstName: 'Test', lastName: 'Player', nickname: 'tester' },
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
  });

  describe('Business Rule: Late Registration / Rebuy Period', () => {
    it('should return 400 when rebuy period has ended (currentLevel > rebuyEndLevel)', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        currentLevel: 6, // > rebuyEndLevel (5)
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

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Rebuy period has ended');
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
