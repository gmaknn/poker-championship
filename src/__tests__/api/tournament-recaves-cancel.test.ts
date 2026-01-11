/**
 * Tests for DELETE /api/tournaments/[id]/recaves/last endpoint
 * Tests: Cancel last rebuy functionality
 */

import { NextRequest } from 'next/server';
import { TEST_IDS, MOCK_SEASON, MOCK_PLAYERS } from '@/test-utils/mocks';

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
      findMany: jest.fn(),
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

import { DELETE } from '@/app/api/tournaments/[id]/recaves/last/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('DELETE /api/tournaments/[id]/recaves/last', () => {
  const tournamentId = TEST_IDS.TOURNAMENT;
  const playerId = 'clx0000000000000000000001';

  const mockTournament = {
    id: tournamentId,
    name: 'Test Tournament',
    status: 'IN_PROGRESS',
    currentLevel: 3,
    rebuyEndLevel: 6,
    createdById: TEST_IDS.TD_PLAYER,
    season: {
      ...MOCK_SEASON,
      freeRebuysCount: 2,
      rebuyPenaltyTier1: -50,
      rebuyPenaltyTier2: -100,
      rebuyPenaltyTier3: -150,
    },
  };

  const mockPlayerWithRebuy = {
    id: 'tp-1',
    tournamentId,
    playerId,
    finalRank: null,
    rebuysCount: 2,
    lightRebuyUsed: false,
    penaltyPoints: 0,
    updatedAt: new Date(),
    player: { id: playerId, firstName: 'Test', lastName: 'Player', nickname: 'testplayer' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup player mock for TD
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === TEST_IDS.TD_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.tournamentDirector, roles: [] });
        }
        return Promise.resolve(null);
      }
    );

    // Setup tournament mock
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
    (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('should return 400 when no rebuy to cancel', async () => {
    // No players with rebuys
    (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/recaves/last`,
      {
        method: 'DELETE',
        headers: {
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Aucune recave à annuler');
  });

  it('should successfully cancel last rebuy', async () => {
    // Player with rebuys
    (mockPrisma.tournamentPlayer.findMany as jest.Mock).mockResolvedValue([mockPlayerWithRebuy]);

    // Mock transaction
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const txMock = {
        tournamentPlayer: {
          findUnique: jest.fn().mockResolvedValue(mockPlayerWithRebuy),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };

      // Simulate the updated player after transaction
      txMock.tournamentPlayer.findUnique
        .mockResolvedValueOnce(mockPlayerWithRebuy) // First call in transaction
        .mockResolvedValueOnce({ // Second call after update
          ...mockPlayerWithRebuy,
          rebuysCount: 1,
          penaltyPoints: 0,
        });

      return callback(txMock);
    });

    const request = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/recaves/last`,
      {
        method: 'DELETE',
        headers: {
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('Recave annulée');
    expect(data.previousRebuysCount).toBe(2);
    expect(data.newRebuysCount).toBe(1);
  });

  it('should return 400 when tournament is finished', async () => {
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
      ...mockTournament,
      status: 'FINISHED',
    });

    const request = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/recaves/last`,
      {
        method: 'DELETE',
        headers: {
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Tournament is finished');
  });

  it('should return 400 when tournament is not in progress', async () => {
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
      ...mockTournament,
      status: 'PLANNED',
    });

    const request = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/recaves/last`,
      {
        method: 'DELETE',
        headers: {
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('Tournament is not in progress');
  });

  it('should return 404 when tournament not found', async () => {
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest(
      `http://localhost/api/tournaments/${tournamentId}/recaves/last`,
      {
        method: 'DELETE',
        headers: {
          cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
        },
      }
    );

    const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('Tournament not found');
  });
});
