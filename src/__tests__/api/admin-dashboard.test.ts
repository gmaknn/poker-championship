/**
 * Tests for GET /api/tournaments/[id]/admin-dashboard
 * RBAC + Contract validation
 */

import { createAuthenticatedRequest, createMockRequest } from '@/test-utils/request';
import { TEST_IDS, MOCK_PLAYERS, MOCK_SEASON } from '@/test-utils/mocks';
import { resetMockPrisma, mockPrismaClient } from '@/test-utils/prisma';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Mock auth - returns null by default (not authenticated via NextAuth)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

// Mock blind levels
const MOCK_BLIND_LEVELS = [
  { id: 'bl-1', tournamentId: TEST_IDS.TOURNAMENT, level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12, isBreak: false, rebalanceTables: false },
  { id: 'bl-2', tournamentId: TEST_IDS.TOURNAMENT, level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12, isBreak: false, rebalanceTables: false },
  { id: 'bl-3', tournamentId: TEST_IDS.TOURNAMENT, level: 3, smallBlind: 100, bigBlind: 200, ante: 25, duration: 12, isBreak: false, rebalanceTables: false },
];

// Mock tournament players
const MOCK_TOURNAMENT_PLAYERS = [
  { playerId: 'p1', finalRank: null, rebuysCount: 2, lightRebuyUsed: true },
  { playerId: 'p2', finalRank: null, rebuysCount: 1, lightRebuyUsed: false },
  { playerId: 'p3', finalRank: 3, rebuysCount: 0, lightRebuyUsed: true },
  { playerId: 'p4', finalRank: 4, rebuysCount: 1, lightRebuyUsed: false },
];

// Mock tournament for admin dashboard
const MOCK_TOURNAMENT_DASHBOARD = {
  id: TEST_IDS.TOURNAMENT,
  name: 'Test Tournament',
  seasonId: TEST_IDS.SEASON,
  date: new Date('2025-01-15'),
  buyInAmount: 10,
  startingChips: 5000,
  targetDuration: 180,
  status: 'IN_PROGRESS',
  createdById: TEST_IDS.TD_PLAYER,
  timerStartedAt: new Date(Date.now() - 300000), // 5 minutes ago
  timerPausedAt: null,
  timerElapsedSeconds: 0,
  currentLevel: 1,
  levelDuration: 12,
  rebuyEndLevel: 6,
  season: MOCK_SEASON,
  blindLevels: MOCK_BLIND_LEVELS,
  tournamentPlayers: MOCK_TOURNAMENT_PLAYERS,
};

// Dynamic import after mocks
let GET: typeof import('@/app/api/tournaments/[id]/admin-dashboard/route').GET;

