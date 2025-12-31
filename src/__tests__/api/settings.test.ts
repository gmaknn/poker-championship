/**
 * Tests API /api/settings
 * Vérifie l'authentification et les permissions RBAC
 */

import { GET, PUT } from '@/app/api/settings/route';
import {
  createUnauthenticatedRequest,
  createRequestWithRole,
  parseJsonResponse,
} from '@/test-utils/test-utils';
import { mockPrismaResults, mockPlayerFindUnique } from '@/test-utils/mock-prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    player: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    settings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock NextAuth - retourne null par défaut (pas de session)
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configuration par défaut des mocks
    (mockPrisma.settings.findFirst as jest.Mock).mockResolvedValue(
      mockPrismaResults.settings
    );
    (mockPrisma.player.findUnique as jest.Mock).mockImplementation(
      ({ where }: { where: { id?: string } }) => {
        if (where.id) {
          return Promise.resolve(mockPlayerFindUnique(where.id));
        }
        return Promise.resolve(null);
      }
    );
    (mockPrisma.settings.create as jest.Mock).mockResolvedValue(
      mockPrismaResults.settings
    );
    (mockPrisma.settings.update as jest.Mock).mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => {
        return Promise.resolve({
          ...mockPrismaResults.settings,
          ...data,
          updatedAt: new Date(),
        });
      }
    );
  });

  describe('GET /api/settings', () => {
    describe('Accès public', () => {
      it('retourne 200 pour une requête non authentifiée', async () => {
        const response = await GET();
        const { status, data } = await parseJsonResponse(response);

        expect(status).toBe(200);
        expect(data).toHaveProperty('championshipName');
      });

      it('retourne les paramètres du championnat', async () => {
        const response = await GET();
        const { data } = await parseJsonResponse<{
          championshipName: string;
          clubName: string;
        }>(response);

        expect(data.championshipName).toBe('POKER CHAMPIONSHIP');
        expect(data.clubName).toBe('WPT VILLELAURE');
      });

      it('crée des paramètres par défaut si aucun n\'existe', async () => {
        (mockPrisma.settings.findFirst as jest.Mock).mockResolvedValueOnce(
          null
        );
        (mockPrisma.settings.create as jest.Mock).mockResolvedValueOnce(
          mockPrismaResults.settings
        );

        const response = await GET();
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
        expect(mockPrisma.settings.create).toHaveBeenCalled();
      });
    });

    describe('Accès authentifié par rôle', () => {
      it('ADMIN - accès OK (200)', async () => {
        const response = await GET();
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
      });

      it('PLAYER - accès OK (200) - route publique', async () => {
        const response = await GET();
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
      });
    });
  });

  describe('PUT /api/settings', () => {
    const validSettingsData = {
      championshipName: 'NOUVEAU CHAMPIONNAT',
      clubName: 'NOUVEAU CLUB',
      clubLogo: null,
      defaultBuyIn: 15,
      defaultStartingChips: 10000,
      defaultLevelDuration: 15,
      defaultTargetDuration: 240,
      enableEmailNotifications: true,
      enableSmsNotifications: false,
      theme: 'dark' as const,
      language: 'fr' as const,
    };

    describe('Protection authentification', () => {
      it('retourne 403 pour une requête non authentifiée', async () => {
        const request = createUnauthenticatedRequest(
          'http://localhost:3003/api/settings',
          { method: 'PUT', body: validSettingsData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        // La route retourne 403 car pas de player trouvé
        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });
    });

    describe('Protection RBAC', () => {
      it('ADMIN - peut modifier les paramètres (200)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'admin',
          { method: 'PUT', body: validSettingsData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{
          championshipName: string;
        }>(response);

        expect(status).toBe(200);
        expect(data.championshipName).toBe('NOUVEAU CHAMPIONNAT');
      });

      it('PLAYER - ne peut pas modifier les paramètres (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'player',
          { method: 'PUT', body: validSettingsData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });

      it('TOURNAMENT_DIRECTOR - ne peut pas modifier les paramètres (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'tournamentDirector',
          { method: 'PUT', body: validSettingsData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });

      it('ANIMATOR - ne peut pas modifier les paramètres (403)', async () => {
        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'animator',
          { method: 'PUT', body: validSettingsData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(403);
        expect(data.error).toBeDefined();
      });
    });

    describe('Validation des données', () => {
      it('retourne 400 si le nom du championnat est vide', async () => {
        const invalidData = {
          ...validSettingsData,
          championshipName: '', // Invalide - vide
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'admin',
          { method: 'PUT', body: invalidData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it('retourne 400 si le buy-in est négatif', async () => {
        const invalidData = {
          ...validSettingsData,
          defaultBuyIn: -5, // Invalide - négatif
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'admin',
          { method: 'PUT', body: invalidData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it('retourne 400 si le thème est invalide', async () => {
        const invalidData = {
          ...validSettingsData,
          theme: 'invalid-theme', // Invalide
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'admin',
          { method: 'PUT', body: invalidData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it('retourne 400 si la langue est invalide', async () => {
        const invalidData = {
          ...validSettingsData,
          language: 'es', // Invalide - seul fr/en accepté
        };

        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'admin',
          { method: 'PUT', body: invalidData }
        );

        const response = await PUT(request);
        const { status, data } = await parseJsonResponse<{ error: string }>(
          response
        );

        expect(status).toBe(400);
        expect(data.error).toBeDefined();
      });
    });

    describe('Création automatique', () => {
      it('crée les paramètres si inexistants lors du PUT', async () => {
        (mockPrisma.settings.findFirst as jest.Mock).mockResolvedValueOnce(
          null
        );
        (mockPrisma.settings.create as jest.Mock).mockResolvedValueOnce({
          ...mockPrismaResults.settings,
          ...validSettingsData,
        });

        const request = createRequestWithRole(
          'http://localhost:3003/api/settings',
          'admin',
          { method: 'PUT', body: validSettingsData }
        );

        const response = await PUT(request);
        const { status } = await parseJsonResponse(response);

        expect(status).toBe(200);
        expect(mockPrisma.settings.create).toHaveBeenCalled();
      });
    });
  });
});
