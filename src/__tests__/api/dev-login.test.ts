/**
 * Tests for /api/dev/login route
 * Ensures dev login is properly guarded and only works in dev mode
 */

import { NextRequest } from 'next/server';

describe('Dev Login API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Security Guards', () => {
    it('should return 404 when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_DEV_LOGIN = '1';

      // Re-import after env change
      const { POST } = await import('@/app/api/dev/login/route');

      const request = new NextRequest('http://localhost:3000/api/dev/login', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should return 404 when NEXT_PUBLIC_DEV_LOGIN is not set', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXT_PUBLIC_DEV_LOGIN;

      const { POST } = await import('@/app/api/dev/login/route');

      const request = new NextRequest('http://localhost:3000/api/dev/login', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should return 404 when request is not from localhost', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_DEV_LOGIN = '1';

      const { POST } = await import('@/app/api/dev/login/route');

      const request = new NextRequest('http://example.com/api/dev/login', {
        method: 'POST',
        headers: {
          host: 'example.com',
          origin: 'http://example.com',
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should allow request when all conditions are met', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_DEV_LOGIN = '1';

      const { POST } = await import('@/app/api/dev/login/route');

      const request = new NextRequest('http://localhost:3000/api/dev/login', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
      });

      const response = await POST(request);
      // Should be 200 (success) or 500 (db error in test env), but NOT 404
      expect(response.status).not.toBe(404);
    });
  });

  describe('GET endpoint', () => {
    it('should return 404 when guards fail', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_DEV_LOGIN = '1';

      const { GET } = await import('@/app/api/dev/login/route');

      const request = new NextRequest('http://localhost:3000/api/dev/login', {
        method: 'GET',
        headers: {
          host: 'localhost:3000',
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(404);
    });

    it('should return info when all conditions are met', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXT_PUBLIC_DEV_LOGIN = '1';

      const { GET } = await import('@/app/api/dev/login/route');

      const request = new NextRequest('http://localhost:3000/api/dev/login', {
        method: 'GET',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.enabled).toBe(true);
      expect(data.email).toBe('admin@local.test');
    });
  });
});
