/**
 * Auth Contract Sentinel Tests
 *
 * These tests verify that the authentication and authorization helpers
 * behave as expected. They serve as guardrails to detect any auth regression
 * during NextAuth upgrades.
 *
 * Contract:
 * - Unauthenticated requests → 401 or redirect
 * - Authenticated with insufficient role → 403
 * - Authenticated with correct role → 200 (access granted)
 */

import { NextRequest } from 'next/server';
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

// Import after mocks
import {
  getCurrentPlayer,
  getCurrentPlayerRole,
  isAuthenticated,
  hasRole,
  isAdmin,
  isTournamentDirectorOrAdmin,
  requirePermission,
  requireTournamentPermission,
} from '@/lib/auth-helpers';
import { PlayerRole } from '@prisma/client';

describe('Auth Contract Tests', () => {
  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();
  });

  describe('getCurrentPlayer', () => {
    it('should return null for unauthenticated request (no header, no cookie)', async () => {
      const request = createMockRequest('/api/test');
      const player = await getCurrentPlayer(request);

      expect(player).toBeNull();
    });

    it('should return player for authenticated request (x-player-id header)', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
      const player = await getCurrentPlayer(request);

      expect(player).not.toBeNull();
      expect(player?.id).toBe(TEST_IDS.REGULAR_PLAYER);
      expect(player?.role).toBe(PlayerRole.PLAYER);
    });

    it('should return player for ADMIN role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
      const player = await getCurrentPlayer(request);

      expect(player).not.toBeNull();
      expect(player?.id).toBe(TEST_IDS.ADMIN_PLAYER);
      expect(player?.role).toBe(PlayerRole.ADMIN);
    });

    it('should return player for TOURNAMENT_DIRECTOR role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.TD_PLAYER);
      const player = await getCurrentPlayer(request);

      expect(player).not.toBeNull();
      expect(player?.id).toBe(TEST_IDS.TD_PLAYER);
      expect(player?.role).toBe(PlayerRole.TOURNAMENT_DIRECTOR);
    });

    it('should return null for non-existent player ID', async () => {
      const request = createAuthenticatedRequest('/api/test', 'non-existent-player-id');
      const player = await getCurrentPlayer(request);

      expect(player).toBeNull();
    });
  });

  describe('getCurrentPlayerRole', () => {
    it('should return null for unauthenticated request', async () => {
      const request = createMockRequest('/api/test');
      const role = await getCurrentPlayerRole(request);

      expect(role).toBeNull();
    });

    it('should return ADMIN role for admin user', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
      const role = await getCurrentPlayerRole(request);

      expect(role).toBe(PlayerRole.ADMIN);
    });

    it('should return PLAYER role for regular user', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
      const role = await getCurrentPlayerRole(request);

      expect(role).toBe(PlayerRole.PLAYER);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false for unauthenticated request', async () => {
      const request = createMockRequest('/api/test');
      const authenticated = await isAuthenticated(request);

      expect(authenticated).toBe(false);
    });

    it('should return true for authenticated request with active status', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
      const authenticated = await isAuthenticated(request);

      expect(authenticated).toBe(true);
    });

    it('should return false for inactive player', async () => {
      // Create a mock inactive player
      const inactivePlayerId = 'inactive-player-test';
      mockPrismaClient.player.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === inactivePlayerId) {
          return Promise.resolve({
            ...MOCK_PLAYERS.player,
            id: inactivePlayerId,
            status: 'INACTIVE',
          });
        }
        // Default behavior for other IDs
        if (where.id === TEST_IDS.ADMIN_PLAYER) return Promise.resolve(MOCK_PLAYERS.admin);
        if (where.id === TEST_IDS.TD_PLAYER) return Promise.resolve(MOCK_PLAYERS.tournamentDirector);
        if (where.id === TEST_IDS.REGULAR_PLAYER) return Promise.resolve(MOCK_PLAYERS.player);
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest('/api/test', inactivePlayerId);
      const authenticated = await isAuthenticated(request);

      expect(authenticated).toBe(false);
    });
  });

  describe('hasRole', () => {
    it('should return true when player has the specified role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
      const hasAdminRole = await hasRole(request, PlayerRole.ADMIN);

      expect(hasAdminRole).toBe(true);
    });

    it('should return false when player does not have the specified role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
      const hasAdminRole = await hasRole(request, PlayerRole.ADMIN);

      expect(hasAdminRole).toBe(false);
    });

    it('should return false for unauthenticated request', async () => {
      const request = createMockRequest('/api/test');
      const hasAdminRole = await hasRole(request, PlayerRole.ADMIN);

      expect(hasAdminRole).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
      const admin = await isAdmin(request);

      expect(admin).toBe(true);
    });

    it('should return false for TOURNAMENT_DIRECTOR role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.TD_PLAYER);
      const admin = await isAdmin(request);

      expect(admin).toBe(false);
    });

    it('should return false for PLAYER role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
      const admin = await isAdmin(request);

      expect(admin).toBe(false);
    });
  });

  describe('isTournamentDirectorOrAdmin', () => {
    it('should return true for ADMIN role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
      const isTdOrAdmin = await isTournamentDirectorOrAdmin(request);

      expect(isTdOrAdmin).toBe(true);
    });

    it('should return true for TOURNAMENT_DIRECTOR role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.TD_PLAYER);
      const isTdOrAdmin = await isTournamentDirectorOrAdmin(request);

      expect(isTdOrAdmin).toBe(true);
    });

    it('should return false for PLAYER role', async () => {
      const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
      const isTdOrAdmin = await isTournamentDirectorOrAdmin(request);

      expect(isTdOrAdmin).toBe(false);
    });
  });

  describe('requirePermission (RBAC Guard)', () => {
    describe('Authentication Contract', () => {
      it('should return 401 for unauthenticated request', async () => {
        const request = createMockRequest('/api/test');
        const result = await requirePermission(request);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(401);
          expect(result.error).toContain('authentifié');
        }
      });

      it('should return success for authenticated request without permission check', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
        const result = await requirePermission(request);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.player.id).toBe(TEST_IDS.REGULAR_PLAYER);
        }
      });
    });

    describe('Authorization Contract', () => {
      it('should return 403 when player lacks required permission', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
        const result = await requirePermission(request, 'edit_player');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(403);
          expect(result.error).toContain('Permission');
        }
      });

      it('should return success for ADMIN (bypass)', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
        const result = await requirePermission(request, 'edit_player');

        expect(result.success).toBe(true);
      });

      it('should return 403 for inactive account', async () => {
        const inactivePlayerId = 'inactive-player-perm-test';
        mockPrismaClient.player.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === inactivePlayerId) {
            return Promise.resolve({
              ...MOCK_PLAYERS.admin,
              id: inactivePlayerId,
              status: 'INACTIVE',
            });
          }
          if (where.id === TEST_IDS.ADMIN_PLAYER) return Promise.resolve(MOCK_PLAYERS.admin);
          if (where.id === TEST_IDS.TD_PLAYER) return Promise.resolve(MOCK_PLAYERS.tournamentDirector);
          if (where.id === TEST_IDS.REGULAR_PLAYER) return Promise.resolve(MOCK_PLAYERS.player);
          return Promise.resolve(null);
        });

        const request = createAuthenticatedRequest('/api/test', inactivePlayerId);
        const result = await requirePermission(request, 'edit_player');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(403);
          expect(result.error).toContain('inactif');
        }
      });
    });
  });

  describe('requireTournamentPermission', () => {
    const tournamentCreatorId = TEST_IDS.TD_PLAYER;

    describe('Manage action', () => {
      it('should return 401 for unauthenticated request', async () => {
        const request = createMockRequest('/api/test');
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'manage');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(401);
        }
      });

      it('should return 403 for PLAYER role', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'manage');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(403);
        }
      });

      it('should return success for tournament creator (TD)', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.TD_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'manage');

        expect(result.success).toBe(true);
      });

      it('should return 403 for different TD (not creator)', async () => {
        // Create another TD
        const otherTdId = 'other-td-player-test';
        mockPrismaClient.player.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === otherTdId) {
            return Promise.resolve({
              ...MOCK_PLAYERS.tournamentDirector,
              id: otherTdId,
            });
          }
          if (where.id === TEST_IDS.ADMIN_PLAYER) return Promise.resolve(MOCK_PLAYERS.admin);
          if (where.id === TEST_IDS.TD_PLAYER) return Promise.resolve(MOCK_PLAYERS.tournamentDirector);
          if (where.id === TEST_IDS.REGULAR_PLAYER) return Promise.resolve(MOCK_PLAYERS.player);
          return Promise.resolve(null);
        });

        const request = createAuthenticatedRequest('/api/test', otherTdId);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'manage');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(403);
        }
      });

      it('should return success for ADMIN (bypass)', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'manage');

        expect(result.success).toBe(true);
      });
    });

    describe('Edit action', () => {
      it('should return 403 for PLAYER role', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'edit');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(403);
        }
      });

      it('should return success for tournament creator (TD)', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.TD_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'edit');

        expect(result.success).toBe(true);
      });

      it('should return success for ADMIN', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'edit');

        expect(result.success).toBe(true);
      });
    });

    describe('Delete action', () => {
      it('should return 403 for PLAYER role', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.REGULAR_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'delete');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.status).toBe(403);
        }
      });

      it('should return success for tournament creator (TD)', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.TD_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'delete');

        expect(result.success).toBe(true);
      });

      it('should return success for ADMIN', async () => {
        const request = createAuthenticatedRequest('/api/test', TEST_IDS.ADMIN_PLAYER);
        const result = await requireTournamentPermission(request, tournamentCreatorId, 'delete');

        expect(result.success).toBe(true);
      });
    });
  });
});