describe('GET /api/tournaments/[id]/admin-dashboard', () => {
  beforeAll(async () => {
    GET = (await import('@/app/api/tournaments/[id]/admin-dashboard/route')).GET;
  });

  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();

    // Setup tournament mock
    mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === TEST_IDS.TOURNAMENT) {
        return Promise.resolve({ ...MOCK_TOURNAMENT_DASHBOARD });
      }
      return Promise.resolve(null);
    });
  });

  const createParams = (id: string) => Promise.resolve({ id });

  describe('RBAC', () => {
    it('should return 401 when not authenticated', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`);
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Non authentifié');
    });

    it('should return 403 when authenticated as PLAYER (not ADMIN/TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.REGULAR_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Permission refusée');
    });

    it('should return 200 when authenticated as ADMIN', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
    });

    it('should return 200 when authenticated as TD (tournament creator)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.TD_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent tournament', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/non-existent/admin-dashboard',
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams('non-existent') });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Tournament not found');
    });
  });

  describe('Contract V1', () => {
    it('should return correct shape for ADMIN', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Tournament section
      expect(data.tournament).toBeDefined();
      expect(data.tournament.id).toBe(TEST_IDS.TOURNAMENT);
      expect(data.tournament.status).toBe('IN_PROGRESS');
      expect(typeof data.tournament.currentLevel).toBe('number');
      expect(data.tournament.rebuyEndLevel).toBe(6);

      // Players section
      expect(data.players).toBeDefined();
      expect(data.players.registered).toBe(4);
      expect(data.players.eliminated).toBe(2); // p3 and p4 have finalRank
      expect(data.players.remaining).toBe(2);

      // Level section
      expect(data.level).toBeDefined();
      expect(typeof data.level.currentLevel).toBe('number');
      expect(data.level.blinds).toBeDefined();
      expect(typeof data.level.blinds.smallBlind).toBe('number');
      expect(typeof data.level.blinds.bigBlind).toBe('number');
      expect(typeof data.level.blinds.ante).toBe('number');
      expect(typeof data.level.durationSeconds).toBe('number');
      expect(typeof data.level.secondsIntoCurrentLevel).toBe('number');
      expect(typeof data.level.remainingSeconds).toBe('number');
      expect(data.level.isRunning).toBe(true);
      expect(data.level.isPaused).toBe(false);

      // Rebuys section
      expect(data.rebuys).toBeDefined();
      expect(data.rebuys.total).toBe(4); // 2 + 1 + 0 + 1
      expect(data.rebuys.lightUsed).toBe(2); // p1 and p3

      // Alerts section
      expect(data.alerts).toBeDefined();
      expect(typeof data.alerts.rebuyWindowClosed).toBe('boolean');
      expect(typeof data.alerts.noPlayersRemaining).toBe('boolean');
      expect(typeof data.alerts.finishedLeaderboardInconsistent).toBe('boolean');
    });

    it('should calculate rebuyWindowClosed correctly when level > rebuyEndLevel', async () => {
      // Update mock to have currentLevel > rebuyEndLevel
      mockPrismaClient.tournament.findUnique.mockResolvedValueOnce({
        ...MOCK_TOURNAMENT_DASHBOARD,
        rebuyEndLevel: 1,
        timerStartedAt: new Date(Date.now() - 900000), // 15 minutes = past level 1
        timerElapsedSeconds: 900, // 15 minutes elapsed
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.alerts.rebuyWindowClosed).toBe(true);
    });

    it('should detect noPlayersRemaining when all eliminated', async () => {
      const allEliminated = [
        { playerId: 'p1', finalRank: 1, rebuysCount: 0, lightRebuyUsed: false },
        { playerId: 'p2', finalRank: 2, rebuysCount: 0, lightRebuyUsed: false },
      ];

      mockPrismaClient.tournament.findUnique.mockResolvedValueOnce({
        ...MOCK_TOURNAMENT_DASHBOARD,
        tournamentPlayers: allEliminated,
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.alerts.noPlayersRemaining).toBe(true);
      expect(data.players.remaining).toBe(0);
    });

    it('should detect finishedLeaderboardInconsistent when FINISHED with missing ranks', async () => {
      const inconsistentPlayers = [
        { playerId: 'p1', finalRank: 1, rebuysCount: 0, lightRebuyUsed: false },
        { playerId: 'p2', finalRank: null, rebuysCount: 0, lightRebuyUsed: false }, // Missing rank!
      ];

      mockPrismaClient.tournament.findUnique.mockResolvedValueOnce({
        ...MOCK_TOURNAMENT_DASHBOARD,
        status: 'FINISHED',
        tournamentPlayers: inconsistentPlayers,
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.alerts.finishedLeaderboardInconsistent).toBe(true);
    });

    it('should detect finishedLeaderboardInconsistent when FINISHED with duplicate ranks', async () => {
      const duplicateRankPlayers = [
        { playerId: 'p1', finalRank: 1, rebuysCount: 0, lightRebuyUsed: false },
        { playerId: 'p2', finalRank: 1, rebuysCount: 0, lightRebuyUsed: false }, // Duplicate!
      ];

      mockPrismaClient.tournament.findUnique.mockResolvedValueOnce({
        ...MOCK_TOURNAMENT_DASHBOARD,
        status: 'FINISHED',
        tournamentPlayers: duplicateRankPlayers,
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.alerts.finishedLeaderboardInconsistent).toBe(true);
    });

    it('should NOT flag finishedLeaderboardInconsistent when FINISHED with valid ranks', async () => {
      const validPlayers = [
        { playerId: 'p1', finalRank: 1, rebuysCount: 0, lightRebuyUsed: false },
        { playerId: 'p2', finalRank: 2, rebuysCount: 0, lightRebuyUsed: false },
        { playerId: 'p3', finalRank: 3, rebuysCount: 0, lightRebuyUsed: false },
      ];

      mockPrismaClient.tournament.findUnique.mockResolvedValueOnce({
        ...MOCK_TOURNAMENT_DASHBOARD,
        status: 'FINISHED',
        tournamentPlayers: validPlayers,
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.alerts.finishedLeaderboardInconsistent).toBe(false);
    });

    it('should calculate remainingSeconds correctly', async () => {
      // Timer just started, no elapsed time
      mockPrismaClient.tournament.findUnique.mockResolvedValueOnce({
        ...MOCK_TOURNAMENT_DASHBOARD,
        timerStartedAt: new Date(),
        timerElapsedSeconds: 0,
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();

      // Level 1 duration is 12 minutes = 720 seconds
      expect(data.level.durationSeconds).toBe(720);
      // remainingSeconds should be close to durationSeconds (minus a few seconds for execution)
      expect(data.level.remainingSeconds).toBeGreaterThan(700);
      expect(data.level.remainingSeconds).toBeLessThanOrEqual(720);
    });

    it('should handle paused timer correctly', async () => {
      mockPrismaClient.tournament.findUnique.mockResolvedValueOnce({
        ...MOCK_TOURNAMENT_DASHBOARD,
        timerStartedAt: new Date(Date.now() - 300000),
        timerPausedAt: new Date(), // Paused now
        timerElapsedSeconds: 300,
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/admin-dashboard`,
        TEST_IDS.ADMIN_PLAYER
      );
      const response = await GET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.level.isRunning).toBe(false);
      expect(data.level.isPaused).toBe(true);
    });
  });
});
