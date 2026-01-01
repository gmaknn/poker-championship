/**
 * Tests for Multi-Role Union permissions
 * Phase 7: RBAC - A player with PLAYER role + TD additional role should have TD permissions
 */

import { NextRequest } from 'next/server';
import { MOCK_PLAYERS, TEST_IDS, MOCK_SEASON } from '@/test-utils/mocks';

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
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    season: {
      findUnique: jest.fn(),
    },
    tournamentDirector: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { POST } from '@/app/api/tournaments/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Multi-Role Union Permissions', () => {
  // Player with primary role PLAYER but additional role TOURNAMENT_DIRECTOR
  const multiRolePlayerId = 'cm3333333333333333333333c';

  const multiRolePlayer = {
    id: multiRolePlayerId,
    firstName: 'Multi',
    lastName: 'Role',
    nickname: 'multi_role',
    email: 'multi@test.com',
    avatar: null,
    role: 'PLAYER', // Primary role is PLAYER
    status: 'ACTIVE',
    roles: [
      { role: 'TOURNAMENT_DIRECTOR' }, // Additional role is TD
    ],
  };

  const validTournamentData = {
    name: 'New Tournament',
    seasonId: TEST_IDS.SEASON,
    date: '2025-02-01T18:00:00.000Z',
    buyInAmount: 10,
    startingChips: 5000,
    targetDuration: 180,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default player mock
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === multiRolePlayerId) return Promise.resolve(multiRolePlayer);
        if (where.id === TEST_IDS.REGULAR_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.player, roles: [] });
        }
        if (where.id === TEST_IDS.TD_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.tournamentDirector, roles: [] });
        }
        return Promise.resolve(null);
      }
    );

    // Season mock
    (mockPrisma.season.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_SEASON,
      endDate: new Date('2026-12-31'),
    });
  });

  describe('PLAYER with additional TD role', () => {
    it('should allow PLAYER+TD to create tournament (union of permissions)', async () => {
      // Player has primary role PLAYER but additional role TD
      // Should be able to create tournaments (TD permission)
      (mockPrisma.tournament.create as jest.Mock).mockResolvedValue({
        id: 'new-tournament-id',
        ...validTournamentData,
        status: 'PLANNED',
        createdById: multiRolePlayerId,
      });

      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          cookie: `player-id=${multiRolePlayerId}`,
        },
        body: JSON.stringify(validTournamentData),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('New Tournament');
    });

    it('should reject pure PLAYER without additional roles from creating tournament', async () => {
      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
        },
        body: JSON.stringify(validTournamentData),
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Primary TD role', () => {
    it('should allow TD (primary role) to create tournament', async () => {
      (mockPrisma.tournament.create as jest.Mock).mockResolvedValue({
        id: 'new-tournament-id',
        ...validTournamentData,
        status: 'PLANNED',
        createdById: TEST_IDS.TD_PLAYER,
      });

      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
        body: JSON.stringify(validTournamentData),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('isAdmin with additional role', () => {
    it('should grant admin bypass when ADMIN is in additionalRoles', async () => {
      // Player with PLAYER primary role but ADMIN additional role
      const adminAdditionalPlayer = {
        id: 'cm4444444444444444444444d',
        firstName: 'Admin',
        lastName: 'Additional',
        nickname: 'admin_additional',
        email: 'admin_add@test.com',
        avatar: null,
        role: 'PLAYER', // Primary role is PLAYER
        status: 'ACTIVE',
        roles: [
          { role: 'ADMIN' }, // Additional role is ADMIN
        ],
      };

      (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
        ({ where }: { where: { id?: string } }) => {
          if (where.id === adminAdditionalPlayer.id) return Promise.resolve(adminAdditionalPlayer);
          return Promise.resolve(null);
        }
      );

      (mockPrisma.tournament.create as jest.Mock).mockResolvedValue({
        id: 'new-tournament-id',
        ...validTournamentData,
        status: 'PLANNED',
        createdById: adminAdditionalPlayer.id,
      });

      const request = new NextRequest('http://localhost/api/tournaments', {
        method: 'POST',
        headers: {
          cookie: `player-id=${adminAdditionalPlayer.id}`,
        },
        body: JSON.stringify(validTournamentData),
      });

      const response = await POST(request);

      // Should pass - ADMIN additional role grants full access
      expect(response.status).toBe(201);
    });
  });
});
