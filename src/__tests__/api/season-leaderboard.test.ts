/**
 * Tests for GET /api/seasons/[id]/leaderboard
 * RBAC enforcement for season leaderboard
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

import { GET } from '@/app/api/seasons/[id]/leaderboard/route';
import { prisma } from '@/lib/prisma';
import { calculateLeaderboard } from '@/lib/leaderboard';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockCalculateLeaderboard = calculateLeaderboard as jest.Mock;

describe('GET /api/seasons/[id]/leaderboard', () => {
  const seasonId = TEST_IDS.SEASON;

  const mockLeaderboardResult = {
    season: { id: seasonId, name: 'Saison 2025', status: 'ACTIVE' },
    leaderboard: [
      { playerId: 'p1', nickname: 'Player1', points: 100, rank: 1, tournamentsPlayed: 5 },
      { playerId: 'p2', nickname: 'Player2', points: 80, rank: 2, tournamentsPlayed: 4 },
    ],
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

    // Default leaderboard mock
    mockCalculateLeaderboard.mockResolvedValue(mockLeaderboardResult);
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest(
        `http://localhost/api/seasons/${seasonId}/leaderboard`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ id: seasonId }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('authentifié');
    });
  });

  describe('RBAC - INACTIVE status', () => {
    it('should return 403 when player status is INACTIVE', async () => {
      // Mock an INACTIVE player
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
        `http://localhost/api/seasons/${seasonId}/leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${inactivePlayerId}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: seasonId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('inactif');
    });
  });

  describe('RBAC - ACTIVE players', () => {
    it('should return 200 when PLAYER (ACTIVE) accesses leaderboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/seasons/${seasonId}/leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: seasonId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.leaderboard).toHaveLength(2);
    });

    it('should return 200 when TD (ACTIVE) accesses leaderboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/seasons/${seasonId}/leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: seasonId }) });

      expect(response.status).toBe(200);
    });

    it('should return 200 when ADMIN (ACTIVE) accesses leaderboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/seasons/${seasonId}/leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: seasonId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Response format', () => {
    it('should return leaderboard data with correct structure', async () => {
      const request = new NextRequest(
        `http://localhost/api/seasons/${seasonId}/leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: seasonId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('season');
      expect(data).toHaveProperty('leaderboard');
      expect(data.leaderboard[0]).toHaveProperty('playerId');
      expect(data.leaderboard[0]).toHaveProperty('nickname');
      expect(data.leaderboard[0]).toHaveProperty('points');
      expect(data.leaderboard[0]).toHaveProperty('rank');
    });
  });

  describe('Edge cases', () => {
    it('should return 404 when season does not exist', async () => {
      mockCalculateLeaderboard.mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/seasons/nonexistent/leaderboard`,
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
