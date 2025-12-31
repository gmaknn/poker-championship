/**
 * Tests for RBAC permissions logic
 * Critical for security - ensures role-based access is correctly enforced
 */

import { PlayerRole } from '@prisma/client';
import {
  hasPermission,
  canViewAllTournaments,
  canCreateTournament,
  canEditTournament,
  canDeleteTournament,
  canManagePlayers,
  canManageSeasons,
  isAdmin,
  isTournamentDirectorOrAbove,
  getRolePermissions,
  PERMISSIONS,
  ROLES,
} from '../permissions';

describe('permissions', () => {
  describe('hasPermission', () => {
    it('ADMIN should have all permissions (bypass)', () => {
      // Test a sample of permissions
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.CREATE_PLAYER)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.EDIT_ALL_TOURNAMENTS)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.DELETE_SEASON)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.MANAGE_PLAYER_ROLES)).toBe(true);
    });

    it('PLAYER should only have view permissions', () => {
      expect(hasPermission('PLAYER' as PlayerRole, PERMISSIONS.VIEW_LEADERBOARD)).toBe(true);
      expect(hasPermission('PLAYER' as PlayerRole, PERMISSIONS.VIEW_PLAYER_STATS)).toBe(true);
      expect(hasPermission('PLAYER' as PlayerRole, PERMISSIONS.CREATE_PLAYER)).toBe(false);
      expect(hasPermission('PLAYER' as PlayerRole, PERMISSIONS.CREATE_TOURNAMENT)).toBe(false);
    });

    it('TOURNAMENT_DIRECTOR should have tournament management permissions', () => {
      expect(hasPermission('TOURNAMENT_DIRECTOR' as PlayerRole, PERMISSIONS.CREATE_TOURNAMENT)).toBe(true);
      expect(hasPermission('TOURNAMENT_DIRECTOR' as PlayerRole, PERMISSIONS.EDIT_OWN_TOURNAMENT)).toBe(true);
      expect(hasPermission('TOURNAMENT_DIRECTOR' as PlayerRole, PERMISSIONS.MANAGE_ELIMINATIONS)).toBe(true);
      // But not all tournaments or player management
      expect(hasPermission('TOURNAMENT_DIRECTOR' as PlayerRole, PERMISSIONS.EDIT_ALL_TOURNAMENTS)).toBe(false);
      expect(hasPermission('TOURNAMENT_DIRECTOR' as PlayerRole, PERMISSIONS.CREATE_PLAYER)).toBe(false);
    });

    it('ANIMATOR should have communication permissions', () => {
      expect(hasPermission('ANIMATOR' as PlayerRole, PERMISSIONS.VIEW_COMMUNICATION_DASHBOARD)).toBe(true);
      expect(hasPermission('ANIMATOR' as PlayerRole, PERMISSIONS.CREATE_MESSAGE)).toBe(true);
      expect(hasPermission('ANIMATOR' as PlayerRole, PERMISSIONS.PUBLISH_TO_WHATSAPP)).toBe(true);
      // But not tournament creation
      expect(hasPermission('ANIMATOR' as PlayerRole, PERMISSIONS.CREATE_TOURNAMENT)).toBe(false);
    });
  });

  describe('canViewAllTournaments', () => {
    it('ADMIN can view all tournaments', () => {
      expect(canViewAllTournaments('ADMIN' as PlayerRole)).toBe(true);
    });

    it('ANIMATOR can view all tournaments', () => {
      expect(canViewAllTournaments('ANIMATOR' as PlayerRole)).toBe(true);
    });

    it('TOURNAMENT_DIRECTOR cannot view all tournaments (only own)', () => {
      expect(canViewAllTournaments('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(false);
    });

    it('PLAYER cannot view all tournaments', () => {
      expect(canViewAllTournaments('PLAYER' as PlayerRole)).toBe(false);
    });
  });

  describe('canCreateTournament', () => {
    it('ADMIN can create tournaments', () => {
      expect(canCreateTournament('ADMIN' as PlayerRole)).toBe(true);
    });

    it('TOURNAMENT_DIRECTOR can create tournaments', () => {
      expect(canCreateTournament('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(true);
    });

    it('PLAYER cannot create tournaments', () => {
      expect(canCreateTournament('PLAYER' as PlayerRole)).toBe(false);
    });

    it('ANIMATOR cannot create tournaments', () => {
      expect(canCreateTournament('ANIMATOR' as PlayerRole)).toBe(false);
    });
  });

  describe('canEditTournament (ownership logic)', () => {
    const ownerId = 'owner-123';
    const otherUserId = 'other-456';

    it('ADMIN can edit any tournament', () => {
      expect(canEditTournament('ADMIN' as PlayerRole, ownerId, otherUserId)).toBe(true);
      expect(canEditTournament('ADMIN' as PlayerRole, null, otherUserId)).toBe(true);
    });

    it('TOURNAMENT_DIRECTOR can edit own tournament', () => {
      expect(canEditTournament('TOURNAMENT_DIRECTOR' as PlayerRole, ownerId, ownerId)).toBe(true);
    });

    it('TOURNAMENT_DIRECTOR cannot edit other\'s tournament', () => {
      expect(canEditTournament('TOURNAMENT_DIRECTOR' as PlayerRole, ownerId, otherUserId)).toBe(false);
    });

    it('PLAYER cannot edit any tournament', () => {
      expect(canEditTournament('PLAYER' as PlayerRole, ownerId, ownerId)).toBe(false);
    });
  });

  describe('canDeleteTournament (ownership logic)', () => {
    const ownerId = 'owner-123';
    const otherUserId = 'other-456';

    it('ADMIN can delete any tournament', () => {
      expect(canDeleteTournament('ADMIN' as PlayerRole, ownerId, otherUserId)).toBe(true);
    });

    it('TOURNAMENT_DIRECTOR can delete own tournament', () => {
      expect(canDeleteTournament('TOURNAMENT_DIRECTOR' as PlayerRole, ownerId, ownerId)).toBe(true);
    });

    it('TOURNAMENT_DIRECTOR cannot delete other\'s tournament', () => {
      expect(canDeleteTournament('TOURNAMENT_DIRECTOR' as PlayerRole, ownerId, otherUserId)).toBe(false);
    });
  });

  describe('canManagePlayers', () => {
    it('ADMIN can manage players', () => {
      expect(canManagePlayers('ADMIN' as PlayerRole)).toBe(true);
    });

    it('PLAYER cannot manage players', () => {
      expect(canManagePlayers('PLAYER' as PlayerRole)).toBe(false);
    });

    it('TOURNAMENT_DIRECTOR cannot manage players', () => {
      expect(canManagePlayers('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(false);
    });
  });

  describe('canManageSeasons', () => {
    it('ADMIN can manage seasons', () => {
      expect(canManageSeasons('ADMIN' as PlayerRole)).toBe(true);
    });

    it('PLAYER cannot manage seasons', () => {
      expect(canManageSeasons('PLAYER' as PlayerRole)).toBe(false);
    });
  });

  describe('role helpers', () => {
    it('isAdmin correctly identifies ADMIN role', () => {
      expect(isAdmin('ADMIN' as PlayerRole)).toBe(true);
      expect(isAdmin('PLAYER' as PlayerRole)).toBe(false);
      expect(isAdmin('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(false);
    });

    it('isTournamentDirectorOrAbove works correctly', () => {
      expect(isTournamentDirectorOrAbove('ADMIN' as PlayerRole)).toBe(true);
      expect(isTournamentDirectorOrAbove('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(true);
      expect(isTournamentDirectorOrAbove('PLAYER' as PlayerRole)).toBe(false);
      expect(isTournamentDirectorOrAbove('ANIMATOR' as PlayerRole)).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('returns array of permissions for each role', () => {
      const adminPerms = getRolePermissions('ADMIN' as PlayerRole);
      const playerPerms = getRolePermissions('PLAYER' as PlayerRole);

      expect(Array.isArray(adminPerms)).toBe(true);
      expect(Array.isArray(playerPerms)).toBe(true);
      expect(adminPerms.length).toBeGreaterThan(playerPerms.length);
    });

    it('ADMIN has all permissions in their array', () => {
      const adminPerms = getRolePermissions('ADMIN' as PlayerRole);
      const allPermissions = Object.values(PERMISSIONS);

      allPermissions.forEach(perm => {
        expect(adminPerms).toContain(perm);
      });
    });
  });
});
