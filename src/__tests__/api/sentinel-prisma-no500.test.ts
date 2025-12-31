/**
 * Sentinel tests to ensure critical endpoints don't return 500 errors
 * These tests verify that handlers properly catch and handle exceptions
 */

import { createMockRequest, createAuthenticatedRequest } from '@/test-utils/request';
import { TEST_IDS, MOCK_PLAYERS } from '@/test-utils/mocks';
import { resetMockPrisma, mockPrismaClient } from '@/test-utils/prisma';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Mock auth - returns null by default (not authenticated via NextAuth)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

describe('Sentinel Tests - No 500 Errors', () => {
  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();
  });

  describe('GET /api/tournaments/[id]', () => {
    // Dynamically import the route handler
    let GET: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

    beforeAll(async () => {
      const module = await import('@/app/api/tournaments/[id]/route');
      GET = module.GET;
    });

    it('should return 404 for non-existent tournament (not 500)', async () => {
      // GET /api/tournaments/[id] requires authentication
      const request = createAuthenticatedRequest(
        '/api/tournaments/non-existent-id',
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });

      // Should be 404, definitely not 500
      expect(response.status).toBe(404);
      expect(response.status).not.toBe(500);

      const data = await response.json();
      expect(data.error).toContain('non trouvé');
    });

    it('should return 200 for existing tournament', async () => {
      // GET /api/tournaments/[id] requires authentication
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: TEST_IDS.TOURNAMENT }),
      });

      // Should be 200
      expect(response.status).toBe(200);
      expect(response.status).not.toBe(500);

      const data = await response.json();
      expect(data.id).toBe(TEST_IDS.TOURNAMENT);
    });

    it('should handle Prisma errors gracefully and return 500 with message', async () => {
      // Make prisma throw an error
      mockPrismaClient.tournament.findUnique.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      // GET /api/tournaments/[id] requires authentication
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: TEST_IDS.TOURNAMENT }),
      });

      // Should catch the error and return 500 with proper error message
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
    });
  });

  describe('GET /api/players/[id]/dashboard - error handling', () => {
    // Dynamically import the route handler
    let GET: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

    beforeAll(async () => {
      const module = await import('@/app/api/players/[id]/dashboard/route');
      GET = module.GET;
    });

    it('should return 404 for non-existent player (not 500)', async () => {
      const request = createMockRequest('/api/players/non-existent-id/dashboard');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'non-existent-id' }),
      });

      // Should be 404, definitely not 500
      expect(response.status).toBe(404);
      expect(response.status).not.toBe(500);

      const data = await response.json();
      expect(data.error).toContain('not found');
    });

    it('should handle Prisma errors gracefully and return 500 with message', async () => {
      // Make prisma throw an error on the first call
      mockPrismaClient.player.findUnique.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const request = createMockRequest(`/api/players/${TEST_IDS.REGULAR_PLAYER}/dashboard`);
      const response = await GET(request, {
        params: Promise.resolve({ id: TEST_IDS.REGULAR_PLAYER }),
      });

      // Should catch the error and return 500 with proper error message
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe('Mock infrastructure', () => {
    it('mockPrismaClient should be properly resettable', () => {
      resetMockPrisma();

      // After reset, findUnique should return the default mock data
      expect(mockPrismaClient.player.findUnique).toBeDefined();
      expect(typeof mockPrismaClient.player.findUnique).toBe('function');
    });

    it('mock data should be consistent', () => {
      expect(MOCK_PLAYERS.admin.role).toBe('ADMIN');
      expect(MOCK_PLAYERS.player.role).toBe('PLAYER');
      expect(MOCK_PLAYERS.tournamentDirector.role).toBe('TOURNAMENT_DIRECTOR');
    });
  });
});
