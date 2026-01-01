/**
 * Tests for GET /api/tournaments/[id]/live-leaderboard
 * RBAC enforcement for live tournament leaderboard
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
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { GET } from '@/app/api/tournaments/[id]/live-leaderboard/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('GET /api/tournaments/[id]/live-leaderboard', () => {
  const tournamentId = TEST_IDS.TOURNAMENT;

  const mockTournament = {
    id: tournamentId,
    name: 'Test Tournament',
    date: new Date('2025-01-15'),
    status: 'IN_PROGRESS',
    buyInAmount: 10,
    startingChips: 5000,
    currentLevel: 3,
    season: {
      name: 'Saison 2025',
      eliminationPoints: 1,
      leaderKillerBonus: 3,
    },
    tournamentPlayers: [
      {
        playerId: 'p1',
        eliminationsCount: 2,
        leaderKills: 1,
        rebuysCount: 0,
        lightRebuyUsed: false,
        penaltyPoints: 0,
        finalRank: null,
        player: { id: 'p1', firstName: 'Player', lastName: 'One', nickname: 'p1', avatar: null },
      },
      {
        playerId: 'p2',
        eliminationsCount: 1,
        leaderKills: 0,
        rebuysCount: 1,
        lightRebuyUsed: false,
        penaltyPoints: -2,
        finalRank: null,
        player: { id: 'p2', firstName: 'Player', lastName: 'Two', nickname: 'p2', avatar: null },
      },
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

    // Default tournament mock
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

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
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${inactivePlayerId}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('inactif');
    });
  });

  describe('RBAC - ACTIVE players', () => {
    it('should return 200 when PLAYER (ACTIVE) accesses live leaderboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.leaderboard).toHaveLength(2);
    });

    it('should return 200 when TD (ACTIVE) accesses live leaderboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });

    it('should return 200 when ADMIN (ACTIVE) accesses live leaderboard', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Response format', () => {
    it('should return live leaderboard with correct structure', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty('tournament');
      expect(data).toHaveProperty('season');
      expect(data).toHaveProperty('leaderboard');
      expect(data).toHaveProperty('stats');

      expect(data.tournament).toHaveProperty('id');
      expect(data.tournament).toHaveProperty('name');
      expect(data.tournament).toHaveProperty('status');

      expect(data.leaderboard[0]).toHaveProperty('player');
      expect(data.leaderboard[0]).toHaveProperty('eliminationsCount');
      expect(data.leaderboard[0]).toHaveProperty('currentPoints');
      expect(data.leaderboard[0]).toHaveProperty('currentRank');
    });

    it('should sort leaderboard by points descending', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      // p1 has 2 eliminations (2pts) + 1 leader kill (3pts) = 5pts
      // p2 has 1 elimination (1pt) + 0 leader kills + penalty (-2) = -1pt
      expect(data.leaderboard[0].player.id).toBe('p1');
      expect(data.leaderboard[1].player.id).toBe('p2');
    });
  });

  describe('Edge cases', () => {
    it('should return 404 when tournament does not exist', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/tournaments/nonexistent/live-leaderboard`,
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

    it('should return 400 when tournament has no season', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        season: null,
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
    });
  });

  describe('FINISHED leaderboard contract', () => {
    const finishedTournament = {
      id: TEST_IDS.TOURNAMENT,
      name: 'Finished Tournament',
      date: new Date('2025-01-15'),
      status: 'FINISHED',
      buyInAmount: 10,
      startingChips: 5000,
      currentLevel: 10,
      season: {
        name: 'Saison 2025',
        eliminationPoints: 1,
        leaderKillerBonus: 3,
      },
      tournamentPlayers: [
        {
          playerId: 'p1',
          eliminationsCount: 3,
          leaderKills: 1,
          rebuysCount: 0,
          lightRebuyUsed: false,
          penaltyPoints: 0,
          finalRank: 1,
          player: { id: 'p1', firstName: 'Winner', lastName: 'Player', nickname: 'winner', avatar: null },
        },
        {
          playerId: 'p2',
          eliminationsCount: 1,
          leaderKills: 0,
          rebuysCount: 1,
          lightRebuyUsed: false,
          penaltyPoints: -2,
          finalRank: 2,
          player: { id: 'p2', firstName: 'Second', lastName: 'Player', nickname: 'second', avatar: null },
        },
        {
          playerId: 'p3',
          eliminationsCount: 0,
          leaderKills: 0,
          rebuysCount: 0,
          lightRebuyUsed: false,
          penaltyPoints: 0,
          finalRank: 3,
          player: { id: 'p3', firstName: 'Third', lastName: 'Player', nickname: 'third', avatar: null },
        },
      ],
    };

    it('should return finished leaderboard sorted by finalRank with N entries', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(finishedTournament);

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Check N entries
      expect(data.leaderboard).toHaveLength(3);

      // Check sorted by finalRank asc (1, 2, 3)
      expect(data.leaderboard[0].finalRank).toBe(1);
      expect(data.leaderboard[1].finalRank).toBe(2);
      expect(data.leaderboard[2].finalRank).toBe(3);

      // Check currentRank matches finalRank
      expect(data.leaderboard[0].currentRank).toBe(1);
      expect(data.leaderboard[1].currentRank).toBe(2);
      expect(data.leaderboard[2].currentRank).toBe(3);

      // All finalRank are non-null
      data.leaderboard.forEach((entry: { finalRank: number | null }) => {
        expect(entry.finalRank).not.toBeNull();
      });
    });

    it('should return 400 when finished leaderboard has inconsistent ranks (null rank)', async () => {
      const corruptedTournament = {
        ...finishedTournament,
        tournamentPlayers: [
          { ...finishedTournament.tournamentPlayers[0], finalRank: 1 },
          { ...finishedTournament.tournamentPlayers[1], finalRank: 2 },
          { ...finishedTournament.tournamentPlayers[2], finalRank: null }, // Corrupted: missing rank
        ],
      };
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(corruptedTournament);

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid finished leaderboard: final ranks are inconsistent');
    });

    it('should return 400 when finished leaderboard has duplicate ranks', async () => {
      const corruptedTournament = {
        ...finishedTournament,
        tournamentPlayers: [
          { ...finishedTournament.tournamentPlayers[0], finalRank: 1 },
          { ...finishedTournament.tournamentPlayers[1], finalRank: 2 },
          { ...finishedTournament.tournamentPlayers[2], finalRank: 2 }, // Corrupted: duplicate rank
        ],
      };
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(corruptedTournament);

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/live-leaderboard`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid finished leaderboard: final ranks are inconsistent');
    });
  });
});
