/**
 * Tests for Tournament Director scoped permissions
 * Phase 7: RBAC - TD can only manage tournaments they created or are assigned to
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
      update: jest.fn(),
    },
    tournamentDirector: {
      findUnique: jest.fn(),
    },
    season: {
      findUnique: jest.fn(),
    },
    blindLevel: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    tournamentPlayer: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    elimination: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    rebuy: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    tableAssignment: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { PATCH } from '@/app/api/tournaments/[id]/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('TD Scoped Permissions', () => {
  // Two different TD player IDs
  const tdPlayer1Id = 'cm1111111111111111111111a'; // Creator/Owner
  const tdPlayer2Id = 'cm2222222222222222222222b'; // Not assigned

  const mockTournamentA = {
    id: 'cm0000000000000000000000t',
    name: 'Tournament A',
    seasonId: TEST_IDS.SEASON,
    date: new Date('2025-02-01'),
    buyInAmount: 10,
    startingChips: 5000,
    targetDuration: 180,
    status: 'PLANNED',
    createdById: tdPlayer1Id, // Created by TD1
    season: { id: TEST_IDS.SEASON, name: 'Saison Test', year: 2025 },
    _count: { tournamentPlayers: 0 },
  };

  const mockTournamentB = {
    id: 'cm0000000000000000000000u',
    name: 'Tournament B',
    seasonId: TEST_IDS.SEASON,
    date: new Date('2025-03-01'),
    buyInAmount: 10,
    startingChips: 5000,
    targetDuration: 180,
    status: 'PLANNED',
    createdById: tdPlayer1Id, // Created by TD1 (TD2 not assigned)
    season: { id: TEST_IDS.SEASON, name: 'Saison Test', year: 2025 },
    _count: { tournamentPlayers: 0 },
  };

  const tdPlayer1 = {
    id: tdPlayer1Id,
    firstName: 'TD',
    lastName: 'One',
    nickname: 'td_one',
    email: 'td1@test.com',
    avatar: null,
    role: 'TOURNAMENT_DIRECTOR',
    status: 'ACTIVE',
    roles: [],
  };

  const tdPlayer2 = {
    id: tdPlayer2Id,
    firstName: 'TD',
    lastName: 'Two',
    nickname: 'td_two',
    email: 'td2@test.com',
    avatar: null,
    role: 'TOURNAMENT_DIRECTOR',
    status: 'ACTIVE',
    roles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default player mock
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === tdPlayer1Id) return Promise.resolve(tdPlayer1);
        if (where.id === tdPlayer2Id) return Promise.resolve(tdPlayer2);
        if (where.id === TEST_IDS.ADMIN_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.admin, roles: [] });
        }
        return Promise.resolve(null);
      }
    );
  });

  describe('TD not assigned to tournament B', () => {
    it('should return 403 when TD2 tries to update tournament created by TD1', async () => {
      // TD2 is not the creator and not assigned
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournamentB);
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(
        `http://localhost/api/tournaments/${mockTournamentB.id}`,
        {
          method: 'PATCH',
          headers: {
            cookie: `player-id=${tdPlayer2Id}`,
          },
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: mockTournamentB.id }) });

      expect(response.status).toBe(403);
    });
  });

  describe('TD assigned to tournament A', () => {
    it('should return 200 when TD1 (creator) updates tournament A', async () => {
      // TD1 is the creator
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournamentA);
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.tournament.update as jest.Mock).mockResolvedValue({
        ...mockTournamentA,
        name: 'Updated Name',
      });
      (mockPrisma.season.findUnique as jest.Mock).mockResolvedValue({
        id: TEST_IDS.SEASON,
        name: 'Saison Test',
        year: 2025,
        endDate: new Date('2026-12-31'),
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${mockTournamentA.id}`,
        {
          method: 'PATCH',
          headers: {
            cookie: `player-id=${tdPlayer1Id}`,
          },
          body: JSON.stringify({ name: 'Updated Name' }),
        }
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: mockTournamentA.id }) });

      expect(response.status).toBe(200);
    });

    it('should return 200 when TD2 is assigned and updates tournament B', async () => {
      // TD2 is assigned to tournament B (not creator, but assigned)
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournamentB);
      // Mock the compound key lookup for tournamentDirector
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockImplementation(
        ({ where }: { where: { tournamentId_playerId?: { tournamentId: string; playerId: string } } }) => {
          if (where.tournamentId_playerId?.tournamentId === mockTournamentB.id &&
              where.tournamentId_playerId?.playerId === tdPlayer2Id) {
            return Promise.resolve({
              id: 'assignment-1',
              tournamentId: mockTournamentB.id,
              playerId: tdPlayer2Id,
              assignedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }
      );
      (mockPrisma.tournament.update as jest.Mock).mockResolvedValue({
        ...mockTournamentB,
        name: 'Updated by TD2',
      });
      (mockPrisma.season.findUnique as jest.Mock).mockResolvedValue({
        id: TEST_IDS.SEASON,
        name: 'Saison Test',
        year: 2025,
        endDate: new Date('2026-12-31'),
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${mockTournamentB.id}`,
        {
          method: 'PATCH',
          headers: {
            cookie: `player-id=${tdPlayer2Id}`,
          },
          body: JSON.stringify({ name: 'Updated by TD2' }),
        }
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: mockTournamentB.id }) });

      expect(response.status).toBe(200);
    });
  });

  describe('ADMIN bypass', () => {
    it('should return 200 when ADMIN updates any tournament', async () => {
      // ADMIN can update any tournament
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournamentA);
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.tournament.update as jest.Mock).mockResolvedValue({
        ...mockTournamentA,
        name: 'Updated by Admin',
      });
      (mockPrisma.season.findUnique as jest.Mock).mockResolvedValue({
        id: TEST_IDS.SEASON,
        name: 'Saison Test',
        year: 2025,
        endDate: new Date('2026-12-31'),
      });

      const request = new NextRequest(
        `http://localhost/api/tournaments/${mockTournamentA.id}`,
        {
          method: 'PATCH',
          headers: {
            cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
          },
          body: JSON.stringify({ name: 'Updated by Admin' }),
        }
      );

      const response = await PATCH(request, { params: Promise.resolve({ id: mockTournamentA.id }) });

      expect(response.status).toBe(200);
    });
  });
});
