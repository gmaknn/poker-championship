/**
 * RBAC tests for /api/tournaments/[id]/blinds endpoint
 * Tests: GET blinds (public), POST create/update blinds, DELETE blinds
 */

import { createAuthenticatedRequest, createMockRequest } from '@/test-utils/request';
import { TEST_IDS, MOCK_SEASON } from '@/test-utils/mocks';
import { resetMockPrisma, mockPrismaClient } from '@/test-utils/prisma';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Mock auth - returns null by default (not authenticated via NextAuth)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

// Mock tournament data
const MOCK_TOURNAMENT_BLINDS = {
  id: TEST_IDS.TOURNAMENT,
  name: 'Test Tournament',
  seasonId: TEST_IDS.SEASON,
  date: new Date('2025-01-15'),
  buyInAmount: 10,
  startingChips: 5000,
  targetDuration: 180,
  status: 'PLANNED',
  createdById: TEST_IDS.TD_PLAYER,
  season: MOCK_SEASON,
};

// Mock blind levels
const MOCK_BLIND_LEVELS = [
  { id: 'bl-1', tournamentId: TEST_IDS.TOURNAMENT, level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12, isBreak: false, rebalanceTables: false },
  { id: 'bl-2', tournamentId: TEST_IDS.TOURNAMENT, level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12, isBreak: false, rebalanceTables: false },
];

// Dynamic import after mocks
let blindsGET: typeof import('@/app/api/tournaments/[id]/blinds/route').GET;
let blindsPOST: typeof import('@/app/api/tournaments/[id]/blinds/route').POST;
let blindsDELETE: typeof import('@/app/api/tournaments/[id]/blinds/route').DELETE;

describe('API /api/tournaments/[id]/blinds RBAC', () => {
  beforeAll(async () => {
    const module = await import('@/app/api/tournaments/[id]/blinds/route');
    blindsGET = module.GET;
    blindsPOST = module.POST;
    blindsDELETE = module.DELETE;
  });

  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();

    // Setup tournament mock
    mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === TEST_IDS.TOURNAMENT) {
        return Promise.resolve({ ...MOCK_TOURNAMENT_BLINDS });
      }
      return Promise.resolve(null);
    });

    // Setup blind levels mock
    mockPrismaClient.blindLevel = {
      findMany: jest.fn().mockResolvedValue(MOCK_BLIND_LEVELS),
      deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    };

    // Setup transaction mock
    mockPrismaClient.$transaction = jest.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        blindLevel: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          createMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
        tournament: {
          update: jest.fn().mockResolvedValue({ ...MOCK_TOURNAMENT_BLINDS, rebuyEndLevel: null }),
        },
      };
      return fn(tx);
    });
  });

  const createParams = (id: string) => Promise.resolve({ id });

  describe('GET /api/tournaments/[id]/blinds', () => {
    it('should return blind levels for unauthenticated users (public)', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`);
      const response = await blindsGET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/tournaments/[id]/blinds', () => {
    const validBlindsData = {
      levels: [
        { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12 },
        { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12 },
      ],
    };

    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`, {
        method: 'POST',
        body: validBlindsData,
      });
      const response = await blindsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.REGULAR_PLAYER,
        {
          method: 'POST',
          body: validBlindsData,
        }
      );
      const response = await blindsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 201 for tournament creator (TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validBlindsData,
        }
      );
      const response = await blindsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(201);
    });

    it('should return 201 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validBlindsData,
        }
      );
      const response = await blindsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(201);
    });

    it('should return 404 for non-existent tournament', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/non-existent/blinds',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validBlindsData,
        }
      );
      const response = await blindsPOST(request, { params: createParams('non-existent') });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid payload (Zod validation)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: {
            levels: [], // Empty array should fail min(1) validation
          },
        }
      );
      const response = await blindsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 400 for invalid level data', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: {
            levels: [
              { level: -1, smallBlind: 25, bigBlind: 50 }, // Negative level
            ],
          },
        }
      );
      const response = await blindsPOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/tournaments/[id]/blinds', () => {
    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`, {
        method: 'DELETE',
      });
      const response = await blindsDELETE(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.REGULAR_PLAYER,
        { method: 'DELETE' }
      );
      const response = await blindsDELETE(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
    });

    it('should return 200 for tournament creator (TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.TD_PLAYER,
        { method: 'DELETE' }
      );
      const response = await blindsDELETE(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 200 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/blinds`,
        TEST_IDS.ADMIN_PLAYER,
        { method: 'DELETE' }
      );
      const response = await blindsDELETE(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent tournament', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/non-existent/blinds',
        TEST_IDS.ADMIN_PLAYER,
        { method: 'DELETE' }
      );
      const response = await blindsDELETE(request, { params: createParams('non-existent') });

      expect(response.status).toBe(404);
    });
  });
});
