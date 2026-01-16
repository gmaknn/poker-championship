/**
 * Mock Prisma client for testing
 * Provides controlled responses without hitting the database
 */

import { MOCK_PLAYERS, MOCK_TOURNAMENT, MOCK_SEASON, TEST_IDS } from './mocks';

// Use broader types for mock data storage
type MockPrismaPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  avatar: string | null;
  role: string;
  status: string;
  additionalRoles?: string[];
  roles?: { role: string }[];
};
type MockPrismaTournament = {
  id: string;
  name: string;
  seasonId: string;
  date: Date;
  buyInAmount: number;
  startingChips: number;
  targetDuration: number;
  status: string;
  createdById: string;
};

// Store for mock data that can be modified per test
let mockPlayers: Map<string, MockPrismaPlayer> = new Map();
let mockTournaments: Map<string, MockPrismaTournament> = new Map();

/**
 * Reset all mock data to defaults
 */
export function resetMockPrisma() {
  mockPlayers = new Map<string, MockPrismaPlayer>([
    [TEST_IDS.ADMIN_PLAYER, { ...MOCK_PLAYERS.admin }],
    [TEST_IDS.TD_PLAYER, { ...MOCK_PLAYERS.tournamentDirector }],
    [TEST_IDS.REGULAR_PLAYER, { ...MOCK_PLAYERS.player }],
  ]);
  mockTournaments = new Map<string, MockPrismaTournament>([
    [TEST_IDS.TOURNAMENT, { ...MOCK_TOURNAMENT }],
  ]);
}

/**
 * Add a player to the mock store
 */
export function addMockPlayer(player: MockPrismaPlayer) {
  mockPlayers.set(player.id, player);
}

/**
 * Add a tournament to the mock store
 */
export function addMockTournament(tournament: MockPrismaTournament) {
  mockTournaments.set(tournament.id, tournament);
}

/**
 * Mock Prisma client implementation
 */
export const mockPrismaClient = {
  player: {
    findUnique: jest.fn(({ where }: { where: { id?: string; nickname?: string } }) => {
      if (where.id) {
        return Promise.resolve(mockPlayers.get(where.id) || null);
      }
      if (where.nickname) {
        const found = Array.from(mockPlayers.values()).find(p => p.nickname === where.nickname);
        return Promise.resolve(found || null);
      }
      return Promise.resolve(null);
    }),
    findFirst: jest.fn(({ where }: { where: { email?: string } }) => {
      if (where.email) {
        const found = Array.from(mockPlayers.values()).find(p => p.email === where.email);
        return Promise.resolve(found || null);
      }
      return Promise.resolve(null);
    }),
    findMany: jest.fn(() => Promise.resolve(Array.from(mockPlayers.values()))),
    create: jest.fn((data: { data: Partial<MockPrismaPlayer> }) => {
      const newPlayer = {
        id: `new-player-${Date.now()}`,
        ...data.data,
      } as MockPrismaPlayer;
      mockPlayers.set(newPlayer.id, newPlayer);
      return Promise.resolve(newPlayer);
    }),
  },
  tournament: {
    findUnique: jest.fn(({ where }: { where: { id: string } }) => {
      const tournament = mockTournaments.get(where.id);
      if (!tournament) return Promise.resolve(null);
      return Promise.resolve({
        ...tournament,
        createdBy: mockPlayers.get(tournament.createdById) || null,
        season: MOCK_SEASON,
        tournamentPlayers: [],
        blindLevels: [],
      });
    }),
    findMany: jest.fn(() => Promise.resolve(Array.from(mockTournaments.values()))),
    create: jest.fn((data: { data: Partial<MockPrismaTournament> }) => {
      const newTournament = {
        id: `new-tournament-${Date.now()}`,
        ...data.data,
      } as MockPrismaTournament;
      mockTournaments.set(newTournament.id, newTournament);
      return Promise.resolve(newTournament);
    }),
  },
  season: {
    findUnique: jest.fn(({ where }: { where: { id: string } }) => {
      if (where.id === TEST_IDS.SEASON) {
        return Promise.resolve({
          ...MOCK_SEASON,
          tournaments: [],
        });
      }
      return Promise.resolve(null);
    }),
    findFirst: jest.fn(() => Promise.resolve({
      ...MOCK_SEASON,
      tournaments: [],
    })),
    findMany: jest.fn(() => Promise.resolve([MOCK_SEASON])),
  },
  user: {
    findUnique: jest.fn(() => Promise.resolve(null)),
  },
  tournamentPlayer: {
    findMany: jest.fn(() => Promise.resolve([])),
    findFirst: jest.fn(() => Promise.resolve(null)),
    count: jest.fn(() => Promise.resolve(0)),
    aggregate: jest.fn(() => Promise.resolve({ _sum: {} })),
    groupBy: jest.fn(() => Promise.resolve([])),
  },
  elimination: {
    groupBy: jest.fn(() => Promise.resolve([])),
  },
  tournamentDirector: {
    findUnique: jest.fn(() => Promise.resolve(null)),
    findMany: jest.fn(() => Promise.resolve([])),
  },
};

// Initialize with default data
resetMockPrisma();
