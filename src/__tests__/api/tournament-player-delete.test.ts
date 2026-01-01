/**
 * Tests for DELETE /api/tournaments/[id]/players/[playerId]
 * FINISHED guard enforcement
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
    tournamentPlayer: {
      findUnique: jest.fn(),
      delete: jest.fn(),
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

import { DELETE } from '@/app/api/tournaments/[id]/players/[playerId]/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('DELETE /api/tournaments/[id]/players/[playerId] - FINISHED Guard', () => {
  const tournamentId = TEST_IDS.TOURNAMENT;
  const playerId = 'clx0000000000000000000001';

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: authenticated as TD (owner)
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === TEST_IDS.TD_PLAYER) {
          return Promise.resolve(MOCK_PLAYERS.tournamentDirector);
        }
        return Promise.resolve(null);
      }
    );

    // Default: player enrollment exists
    (mockPrisma.tournamentPlayer.findUnique as jest.Mock).mockResolvedValue({
      tournamentId,
      playerId,
    });
  });

  it('should return 400 when deleting a player from a FINISHED tournament', async () => {
    // Setup: tournament is FINISHED
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
      id: tournamentId,
      status: 'FINISHED',
      createdById: TEST_IDS.TD_PLAYER,
    });

    const request = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/players/${playerId}`,
      {
        method: 'DELETE',
        headers: {
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
      }
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: tournamentId, playerId }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Tournament is finished');
  });
});
