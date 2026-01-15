/**
 * Tests for diagnostic endpoint security
 * Focus on security-critical behavior: unauthorized access returns 404
 */
import { NextRequest } from 'next/server';

// Mock prisma before importing route
jest.mock('@/lib/prisma', () => ({
  prisma: {
    tournament: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tournamentPlayer: {
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    elimination: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Helper to create params
function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id });
}

// Helper to create request
function createRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body } = options;

  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(new URL(url, 'http://localhost'), requestInit);
}

describe('/api/diag/tournament/[id] Security', () => {
  // Save original env
  const originalEnv = process.env;

  describe('When RECIPE_DIAGNOSTICS is disabled (default production)', () => {
    beforeAll(() => {
      // Ensure diagnostics are disabled
      process.env = { ...originalEnv };
      delete process.env.RECIPE_DIAGNOSTICS;
      delete process.env.DIAG_TOKEN;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('GET returns 404 to hide endpoint existence', async () => {
      // Re-import to get fresh module with current env
      jest.resetModules();
      const { GET } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id');
      const response = await GET(request, { params: createParams('test-id') });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Not Found');
    });

    it('PATCH returns 404 to hide endpoint existence', async () => {
      jest.resetModules();
      const { PATCH } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id', {
        method: 'PATCH',
        body: { rebuyEndLevel: 0 },
      });
      const response = await PATCH(request, { params: createParams('test-id') });

      expect(response.status).toBe(404);
    });

    it('POST returns 404 to hide endpoint existence', async () => {
      jest.resetModules();
      const { POST } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id', {
        method: 'POST',
        body: { action: 'test-finish' },
      });
      const response = await POST(request, { params: createParams('test-id') });

      expect(response.status).toBe(404);
    });
  });

  describe('When RECIPE_DIAGNOSTICS=1 but DIAG_TOKEN missing', () => {
    beforeAll(() => {
      process.env = { ...originalEnv };
      process.env.RECIPE_DIAGNOSTICS = '1';
      delete process.env.DIAG_TOKEN;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('GET returns 404 when token not configured', async () => {
      jest.resetModules();
      const { GET } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id');
      const response = await GET(request, { params: createParams('test-id') });

      expect(response.status).toBe(404);
    });
  });

  describe('When RECIPE_DIAGNOSTICS=1 and DIAG_TOKEN set but header wrong', () => {
    beforeAll(() => {
      process.env = { ...originalEnv };
      process.env.RECIPE_DIAGNOSTICS = '1';
      process.env.DIAG_TOKEN = 'correct-token';
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('GET returns 404 when X-Diag-Token header missing', async () => {
      jest.resetModules();
      const { GET } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id');
      const response = await GET(request, { params: createParams('test-id') });

      expect(response.status).toBe(404);
    });

    it('GET returns 404 when X-Diag-Token header invalid', async () => {
      jest.resetModules();
      const { GET } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id', {
        headers: { 'X-Diag-Token': 'wrong-token' },
      });
      const response = await GET(request, { params: createParams('test-id') });

      expect(response.status).toBe(404);
    });
  });

  describe('When fully authenticated', () => {
    beforeAll(() => {
      process.env = { ...originalEnv };
      process.env.RECIPE_DIAGNOSTICS = '1';
      process.env.DIAG_TOKEN = 'secret-token';
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('GET returns 200 when flag and token valid', async () => {
      jest.resetModules();

      // Re-mock prisma for fresh import
      jest.doMock('@/lib/prisma', () => ({
        prisma: {
          tournament: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'test-id',
              rebuyEndLevel: 0,
              currentLevel: 1,
              status: 'IN_PROGRESS',
            }),
          },
        },
      }));

      const { GET } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id', {
        headers: { 'X-Diag-Token': 'secret-token' },
      });
      const response = await GET(request, { params: createParams('test-id') });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body._diagnostic).toBe(true);
    });

    it('POST returns 400 for unknown action (whitelist enforced)', async () => {
      jest.resetModules();
      const { POST } = await import('@/app/api/diag/tournament/[id]/route');

      const request = createRequest('/api/diag/tournament/test-id', {
        method: 'POST',
        headers: { 'X-Diag-Token': 'secret-token' },
        body: { action: 'drop-database' },
      });
      const response = await POST(request, { params: createParams('test-id') });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Invalid request');
    });
  });
});
