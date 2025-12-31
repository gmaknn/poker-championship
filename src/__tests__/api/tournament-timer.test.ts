/**
 * RBAC tests for /api/tournaments/[id]/timer/* endpoints
 * Tests: GET timer status, POST start, POST pause, POST resume, POST reset
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

// Mock socket to avoid WebSocket issues
jest.mock('@/lib/socket', () => ({
  emitToTournament: jest.fn(),
}));

// Mock blind levels
const MOCK_BLIND_LEVELS = [
  { id: 'bl-1', tournamentId: TEST_IDS.TOURNAMENT, level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12, isBreak: false, rebalanceTables: false },
  { id: 'bl-2', tournamentId: TEST_IDS.TOURNAMENT, level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12, isBreak: false, rebalanceTables: false },
];

// Mock tournament data for timer tests
const MOCK_TOURNAMENT_TIMER = {
  id: TEST_IDS.TOURNAMENT,
  name: 'Test Tournament',
  seasonId: TEST_IDS.SEASON,
  date: new Date('2025-01-15'),
  buyInAmount: 10,
  startingChips: 5000,
  targetDuration: 180,
  status: 'PLANNED',
  createdById: TEST_IDS.TD_PLAYER,
  timerStartedAt: null,
  timerPausedAt: null,
  timerElapsedSeconds: 0,
  currentLevel: 1,
  levelDuration: 12,
  season: MOCK_SEASON,
  blindLevels: MOCK_BLIND_LEVELS,
};

// Dynamic import after mocks
let timerRouteGET: typeof import('@/app/api/tournaments/[id]/timer/route').GET;
let startRoutePOST: typeof import('@/app/api/tournaments/[id]/timer/start/route').POST;
let pauseRoutePOST: typeof import('@/app/api/tournaments/[id]/timer/pause/route').POST;
let resumeRoutePOST: typeof import('@/app/api/tournaments/[id]/timer/resume/route').POST;
let resetRoutePOST: typeof import('@/app/api/tournaments/[id]/timer/reset/route').POST;

describe('API /api/tournaments/[id]/timer RBAC', () => {
  beforeAll(async () => {
    timerRouteGET = (await import('@/app/api/tournaments/[id]/timer/route')).GET;
    startRoutePOST = (await import('@/app/api/tournaments/[id]/timer/start/route')).POST;
    pauseRoutePOST = (await import('@/app/api/tournaments/[id]/timer/pause/route')).POST;
    resumeRoutePOST = (await import('@/app/api/tournaments/[id]/timer/resume/route')).POST;
    resetRoutePOST = (await import('@/app/api/tournaments/[id]/timer/reset/route')).POST;
  });

  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();

    // Setup tournament mock for timer tests
    mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === TEST_IDS.TOURNAMENT) {
        return Promise.resolve({ ...MOCK_TOURNAMENT_TIMER });
      }
      return Promise.resolve(null);
    });

    mockPrismaClient.tournament.update = jest.fn().mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      if (where.id === TEST_IDS.TOURNAMENT) {
        return Promise.resolve({ ...MOCK_TOURNAMENT_TIMER, ...data });
      }
      return Promise.resolve(null);
    });
  });

  const createParams = (id: string) => Promise.resolve({ id });

  describe('GET /api/tournaments/[id]/timer', () => {
    it('should return timer status for unauthenticated users (public)', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/timer`);
      const response = await timerRouteGET(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('isRunning');
      expect(data).toHaveProperty('isPaused');
    });

    it('should return 404 for non-existent tournament', async () => {
      const request = createMockRequest('/api/tournaments/non-existent/timer');
      const response = await timerRouteGET(request, { params: createParams('non-existent') });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/tournaments/[id]/timer/start', () => {
    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/start`, {
        method: 'POST',
      });
      const response = await startRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/start`,
        TEST_IDS.REGULAR_PLAYER,
        { method: 'POST' }
      );
      const response = await startRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 200 for tournament creator (TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/start`,
        TEST_IDS.TD_PLAYER,
        { method: 'POST' }
      );
      const response = await startRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 200 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/start`,
        TEST_IDS.ADMIN_PLAYER,
        { method: 'POST' }
      );
      const response = await startRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent tournament', async () => {
      const request = createAuthenticatedRequest(
        '/api/tournaments/non-existent/timer/start',
        TEST_IDS.ADMIN_PLAYER,
        { method: 'POST' }
      );
      const response = await startRoutePOST(request, { params: createParams('non-existent') });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/tournaments/[id]/timer/pause', () => {
    beforeEach(() => {
      // Setup running timer for pause tests
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_TIMER,
            timerStartedAt: new Date(),
            status: 'IN_PROGRESS',
          });
        }
        return Promise.resolve(null);
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/pause`, {
        method: 'POST',
      });
      const response = await pauseRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/pause`,
        TEST_IDS.REGULAR_PLAYER,
        { method: 'POST' }
      );
      const response = await pauseRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
    });

    it('should return 200 for tournament creator (TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/pause`,
        TEST_IDS.TD_PLAYER,
        { method: 'POST' }
      );
      const response = await pauseRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 400 when timer is not running', async () => {
      // Reset to non-running timer
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_TIMER,
            timerStartedAt: null,
          });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/pause`,
        TEST_IDS.TD_PLAYER,
        { method: 'POST' }
      );
      const response = await pauseRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not running');
    });
  });

  describe('POST /api/tournaments/[id]/timer/resume', () => {
    beforeEach(() => {
      // Setup paused timer for resume tests
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_TIMER,
            timerPausedAt: new Date(),
            status: 'IN_PROGRESS',
          });
        }
        return Promise.resolve(null);
      });
    });

    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/resume`, {
        method: 'POST',
      });
      const response = await resumeRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/resume`,
        TEST_IDS.REGULAR_PLAYER,
        { method: 'POST' }
      );
      const response = await resumeRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
    });

    it('should return 200 for tournament creator (TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/resume`,
        TEST_IDS.TD_PLAYER,
        { method: 'POST' }
      );
      const response = await resumeRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 400 when timer is not paused', async () => {
      // Reset to non-paused timer
      mockPrismaClient.tournament.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === TEST_IDS.TOURNAMENT) {
          return Promise.resolve({
            ...MOCK_TOURNAMENT_TIMER,
            timerPausedAt: null,
          });
        }
        return Promise.resolve(null);
      });

      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/resume`,
        TEST_IDS.TD_PLAYER,
        { method: 'POST' }
      );
      const response = await resumeRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('not paused');
    });
  });

  describe('POST /api/tournaments/[id]/timer/reset', () => {
    it('should return 401 for unauthenticated request', async () => {
      const request = createMockRequest(`/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/reset`, {
        method: 'POST',
      });
      const response = await resetRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(401);
    });

    it('should return 403 for PLAYER role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/reset`,
        TEST_IDS.REGULAR_PLAYER,
        { method: 'POST' }
      );
      const response = await resetRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(403);
    });

    it('should return 200 for tournament creator (TD)', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/reset`,
        TEST_IDS.TD_PLAYER,
        { method: 'POST' }
      );
      const response = await resetRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 200 for ADMIN role', async () => {
      const request = createAuthenticatedRequest(
        `/api/tournaments/${TEST_IDS.TOURNAMENT}/timer/reset`,
        TEST_IDS.ADMIN_PLAYER,
        { method: 'POST' }
      );
      const response = await resetRoutePOST(request, { params: createParams(TEST_IDS.TOURNAMENT) });

      expect(response.status).toBe(200);
    });
  });
});
