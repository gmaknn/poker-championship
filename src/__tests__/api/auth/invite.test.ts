/**
 * Tests for POST /api/auth/invite
 * Phase 8: Account invitation flow
 */

import { NextRequest } from 'next/server';
import { MOCK_PLAYERS, TEST_IDS } from '@/test-utils/mocks';

// Mock email provider
const mockSendActivationEmail = jest.fn().mockResolvedValue(true);
jest.mock('@/lib/email', () => ({
  sendActivationEmail: (...args: unknown[]) => mockSendActivationEmail(...args),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    accountActivationToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({ id: 'token-1' }),
    },
  },
}));

// Mock NextAuth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { POST } from '@/app/api/auth/invite/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('POST /api/auth/invite', () => {
  const inactivePlayer = {
    id: 'cm1234567890abcdefghijklm',
    firstName: 'New',
    lastName: 'Player',
    nickname: 'newplayer',
    email: 'newplayer@test.com',
    status: 'INACTIVE',
    password: null, // Not activated
  };

  const activePlayer = {
    id: 'cm9876543210abcdefghijklm',
    firstName: 'Active',
    lastName: 'Player',
    nickname: 'activeplayer',
    email: 'active@test.com',
    status: 'ACTIVE',
    password: '$2a$12$hashedpassword', // Already has password
  };

  const playerWithoutEmail = {
    id: 'cm5555555555abcdefghijklm',
    firstName: 'No',
    lastName: 'Email',
    nickname: 'noemail',
    email: null,
    status: 'INACTIVE',
    password: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default player mock for auth
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id === TEST_IDS.ADMIN_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.admin, roles: [] });
        }
        if (where.id === TEST_IDS.REGULAR_PLAYER) {
          return Promise.resolve({ ...MOCK_PLAYERS.player, roles: [] });
        }
        if (where.id === inactivePlayer.id) {
          return Promise.resolve(inactivePlayer);
        }
        if (where.id === activePlayer.id) {
          return Promise.resolve(activePlayer);
        }
        if (where.id === playerWithoutEmail.id) {
          return Promise.resolve(playerWithoutEmail);
        }
        return Promise.resolve(null);
      }
    );
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      const request = new NextRequest('http://localhost/api/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ playerId: inactivePlayer.id }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 when regular player tries to invite', async () => {
      const request = new NextRequest('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.REGULAR_PLAYER}`,
        },
        body: JSON.stringify({ playerId: inactivePlayer.id }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });
  });

  describe('Validation', () => {
    it('should return 404 when player not found', async () => {
      const request = new NextRequest('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
        },
        body: JSON.stringify({ playerId: 'nonexistent-player-id' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(404);
    });

    it('should return 400 when player has no email', async () => {
      const request = new NextRequest('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
        },
        body: JSON.stringify({ playerId: playerWithoutEmail.id }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('email');
    });

    it('should return 400 when account already activated', async () => {
      const request = new NextRequest('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
        },
        body: JSON.stringify({ playerId: activePlayer.id }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('déjà activé');
    });
  });

  describe('Success', () => {
    it('should return 200 and send email when admin invites inactive player', async () => {
      const request = new NextRequest('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
        },
        body: JSON.stringify({ playerId: inactivePlayer.id }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain(inactivePlayer.email);

      // Verify email was called
      expect(mockSendActivationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendActivationEmail).toHaveBeenCalledWith(
        inactivePlayer.email,
        expect.stringContaining('/activate/'),
        expect.any(String)
      );

      // Verify token was created
      expect(mockPrisma.accountActivationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          playerId: inactivePlayer.id,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      });
    });

    it('should invalidate existing tokens before creating new one', async () => {
      const request = new NextRequest('http://localhost/api/auth/invite', {
        method: 'POST',
        headers: {
          cookie: `player-id=${TEST_IDS.ADMIN_PLAYER}`,
        },
        body: JSON.stringify({ playerId: inactivePlayer.id }),
      });

      await POST(request);

      expect(mockPrisma.accountActivationToken.updateMany).toHaveBeenCalledWith({
        where: {
          playerId: inactivePlayer.id,
          usedAt: null,
        },
        data: {
          usedAt: expect.any(Date),
        },
      });
    });
  });
});
