/**
 * Tests for GET/PUT /api/tournaments/[id]/prize-pool
 * RBAC enforcement and validation rules
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
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { GET, PUT } from '@/app/api/tournaments/[id]/prize-pool/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Tournament Prize Pool API', () => {
  const tournamentId = TEST_IDS.TOURNAMENT;

  const mockTournament = {
    id: tournamentId,
    name: 'Test Tournament',
    buyInAmount: 10,
    lightRebuyAmount: 5,
    prizePool: null,
    prizePayoutCount: null,
    prizePayoutPercents: null,
    prizePayoutUpdatedAt: null,
    createdById: TEST_IDS.TD_PLAYER,
    tournamentPlayers: [
      { hasPaid: true, rebuysCount: 1, lightRebuyUsed: false },
      { hasPaid: true, rebuysCount: 0, lightRebuyUsed: true },
      { hasPaid: true, rebuysCount: 0, lightRebuyUsed: false },
      { hasPaid: false, rebuysCount: 0, lightRebuyUsed: false },
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

    // Default TD assignment mock (not assigned by default)
    (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);

    // Default update mock
    (mockPrisma.tournament.update as jest.Mock).mockResolvedValue({
      id: tournamentId,
      prizePayoutCount: 3,
      prizePayoutPercents: [50, 30, 20],
      prizePayoutUpdatedAt: new Date(),
    });
  });

  describe('GET /api/tournaments/[id]/prize-pool', () => {
    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
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
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(403);
        const data = await response.json();
        expect(data.error).toContain('refusée');
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
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.TD_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(403);
      });
    });

    describe('RBAC - TD assigned', () => {
      it('should return 200 when TD is assigned to the tournament', async () => {
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
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.TD_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
      });

      it('should return 200 when TD is the creator', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.TD_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
      });
    });

    describe('RBAC - ADMIN', () => {
      it('should return 200 when ADMIN accesses any tournament', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
      });
    });

    describe('Response format', () => {
      it('should return calculated prize pool with breakdown', async () => {
        // Configure with payout percents
        (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
          ...mockTournament,
          prizePayoutCount: 3,
          prizePayoutPercents: [50, 30, 20],
        });

        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
        const data = await response.json();

        expect(data).toHaveProperty('tournamentId');
        expect(data).toHaveProperty('totalPrizePool');
        expect(data).toHaveProperty('breakdown');
        expect(data).toHaveProperty('percents');

        // 3 paid players * 10€ + 1 rebuy * 10€ + 1 light rebuy * 5€ = 45€
        expect(data.totalBuyIns).toBe(30); // 3 * 10
        expect(data.totalRebuys).toBe(10); // 1 * 10
        expect(data.totalLightRebuys).toBe(5); // 1 * 5
        expect(data.calculatedPrizePool).toBe(45);

        expect(data.breakdown).toHaveLength(3);
        expect(data.breakdown[0].rank).toBe(1);
        expect(data.breakdown[0].percent).toBe(50);
        expect(data.breakdown[0].amount).toBe(22.5); // 45 * 0.5
      });
    });

    describe('Edge cases', () => {
      it('should return 404 when tournament does not exist', async () => {
        (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest(
          `http://localhost/api/tournaments/nonexistent/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });

        expect(response.status).toBe(404);
      });

      it('should return empty breakdown when no payout configured', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'GET',
            headers: { cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}` },
          }
        );

        const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.breakdown).toHaveLength(0);
      });
    });
  });

  describe('PUT /api/tournaments/[id]/prize-pool', () => {
    const validPayload = {
      payoutCount: 3,
      percents: [50, 30, 20],
    };

    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validPayload),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(401);
      });
    });

    describe('RBAC', () => {
      it('should return 403 when PLAYER tries to update', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
            },
            body: JSON.stringify(validPayload),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(403);
      });

      it('should return 200 when TD creator updates', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.TD_PLAYER}`,
            },
            body: JSON.stringify(validPayload),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
      });

      it('should return 200 when ADMIN updates', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
            },
            body: JSON.stringify(validPayload),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
      });
    });

    describe('Validation - Sum not 100', () => {
      it('should return 400 when percents sum is not 100', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
            },
            body: JSON.stringify({
              payoutCount: 3,
              percents: [50, 30, 10], // Sum = 90, not 100
            }),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toContain('invalides');
      });
    });

    describe('Validation - Count mismatch', () => {
      it('should return 400 when payoutCount does not match percents length', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
            },
            body: JSON.stringify({
              payoutCount: 3,
              percents: [60, 40], // Only 2 percents but count is 3
            }),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(400);
      });
    });

    describe('Validation - Negative or zero percent', () => {
      it('should return 400 when a percent is not positive', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
            },
            body: JSON.stringify({
              payoutCount: 3,
              percents: [60, 40, 0], // 0 is not positive
            }),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(400);
      });
    });

    describe('Validation - payoutCount < 1', () => {
      it('should return 400 when payoutCount is less than 1', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
            },
            body: JSON.stringify({
              payoutCount: 0,
              percents: [],
            }),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(400);
      });
    });

    describe('Success case', () => {
      it('should update prize pool and return success', async () => {
        const request = new NextRequest(
          `http://localhost/api/tournaments/${tournamentId}/prize-pool`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
            },
            body: JSON.stringify(validPayload),
          }
        );

        const response = await PUT(request, { params: Promise.resolve({ id: tournamentId }) });

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.payoutCount).toBe(3);
        expect(data.percents).toEqual([50, 30, 20]);

        expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
          where: { id: tournamentId },
          data: {
            prizePayoutCount: 3,
            prizePayoutPercents: [50, 30, 20],
            prizePayoutUpdatedAt: expect.any(Date),
          },
          select: expect.any(Object),
        });
      });
    });
  });
});
