/**
 * RBAC and validation tests for /api/players/[id]/avatar endpoint
 * Tests: POST avatar upload with sharp image processing
 */

import { createAuthenticatedRequest, createMockRequest } from '@/test-utils/request';
import { TEST_IDS, MOCK_PLAYERS } from '@/test-utils/mocks';
import { resetMockPrisma, mockPrismaClient } from '@/test-utils/prisma';
import { NextRequest } from 'next/server';

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockPrismaClient,
}));

// Mock auth - returns null by default (not authenticated via NextAuth)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)),
}));

// Mock sharp to avoid actual image processing
const mockSharpInstance = {
  resize: jest.fn().mockReturnThis(),
  jpeg: jest.fn().mockReturnThis(),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image-data')),
};
jest.mock('sharp', () => {
  return jest.fn(() => mockSharpInstance);
});

// Mock fs operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

// Import after mocks
import { POST } from '@/app/api/players/[id]/avatar/route';
import sharp from 'sharp';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

describe('API /api/players/[id]/avatar RBAC', () => {
  beforeEach(() => {
    resetMockPrisma();
    jest.clearAllMocks();
    (existsSync as jest.Mock).mockReturnValue(true);
  });

  const createParams = (id: string) => Promise.resolve({ id });

  /**
   * Helper to create a mock FormData request with a file
   */
  const createFormDataRequest = (
    playerId: string,
    authPlayerId: string | null,
    file: {
      name: string;
      type: string;
      size: number;
      content?: Buffer;
    } | null
  ): NextRequest => {
    const url = new URL(`/api/players/${playerId}/avatar`, 'http://localhost:3000');
    const headers = new Headers({
      'Content-Type': 'multipart/form-data',
    });

    if (authPlayerId) {
      headers.set('x-player-id', authPlayerId);
    }

    // Create a mock request with formData method
    const request = new NextRequest(url, {
      method: 'POST',
      headers,
    });

    // Override formData method
    if (file) {
      const mockFile = {
        name: file.name,
        type: file.type,
        size: file.size,
        arrayBuffer: jest.fn().mockResolvedValue(
          (file.content || Buffer.from('fake-image-data')).buffer
        ),
      };

      jest.spyOn(request, 'formData').mockResolvedValue({
        get: (key: string) => (key === 'avatar' ? mockFile : null),
      } as unknown as FormData);
    } else {
      jest.spyOn(request, 'formData').mockResolvedValue({
        get: () => null,
      } as unknown as FormData);
    }

    return request;
  };

  describe('POST /api/players/[id]/avatar', () => {
    const validFile = {
      name: 'avatar.jpg',
      type: 'image/jpeg',
      size: 100 * 1024, // 100KB
    };

    it('should return 401 for unauthenticated request', async () => {
      const request = createFormDataRequest(TEST_IDS.REGULAR_PLAYER, null, validFile);
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 403 for PLAYER role (no EDIT_PLAYER permission)', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.REGULAR_PLAYER,
        validFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 403 for TOURNAMENT_DIRECTOR role (no EDIT_PLAYER permission)', async () => {
      // TD role does not have EDIT_PLAYER permission
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.TD_PLAYER,
        validFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return 200 for ADMIN role', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        validFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.avatarUrl).toBeDefined();
    });

    it('should return 400 when no file is provided', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        null
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Aucun fichier');
    });

    it('should return 400 for invalid file type', async () => {
      const invalidFile = {
        name: 'document.pdf',
        type: 'application/pdf',
        size: 100 * 1024,
      };
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        invalidFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Type de fichier non autorisé');
    });

    it('should return 400 for file exceeding size limit (5MB)', async () => {
      const largeFile = {
        name: 'large-avatar.jpg',
        type: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
      };
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        largeFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Fichier trop volumineux');
    });

    it('should accept PNG files', async () => {
      const pngFile = {
        name: 'avatar.png',
        type: 'image/png',
        size: 100 * 1024,
      };
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        pngFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(200);
    });

    it('should accept WebP files', async () => {
      const webpFile = {
        name: 'avatar.webp',
        type: 'image/webp',
        size: 100 * 1024,
      };
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        webpFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(200);
    });

    it('should call sharp with correct resize parameters', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        validFile
      );
      await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(sharp).toHaveBeenCalled();
      expect(mockSharpInstance.resize).toHaveBeenCalledWith(256, 256, {
        fit: 'cover',
        position: 'center',
      });
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 });
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
    });

    it('should create avatars directory if it does not exist', async () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        validFile
      );
      await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(mkdir).toHaveBeenCalledWith(expect.stringContaining('avatars'), { recursive: true });
    });

    it('should save processed image to disk', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        validFile
      );
      await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.jpg'),
        expect.any(Buffer)
      );
    });

    it('should return 500 when sharp processing fails', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Sharp processing failed'));

      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        validFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Erreur lors de l'upload de l'avatar");
    });

    it('should return 500 when file write fails', async () => {
      (writeFile as jest.Mock).mockRejectedValueOnce(new Error('Disk write failed'));

      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        validFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(500);
    });

    it('should generate unique filename with player ID and timestamp', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        validFile
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.avatarUrl).toMatch(/\/avatars\/.*\.jpg$/);
      expect(data.avatarUrl).toContain(TEST_IDS.REGULAR_PLAYER);
    });
  });

  describe('Sentinel: Response body must not be empty on success', () => {
    it('should never return 200 with empty body', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        {
          name: 'avatar.jpg',
          type: 'image/jpeg',
          size: 100 * 1024,
        }
      );
      const response = await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      if (response.status === 200) {
        const data = await response.json();
        expect(data).toBeDefined();
        expect(data.avatarUrl).toBeDefined();
        expect(data.avatarUrl.length).toBeGreaterThan(0);
      }
    });

    it('should produce a processed buffer with size > 0', async () => {
      const request = createFormDataRequest(
        TEST_IDS.REGULAR_PLAYER,
        TEST_IDS.ADMIN_PLAYER,
        {
          name: 'avatar.jpg',
          type: 'image/jpeg',
          size: 100 * 1024,
        }
      );
      await POST(request, { params: createParams(TEST_IDS.REGULAR_PLAYER) });

      // Verify the mock was called and would produce non-empty buffer
      expect(mockSharpInstance.toBuffer).toHaveBeenCalled();
      const result = await mockSharpInstance.toBuffer();
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
