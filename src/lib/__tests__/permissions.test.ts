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
  isSuperAdmin,
  isTournamentDirectorOrAbove,
  getRolePermissions,
  PERMISSIONS,
  ROLES,
} from '../permissions';

describe('permissions', () => {
  describe('hasPermission', () => {
    it('SUPERADMIN should have all permissions (bypass)', () => {
      expect(hasPermission('SUPERADMIN' as PlayerRole, PERMISSIONS.CREATE_PLAYER)).toBe(true);
      expect(hasPermission('SUPERADMIN' as PlayerRole, PERMISSIONS.EDIT_ALL_TOURNAMENTS)).toBe(true);
      expect(hasPermission('SUPERADMIN' as PlayerRole, PERMISSIONS.DELETE_SEASON)).toBe(true);
      expect(hasPermission('SUPERADMIN' as PlayerRole, PERMISSIONS.MANAGE_PLAYER_ROLES)).toBe(true);
      expect(hasPermission('SUPERADMIN' as PlayerRole, PERMISSIONS.EDIT_SETTINGS)).toBe(true);
    });

    it('ADMIN should have tournament and player view/create permissions', () => {
      // Tournament permissions ADMIN has
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.VIEW_ALL_TOURNAMENTS)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.CREATE_TOURNAMENT)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.EDIT_ALL_TOURNAMENTS)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.DELETE_ALL_TOURNAMENTS)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.MANAGE_ELIMINATIONS)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.MANAGE_REBUYS)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.FINALIZE_TOURNAMENT)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.EXPORT_TOURNAMENT_PDF)).toBe(true);
      // Player: view + create only
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.VIEW_PLAYERS)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.CREATE_PLAYER)).toBe(true);
      // Chipsets: view only
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.VIEW_CHIPSETS)).toBe(true);
      // Stats
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.VIEW_LEADERBOARD)).toBe(true);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.VIEW_PLAYER_STATS)).toBe(true);
    });

    it('ADMIN should NOT have settings, seasons, or player edit/delete permissions', () => {
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.EDIT_SETTINGS)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.VIEW_SETTINGS)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.EDIT_SEASON)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.CREATE_SEASON)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.DELETE_SEASON)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.EDIT_PLAYER)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.DELETE_PLAYER)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.MANAGE_PLAYER_ROLES)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.CREATE_CHIPSET)).toBe(false);
      expect(hasPermission('ADMIN' as PlayerRole, PERMISSIONS.EDIT_CHIPSET)).toBe(false);
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
    it('SUPERADMIN can view all tournaments', () => {
      expect(canViewAllTournaments('SUPERADMIN' as PlayerRole)).toBe(true);
    });

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
    it('SUPERADMIN can create tournaments', () => {
      expect(canCreateTournament('SUPERADMIN' as PlayerRole)).toBe(true);
    });

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

    it('SUPERADMIN can edit any tournament', () => {
      expect(canEditTournament('SUPERADMIN' as PlayerRole, ownerId, otherUserId)).toBe(true);
      expect(canEditTournament('SUPERADMIN' as PlayerRole, null, otherUserId)).toBe(true);
    });

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

    it('SUPERADMIN can delete any tournament', () => {
      expect(canDeleteTournament('SUPERADMIN' as PlayerRole, ownerId, otherUserId)).toBe(true);
    });

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
    it('SUPERADMIN can manage players', () => {
      expect(canManagePlayers('SUPERADMIN' as PlayerRole)).toBe(true);
    });

    it('ADMIN cannot manage (edit) players', () => {
      expect(canManagePlayers('ADMIN' as PlayerRole)).toBe(false);
    });

    it('PLAYER cannot manage players', () => {
      expect(canManagePlayers('PLAYER' as PlayerRole)).toBe(false);
    });

    it('TOURNAMENT_DIRECTOR cannot manage players', () => {
      expect(canManagePlayers('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(false);
    });
  });

  describe('canManageSeasons', () => {
    it('SUPERADMIN can manage seasons', () => {
      expect(canManageSeasons('SUPERADMIN' as PlayerRole)).toBe(true);
    });

    it('ADMIN cannot manage seasons', () => {
      expect(canManageSeasons('ADMIN' as PlayerRole)).toBe(false);
    });

    it('PLAYER cannot manage seasons', () => {
      expect(canManageSeasons('PLAYER' as PlayerRole)).toBe(false);
    });
  });

  describe('role helpers', () => {
    it('isAdmin correctly identifies ADMIN and SUPERADMIN roles', () => {
      expect(isAdmin('SUPERADMIN' as PlayerRole)).toBe(true);
      expect(isAdmin('ADMIN' as PlayerRole)).toBe(true);
      expect(isAdmin('PLAYER' as PlayerRole)).toBe(false);
      expect(isAdmin('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(false);
    });

    it('isSuperAdmin correctly identifies SUPERADMIN only', () => {
      expect(isSuperAdmin('SUPERADMIN' as PlayerRole)).toBe(true);
      expect(isSuperAdmin('ADMIN' as PlayerRole)).toBe(false);
      expect(isSuperAdmin('PLAYER' as PlayerRole)).toBe(false);
    });

    it('isTournamentDirectorOrAbove works correctly', () => {
      expect(isTournamentDirectorOrAbove('SUPERADMIN' as PlayerRole)).toBe(true);
      expect(isTournamentDirectorOrAbove('ADMIN' as PlayerRole)).toBe(true);
      expect(isTournamentDirectorOrAbove('TOURNAMENT_DIRECTOR' as PlayerRole)).toBe(true);
      expect(isTournamentDirectorOrAbove('PLAYER' as PlayerRole)).toBe(false);
      expect(isTournamentDirectorOrAbove('ANIMATOR' as PlayerRole)).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('returns array of permissions for each role', () => {
      const superadminPerms = getRolePermissions('SUPERADMIN' as PlayerRole);
      const adminPerms = getRolePermissions('ADMIN' as PlayerRole);
      const playerPerms = getRolePermissions('PLAYER' as PlayerRole);

      expect(Array.isArray(superadminPerms)).toBe(true);
      expect(Array.isArray(adminPerms)).toBe(true);
      expect(Array.isArray(playerPerms)).toBe(true);
      expect(superadminPerms.length).toBeGreaterThan(adminPerms.length);
      expect(adminPerms.length).toBeGreaterThan(playerPerms.length);
    });

    it('SUPERADMIN has all permissions in their array', () => {
      const superadminPerms = getRolePermissions('SUPERADMIN' as PlayerRole);
      const allPermissions = Object.values(PERMISSIONS);

      allPermissions.forEach(perm => {
        expect(superadminPerms).toContain(perm);
      });
    });

    it('ADMIN has tournament permissions but not settings/seasons', () => {
      const adminPerms = getRolePermissions('ADMIN' as PlayerRole);

      expect(adminPerms).toContain(PERMISSIONS.VIEW_ALL_TOURNAMENTS);
      expect(adminPerms).toContain(PERMISSIONS.CREATE_TOURNAMENT);
      expect(adminPerms).toContain(PERMISSIONS.EDIT_ALL_TOURNAMENTS);
      expect(adminPerms).not.toContain(PERMISSIONS.EDIT_SETTINGS);
      expect(adminPerms).not.toContain(PERMISSIONS.EDIT_SEASON);
      expect(adminPerms).not.toContain(PERMISSIONS.EDIT_PLAYER);
    });
  });
});
