/**
 * RBAC tests for /api/players endpoints
 * Ensures proper access control is enforced
 */

import { NextResponse } from 'next/server';
import { createAuthenticatedRequest, createMockRequest } from '@/test-utils/request';
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

// Import after mocks are set up
import { GET, POST } from '@/app/api/players/route';

describe('API /api/players RBAC', () => {
  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();
  });

  describe('GET /api/players', () => {
    it('should return players list for unauthenticated users (public)', async () => {
      const request = createMockRequest('/api/players');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should mask email for unauthenticated users', async () => {
      const request = createMockRequest('/api/players');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Emails should be undefined for non-authenticated users
      data.forEach((player: { email?: string }) => {
        expect(player.email).toBeUndefined();
      });
    });
  });

  describe('POST /api/players', () => {
    const validPlayerData = {
      firstName: 'New',
      lastName: 'Player',
      nickname: 'newbie',
      email: 'newbie@test.com',
    };

    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest('/api/players', {
        method: 'POST',
        body: validPlayerData,
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Non authentifié');
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        '/api/players',
        TEST_IDS.REGULAR_PLAYER,
        {
          method: 'POST',
          body: validPlayerData,
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Permission refusée');
    });

    it('should return 201 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        '/api/players',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: validPlayerData,
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.firstName).toBe('New');
      expect(data.lastName).toBe('Player');
    });

    it('should return 400 for invalid data', async () => {
      const request = createAuthenticatedRequest(
        '/api/players',
        TEST_IDS.ADMIN_PLAYER,
        {
          method: 'POST',
          body: {
            // Missing required fields
            firstName: '',
          },
        }
      );

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation error');
    });
  });
});
