/**
 * Tests for GET /api/tournaments/[id]/tables-plan
 * RBAC enforcement for TV tables plan view
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
    tournamentDirector: {
      findUnique: jest.fn(),
    },
    tableAssignment: {
      findMany: jest.fn(),
    },
    tournamentPlayer: {
      findMany: jest.fn(),
    },
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { GET } from '@/app/api/tournaments/[id]/tables-plan/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('GET /api/tournaments/[id]/tables-plan', () => {
  const tournamentId = 'cm0000000000000000000000t';

  const mockTournament = {
    id: tournamentId,
    name: 'Test Tournament',
    status: 'IN_PROGRESS',
    createdById: TEST_IDS.TD_PLAYER, // Created by TD
  };

  const mockTableAssignments = [
    { id: 'a1', tournamentId, playerId: 'p1', tableNumber: 1, seatNumber: 1, isActive: true },
    { id: 'a2', tournamentId, playerId: 'p2', tableNumber: 1, seatNumber: 2, isActive: true },
    { id: 'a3', tournamentId, playerId: 'p3', tableNumber: 2, seatNumber: 1, isActive: true },
  ];

  const mockTournamentPlayers = [
    {
      playerId: 'p1',
      finalRank: null,
      player: { id: 'p1', firstName: 'Player', lastName: 'One', nickname: 'p1', avatar: null },
    },
    {
      playerId: 'p2',
      finalRank: null,
      player: { id: 'p2', firstName: 'Player', lastName: 'Two', nickname: 'p2', avatar: null },
    },
    {
      playerId: 'p3',
      finalRank: 3, // Eliminated
      player: { id: 'p3', firstName: 'Player', lastName: 'Three', nickname: 'p3', avatar: null },
    },
  ];

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

    // Default table assignments mock
    (mockPrisma.tableAssignment.findMany as jest.Mock).mockResolvedValue(mockTableAssignments);

    // Default tournament players mock
    (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue(mockTournamentPlayers);

    // Default TD assignment mock (not assigned by default)
    (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
        { method: 'GET' }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('authentifié');
    });
  });

  describe('RBAC - PLAYER role', () => {
    it('should return 403 when PLAYER tries to access', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('refusé');
    });
  });

  describe('RBAC - ADMIN role', () => {
    it('should return 200 when ADMIN accesses any tournament', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tournamentId).toBe(tournamentId);
      expect(data.tables).toHaveLength(2); // 2 tables
      expect(data.totalActivePlayers).toBe(2); // p1, p2 active
      expect(data.totalPlayers).toBe(3);
    });
  });

  describe('RBAC - TD role', () => {
    it('should return 200 when TD is the creator of the tournament', async () => {
      // TD_PLAYER is the creator (mockTournament.createdById)
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
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

    it('should return 200 when TD is assigned to the tournament', async () => {
      // Change creator to someone else
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        createdById: 'another-td-id',
      });

      // TD is assigned
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue({
        id: 'assignment-1',
        tournamentId,
        playerId: TEST_IDS.TD_PLAYER,
        assignedAt: new Date(),
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
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

    it('should return 403 when TD is neither creator nor assigned', async () => {
      // Change creator to someone else
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        ...mockTournament,
        createdById: 'another-td-id',
      });

      // TD is NOT assigned (default mock returns null)

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('Accès refusé');
    });
  });

  describe('Response format', () => {
    it('should return tables grouped by tableNumber with seats ordered', async () => {
      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Check structure
      expect(data).toHaveProperty('tournamentId');
      expect(data).toHaveProperty('tournamentName');
      expect(data).toHaveProperty('tournamentStatus');
      expect(data).toHaveProperty('tables');
      expect(data).toHaveProperty('totalTables');
      expect(data).toHaveProperty('totalActivePlayers');
      expect(data).toHaveProperty('totalPlayers');

      // Check table 1 has 2 seats
      const table1 = data.tables.find((t: { tableNumber: number }) => t.tableNumber === 1);
      expect(table1).toBeDefined();
      expect(table1.seats).toHaveLength(2);
      expect(table1.activeCount).toBe(2);

      // Check table 2 has 1 seat (eliminated player)
      const table2 = data.tables.find((t: { tableNumber: number }) => t.tableNumber === 2);
      expect(table2).toBeDefined();
      expect(table2.seats).toHaveLength(1);
      expect(table2.activeCount).toBe(0); // Player is eliminated
      expect(table2.seats[0].isEliminated).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should return 404 when tournament does not exist', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/tournaments/nonexistent/tables-plan`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

      expect(response.status).toBe(404);
    });

    it('should return empty tables array when no assignments exist', async () => {
      (mockPrisma.tableAssignment.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest(
        `http://localhost/api/tournaments/${tournamentId}/tables-plan`,
        {
          method: 'GET',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
        }
      );

      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tables).toHaveLength(0);
      expect(data.totalTables).toBe(0);
    });
  });
});
