/**
 * Mock data and utilities for testing
 */

import { PlayerRole } from '@prisma/client';

// Fixed IDs for deterministic tests
export const TEST_IDS = {
  ADMIN_PLAYER: 'test-admin-player-001',
  TD_PLAYER: 'test-td-player-002',
  REGULAR_PLAYER: 'test-player-003',
  TOURNAMENT: 'test-tournament-001',
  SEASON: 'test-season-001',
} as const;

// Mock player data
export const MOCK_PLAYERS = {
  admin: {
    id: TEST_IDS.ADMIN_PLAYER,
    firstName: 'Admin',
    lastName: 'User',
    nickname: 'admin',
    email: 'admin@test.com',
    avatar: null,
    role: 'ADMIN' as PlayerRole,
    status: 'ACTIVE',
    additionalRoles: [] as PlayerRole[],
    roles: [] as { role: PlayerRole }[],
  },
  tournamentDirector: {
    id: TEST_IDS.TD_PLAYER,
    firstName: 'Tournament',
    lastName: 'Director',
    nickname: 'td_user',
    email: 'td@test.com',
    avatar: null,
    role: 'TOURNAMENT_DIRECTOR' as PlayerRole,
    status: 'ACTIVE',
    additionalRoles: [] as PlayerRole[],
    roles: [] as { role: PlayerRole }[],
  },
  player: {
    id: TEST_IDS.REGULAR_PLAYER,
    firstName: 'Regular',
    lastName: 'Player',
    nickname: 'player',
    email: 'player@test.com',
    avatar: null,
    role: 'PLAYER' as PlayerRole,
    status: 'ACTIVE',
    additionalRoles: [] as PlayerRole[],
    roles: [] as { role: PlayerRole }[],
  },
} as const;

// Mock tournament data
export const MOCK_TOURNAMENT = {
  id: TEST_IDS.TOURNAMENT,
  name: 'Test Tournament',
  seasonId: TEST_IDS.SEASON,
  date: new Date('2025-01-15'),
  buyInAmount: 10,
  startingChips: 5000,
  targetDuration: 180,
  status: 'PLANNED',
  createdById: TEST_IDS.TD_PLAYER,
} as const;

// Mock season data - endDate in the future to allow tournament creation
export const MOCK_SEASON = {
  id: TEST_IDS.SEASON,
  name: 'Saison Test 2025',
  year: 2025,
  startDate: new Date('2025-01-01'),
  endDate: new Date('2026-12-31'), // Future date to allow tournament creation
  status: 'ACTIVE',
  totalTournamentsCount: 10,
  bestTournamentsCount: 6,
} as const;
