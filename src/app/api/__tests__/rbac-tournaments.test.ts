/**
 * RBAC tests for /api/tournaments endpoints
 * Ensures proper access control for tournament management
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

// Import after mocks are set up
import { GET, POST } from '../tournaments/route';

describe('API /api/tournaments RBAC', () => {
  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();
  });

  describe('GET /api/tournaments', () => {
    it('should return tournaments list for unauthenticated users', async () => {
      const request = createMockRequest('/api/tournaments');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter by seasonId when provided', async () => {
      const request = createMockRequest('/api/tournaments', {
        searchParams: { seasonId: TEST_IDS.SEASON },
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/tournaments', () => {
    const validTournamentData = {
      name: 'New Tournament',
      seasonId: TEST_IDS.SEASON,
      date: '2025-02-01T18:00:00.000Z',
      buyInAmount: 10,
      startingChips: 5000,
      targetDuration: 180,
    };

    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest('/api/tournaments', {
        method: 'POST',
        body: validTournamentData,
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Non authentifié');
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments',
        TEST_IDS.REGULAR_PLAYER,
        {
          method: 'POST',
          body: validTournamentData,
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('permission');
    });

    it('should return 201 for TOURNAMENT_DIRECTOR role', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments',
        TEST_IDS.TD_PLAYER,
        {
          method: 'POST',
          body: validTournamentData,
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('New Tournament');
    });

    it('should return 201 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validTournamentData,
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it('should return 404 for non-existent season', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: {
            ...validTournamentData,
            seasonId: 'non-existent-season',
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Saison');
    });

    it('should return 400 for invalid data', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: {
            // Missing required fields
            name: '',
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });
});