describe('Auth Contract Sentinel: Core Behaviors', () => {
  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();
  });

  it('SENTINEL: Unauthenticated → 401', async () => {
    const request = createMockRequest('/api/protected');
    const result = await requirePermission(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(401);
    }
  });

  it('SENTINEL: PLAYER without permission → 403', async () => {
    const request = createAuthenticatedRequest('/api/admin', TEST_IDS.REGULAR_PLAYER);
    const result = await requirePermission(request, 'edit_player');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(403);
    }
  });

  it('SENTINEL: ADMIN → Access granted (bypass)', async () => {
    const request = createAuthenticatedRequest('/api/admin', TEST_IDS.ADMIN_PLAYER);
    const result = await requirePermission(request, 'any_permission');

    expect(result.success).toBe(true);
  });

  it('SENTINEL: TD on own tournament → Access granted', async () => {
    const request = createAuthenticatedRequest('/api/tournament', TEST_IDS.TD_PLAYER);
    const result = await requireTournamentPermission(request, TEST_IDS.TD_PLAYER, 'manage');

    expect(result.success).toBe(true);
  });

  it('SENTINEL: TD on other tournament → 403', async () => {
    const otherCreatorId = 'other-td-creator';
    const request = createAuthenticatedRequest('/api/tournament', TEST_IDS.TD_PLAYER);
    const result = await requireTournamentPermission(request, otherCreatorId, 'manage');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.status).toBe(403);
    }
  });
});
