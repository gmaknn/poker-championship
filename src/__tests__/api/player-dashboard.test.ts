/**
 * Tests for GET /api/players/[id]/dashboard
 * RBAC enforcement for player dashboard/stats
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
    season: {
      findFirst: jest.fn(),
    },
    tournament: {
      findMany: jest.fn(),
    },
    tournamentPlayer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    elimination: {
      groupBy: jest.fn(),
    },
  },
}));

// Mock leaderboard calculation
jest.mock('@/lib/leaderboard', () => ({
  calculateLeaderboard: jest.fn(),
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { GET } from '@/app/api/players/[id]/dashboard/route';
import { prisma } from '@/lib/prisma';
import { calculateLeaderboard } from '@/lib/leaderboard';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCalculateLeaderboard = calculateLeaderboard as jest.Mock;

describe('GET /api/players/[id]/dashboard', () => {
  const playerId = TEST_IDS.REGULAR_PLAYER;

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

    // Default season mock
    (mockPrisma.season.findFirst as jest.Mock).mockResolvedValue({
      id: TEST_IDS.SEASON,
      name: 'Saison 2025',
      status: 'ACTIVE',
    });

    // Default tournament mocks
    (mockPrisma.tournament.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.tournamentPlayer.findFirst as jest.Mock).mockResolvedValue(null);
    (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.tournamentPlayer.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.tournamentPlayer.aggregate as jest.Mock).mockResolvedValue({
      _sum: { eliminationsCount: 0, leaderKills: 0, rebuysCount: 0, prizeAmount: 0 },
    });
    (mockPrisma.elimination.groupBy as jest.Mock).mockResolvedValue([]);

    // Default leaderboard mock
    mockCalculateLeaderboard.mockResolvedValue({
      season: { id: TEST_IDS.SEASON, name: 'Saison 2025' },
      leaderboard: [],
    });
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest(
        `http://localhost/api/players/${playerId}/dashboard`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ id: playerId }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('authentifié');
    });
  });

  describe('RBAC - INACTIVE status', () => {
    it('should return 403 when player status is INACTIVE', async () => {
      const inactivePlayerId = 'inactive-player-id';
      (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
        ({ where }: { where: { id?: string } }) => {
          if (where.id === inactivePlayerId) {
            return Promise.resolve({
              ...MOCK_PLAYERS.player,
              id: inactivePlayerId,
              status: 'INACTIVE',
              roles: [],
            });
          }
          return Promise.resolve(null);
        }
      );

      const request = new NextRequest(
        `http://localhost/api/players/${playerId}/dashboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${inactivePlayerId}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: playerId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('inactif');
    });
  });

  describe('RBAC - ACTIVE players', () => {
    it('should return 200 when PLAYER (ACTIVE) accesses dashboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/players/${playerId}/dashboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: playerId }) });

      expect(response.status).toBe(200);
    });

    it('should return 200 when TD (ACTIVE) accesses dashboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/players/${playerId}/dashboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: playerId }) });

      expect(response.status).toBe(200);
    });

    it('should return 200 when ADMIN (ACTIVE) accesses dashboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/players/${playerId}/dashboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: playerId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Response format', () => {
    it('should return dashboard data with correct structure', async () => {
      const request = new NextRequest(
        `http://localhost/api/players/${playerId}/dashboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: playerId }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('player');
      expect(data).toHaveProperty('activeSeason');
      expect(data).toHaveProperty('upcomingTournaments');
      expect(data).toHaveProperty('lastTournament');
      expect(data).toHaveProperty('leaderboardTop10');
      expect(data).toHaveProperty('tournamentHistory');
      expect(data).toHaveProperty('funStats');
      expect(data).toHaveProperty('badges');
    });

    it('should include funStats with all expected fields', async () => {
      const request = new NextRequest(
        `http://localhost/api/players/${playerId}/dashboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: playerId }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.funStats).toHaveProperty('nemesis');
      expect(data.funStats).toHaveProperty('favoriteVictim');
      expect(data.funStats).toHaveProperty('totalTournaments');
      expect(data.funStats).toHaveProperty('victories');
      expect(data.funStats).toHaveProperty('podiums');
      expect(data.funStats).toHaveProperty('totalEliminations');
      expect(data.funStats).toHaveProperty('totalLeaderKills');
      expect(data.funStats).toHaveProperty('totalRebuys');
      expect(data.funStats).toHaveProperty('winRate');
      expect(data.funStats).toHaveProperty('itmRate');
    });
  });

  describe('Edge cases', () => {
    it('should return 404 when player does not exist', async () => {
      (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
        ({ where }: { where: { id?: string } }) => {
          // Return authenticated player for auth check
          if (where.id === TEST_IDS.REGULAR_PLAYER) {
            return Promise.resolve({ ...MOCK_PLAYERS.player, roles: [] });
          }
          // Return null for the target player
          return Promise.resolve(null);
        }
      );

      const request = new NextRequest(
        `http://localhost/api/players/nonexistent/dashboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });
  });
});
