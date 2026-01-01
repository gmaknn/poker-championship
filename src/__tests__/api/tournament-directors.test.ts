/**
 * Tests for /api/tournaments/[id]/directors
 * Phase 7: RBAC multi-role + TD assignment
 */

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/tournaments/[id]/directors/route';
import { MOCK_PLAYERS, TEST_IDS } from '@/test-utils/mocks';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    tournament: {
      findUnique: jest.fn(),
    },
    tournamentDirector: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

// Mock auth-helpers
jest.mock('@/lib/auth-helpers', () => ({
  requirePermission: jest.fn(),
  getTournamentDirectors: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { requirePermission, getTournamentDirectors } from '@/lib/auth-helpers';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRequirePermission = requirePermission as jest.MockedFunction<typeof requirePermission>;
const mockGetTournamentDirectors = getTournamentDirectors as jest.MockedFunction<typeof getTournamentDirectors>;

describe('Tournament Directors API', () => {
  const tournamentId = TEST_IDS.TOURNAMENT;

  const mockTournament = {
    id: tournamentId,
    name: 'Test Tournament',
    createdById: TEST_IDS.TD_PLAYER,
    status: 'PLANNED',
    createdBy: {
      id: TEST_IDS.TD_PLAYER,
      firstName: 'Tournament',
      lastName: 'Director',
      nickname: 'td_user',
    },
  };

  // Use valid CUID format for playerId in delete tests
  const validCuidPlayerId = 'cm9876543210zyxwvutsrqpon';

  const mockDirector = {
    id: 'director-1',
    tournamentId,
    playerId: validCuidPlayerId,
    assignedAt: new Date(),
    assignedById: TEST_IDS.ADMIN_PLAYER,
    player: {
      id: validCuidPlayerId,
      firstName: 'Tournament',
      lastName: 'Director',
      nickname: 'td_user',
      avatar: null,
    },
  };

  const mockAvailableTD = {
    id: 'cm1234567890abcdefghijklm', // Valid CUID format
    firstName: 'Available',
    lastName: 'Director',
    nickname: 'available_td',
    role: 'TOURNAMENT_DIRECTOR',
    status: 'ACTIVE',
    roles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default player mock
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
        if (where.id === mockAvailableTD.id) {
          return Promise.resolve(mockAvailableTD);
        }
        return Promise.resolve(null);
      }
    );
  });

  describe('GET /api/tournaments/[id]/directors', () => {
    it('should return 404 if tournament not found', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/tournaments/not-found/directors');
      const response = await GET(request, { params: Promise.resolve({ id: 'not-found' }) });

      expect(response.status).toBe(404);
    });

    it('should return directors list for existing tournament', async () => {
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
      mockGetTournamentDirectors.mockResolvedValue([mockDirector] as any);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`);
      const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.directors).toHaveLength(1);
      expect(data.createdBy).toBeDefined();
    });
  });

  describe('POST /api/tournaments/[id]/directors', () => {
    it('should return 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
        status: 401,
      } as any);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'POST',
        body: JSON.stringify({ playerId: mockAvailableTD.id }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for PLAYER role', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        error: 'Forbidden',
        status: 403,
      } as any);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'POST',
        body: JSON.stringify({ playerId: mockAvailableTD.id }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
    });

    it('should return 403 for TOURNAMENT_DIRECTOR role (not admin)', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        error: 'Forbidden',
        status: 403,
      } as any);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'POST',
        body: JSON.stringify({ playerId: mockAvailableTD.id }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
    });

    it('should return 201 for ADMIN adding a director', async () => {
      mockRequirePermission.mockResolvedValue({
        success: true,
        player: { ...MOCK_PLAYERS.admin, additionalRoles: [] },
      } as any);
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.tournamentDirector.create as jest.Mock).mockResolvedValue({
        ...mockDirector,
        playerId: mockAvailableTD.id,
        player: mockAvailableTD,
      });

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'POST',
        body: JSON.stringify({ playerId: mockAvailableTD.id }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(201);
    });

    it('should return 409 if director already assigned', async () => {
      mockRequirePermission.mockResolvedValue({
        success: true,
        player: { ...MOCK_PLAYERS.admin, additionalRoles: [] },
      } as any);
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(mockDirector);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'POST',
        body: JSON.stringify({ playerId: mockAvailableTD.id }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/tournaments/[id]/directors', () => {
    it('should return 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
        status: 401,
      } as any);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'DELETE',
        body: JSON.stringify({ playerId: validCuidPlayerId }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-ADMIN', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        error: 'Forbidden',
        status: 403,
      } as any);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'DELETE',
        body: JSON.stringify({ playerId: validCuidPlayerId }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(403);
    });

    it('should return 200 for ADMIN removing a director', async () => {
      mockRequirePermission.mockResolvedValue({
        success: true,
        player: { ...MOCK_PLAYERS.admin, additionalRoles: [] },
      } as any);
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(mockDirector);
      (mockPrisma.tournamentDirector.delete as jest.Mock).mockResolvedValue(mockDirector);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'DELETE',
        body: JSON.stringify({ playerId: validCuidPlayerId }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 404 if director not found', async () => {
      mockRequirePermission.mockResolvedValue({
        success: true,
        player: { ...MOCK_PLAYERS.admin, additionalRoles: [] },
      } as any);
      (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(mockTournament);
      (mockPrisma.tournamentDirector.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/directors`, {
        method: 'DELETE',
        body: JSON.stringify({ playerId: validCuidPlayerId }),
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: tournamentId }) });

      expect(response.status).toBe(404);
    });
  });
});
