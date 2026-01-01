/**
 * Tests for POST /api/auth/activate
 * Phase 8: Account activation flow
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$mockedHashedPassword'),
}));

// Mock Prisma
const mockTransaction = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    accountActivationToken: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    player: {
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

import { POST } from '@/app/api/auth/activate/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('POST /api/auth/activate', () => {
  const validToken = 'a'.repeat(64); // 32 bytes hex = 64 chars
  const validTokenHash = createHash('sha256').update(validToken).digest('hex');

  const inactivePlayer = {
    id: 'cm1234567890abcdefghijklm',
    firstName: 'New',
    lastName: 'Player',
    nickname: 'newplayer',
    email: 'newplayer@test.com',
    status: 'INACTIVE',
    password: null,
  };

  const validActivationToken = {
    id: 'token-1',
    tokenHash: validTokenHash,
    playerId: inactivePlayer.id,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
    usedAt: null,
    createdAt: new Date(),
    player: inactivePlayer,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (operations: unknown[]) => {
      // Simulate transaction execution
      return Promise.all(operations);
    });
  });

  describe('Validation', () => {
    it('should return 400 when token is invalid', async () => {
      (mockPrisma.accountActivationToken.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token',
          password: 'securepassword123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('invalide');
    });

    it('should return 400 when token is expired', async () => {
      const expiredToken = {
        ...validActivationToken,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // -24h (expired)
      };
      (mockPrisma.accountActivationToken.findUnique as jest.Mock).mockResolvedValue(expiredToken);

      const request = new NextRequest('http://localhost/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'securepassword123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('expiré');
    });

    it('should return 400 when token is already used', async () => {
      const usedToken = {
        ...validActivationToken,
        usedAt: new Date(Date.now() - 60 * 60 * 1000), // Used 1 hour ago
      };
      (mockPrisma.accountActivationToken.findUnique as jest.Mock).mockResolvedValue(usedToken);

      const request = new NextRequest('http://localhost/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'securepassword123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('déjà été utilisé');
    });

    it('should return 400 when account is already activated', async () => {
      const alreadyActivatedToken = {
        ...validActivationToken,
        player: {
          ...inactivePlayer,
          password: '$2a$12$existingPassword', // Already has password
        },
      };
      (mockPrisma.accountActivationToken.findUnique as jest.Mock).mockResolvedValue(alreadyActivatedToken);

      const request = new NextRequest('http://localhost/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'securepassword123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('déjà activé');
    });

    it('should return 400 when password is too short', async () => {
      const request = new NextRequest('http://localhost/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'short', // Less than 8 characters
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe('Success', () => {
    it('should return 200 and activate account with valid token and password', async () => {
      (mockPrisma.accountActivationToken.findUnique as jest.Mock).mockResolvedValue(validActivationToken);

      const request = new NextRequest('http://localhost/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'securepassword123',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('succès');
      expect(data.player.id).toBe(inactivePlayer.id);
      expect(data.player.nickname).toBe(inactivePlayer.nickname);

      // Verify transaction was called
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should hash password before storing', async () => {
      (mockPrisma.accountActivationToken.findUnique as jest.Mock).mockResolvedValue(validActivationToken);

      const bcrypt = require('bcryptjs');

      const request = new NextRequest('http://localhost/api/auth/activate', {
        method: 'POST',
        body: JSON.stringify({
          token: validToken,
          password: 'securepassword123',
        }),
      });

      await POST(request);

      // bcrypt.hash should have been called with the password
      expect(bcrypt.hash).toHaveBeenCalledWith('securepassword123', 12);
    });
  });
});
