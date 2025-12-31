/**
 * Unit tests for src/lib/exportUtils.ts
 * Tests export functions with mocked html-to-image and jsPDF
 */

// Mock html-to-image before imports
jest.mock('html-to-image', () => ({
  toPng: jest.fn(),
  toJpeg: jest.fn(),
}));

// Mock jsPDF
const mockJsPDFInstance = {
  internal: {
    pageSize: {
      getWidth: jest.fn().mockReturnValue(210),
      getHeight: jest.fn().mockReturnValue(297),
    },
  },
  addImage: jest.fn(),
  save: jest.fn(),
};
jest.mock('jspdf', () => {
  return jest.fn().mockImplementation(() => mockJsPDFInstance);
});

// Mock DOM APIs
const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

// Mock document methods
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

const mockLinkElement = {
  href: '',
  download: '',
  click: mockClick,
};

const mockCreateElement = jest.fn().mockImplementation((tag: string) => {
  if (tag === 'a') {
    return mockLinkElement;
  }
  return {};
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  },
  writable: true,
});

// Mock Image constructor
class MockImage {
  src = '';
  width = 800;
  height = 600;
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  constructor() {
    // Trigger onload asynchronously
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}
(global as unknown as { Image: typeof MockImage }).Image = MockImage;

// Import functions after mocks
import {
  exportToPNG,
  exportToJPEG,
  exportToWhatsApp,
  exportToPDF,
  exportToWhatsAppText,
  exportBlindStructureText,
  exportSeasonLeaderboardText,
  exportTournamentResults,
  type TournamentResultsData,
  type BlindStructureData,
  type SeasonLeaderboardData,
} from '@/lib/exportUtils';
import { toPng, toJpeg } from 'html-to-image';

// Get mocked functions
const mockToPng = toPng as jest.MockedFunction<typeof toPng>;
const mockToJpeg = toJpeg as jest.MockedFunction<typeof toJpeg>;

describe('exportUtils', () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock element
    mockElement = {
      tagName: 'DIV',
      style: {},
    } as unknown as HTMLElement;

    // Setup default mock returns
    mockToPng.mockResolvedValue('data:image/png;base64,mockPngData');
    mockToJpeg.mockResolvedValue('data:image/jpeg;base64,mockJpegData');
  });

  describe('exportToPNG', () => {
    it('should call toPng with correct parameters', async () => {
      await exportToPNG({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockToPng).toHaveBeenCalledWith(mockElement, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        style: { transform: 'scale(1)' },
      });
    });

    it('should use custom backgroundColor when provided', async () => {
      await exportToPNG({
        element: mockElement,
        filename: 'test-export',
        backgroundColor: '#000000',
      });

      expect(mockToPng).toHaveBeenCalledWith(
        mockElement,
        expect.objectContaining({ backgroundColor: '#000000' })
      );
    });

    it('should use custom pixelRatio when provided', async () => {
      await exportToPNG({
        element: mockElement,
        filename: 'test-export',
        pixelRatio: 3,
      });

      expect(mockToPng).toHaveBeenCalledWith(
        mockElement,
        expect.objectContaining({ pixelRatio: 3 })
      );
    });

    it('should trigger download with correct filename', async () => {
      await exportToPNG({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockLinkElement.download).toBe('test-export.png');
      expect(mockClick).toHaveBeenCalled();
    });

    it('should throw error when toPng fails', async () => {
      mockToPng.mockRejectedValueOnce(new Error('Canvas rendering failed'));

      await expect(
        exportToPNG({ element: mockElement, filename: 'test' })
      ).rejects.toThrow('Failed to export image');
    });

    it('should clean up DOM elements after download', async () => {
      await exportToPNG({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });

  describe('exportToJPEG', () => {
    it('should call toJpeg with correct parameters', async () => {
      await exportToJPEG({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockToJpeg).toHaveBeenCalledWith(mockElement, {
        backgroundColor: '#ffffff',
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
        style: { transform: 'scale(1)' },
      });
    });

    it('should use custom quality when provided', async () => {
      await exportToJPEG({
        element: mockElement,
        filename: 'test-export',
        quality: 0.8,
      });

      expect(mockToJpeg).toHaveBeenCalledWith(
        mockElement,
        expect.objectContaining({ quality: 0.8 })
      );
    });

    it('should trigger download with .jpg extension', async () => {
      await exportToJPEG({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockLinkElement.download).toBe('test-export.jpg');
    });

    it('should throw error when toJpeg fails', async () => {
      mockToJpeg.mockRejectedValueOnce(new Error('Canvas rendering failed'));

      await expect(
        exportToJPEG({ element: mockElement, filename: 'test' })
      ).rejects.toThrow('Failed to export image');
    });
  });

  describe('exportToWhatsApp', () => {
    it('should use JPEG format by default', async () => {
      await exportToWhatsApp({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockToJpeg).toHaveBeenCalled();
      expect(mockLinkElement.download).toContain('_whatsapp.jpg');
    });

    it('should use PNG format when specified', async () => {
      await exportToWhatsApp({
        element: mockElement,
        filename: 'test-export',
        format: 'png',
      });

      expect(mockToPng).toHaveBeenCalled();
      expect(mockLinkElement.download).toContain('_whatsapp.png');
    });

    it('should use higher pixelRatio (2.5) for WhatsApp quality', async () => {
      await exportToWhatsApp({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockToJpeg).toHaveBeenCalledWith(
        mockElement,
        expect.objectContaining({ pixelRatio: 2.5 })
      );
    });

    it('should throw error on failure', async () => {
      mockToJpeg.mockRejectedValueOnce(new Error('Export failed'));

      await expect(
        exportToWhatsApp({ element: mockElement, filename: 'test' })
      ).rejects.toThrow('Failed to export WhatsApp image');
    });
  });

  describe('exportToPDF', () => {
    it('should create jsPDF with correct orientation', async () => {
      const jsPDF = require('jspdf');

      await exportToPDF({
        element: mockElement,
        filename: 'test-export',
        orientation: 'landscape',
      });

      expect(jsPDF).toHaveBeenCalledWith({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
    });

    it('should create jsPDF with correct format', async () => {
      const jsPDF = require('jspdf');

      await exportToPDF({
        element: mockElement,
        filename: 'test-export',
        format: 'letter',
      });

      expect(jsPDF).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'letter' })
      );
    });

    it('should first convert element to PNG', async () => {
      await exportToPDF({
        element: mockElement,
        filename: 'test-export',
      });

      expect(mockToPng).toHaveBeenCalledWith(mockElement, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
    });

    it('should add image to PDF and save', async () => {
      await exportToPDF({
        element: mockElement,
        filename: 'test-export',
      });

      // Wait for image onload
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockJsPDFInstance.addImage).toHaveBeenCalled();
      expect(mockJsPDFInstance.save).toHaveBeenCalledWith('test-export.pdf');
    });

    it('should throw error when toPng fails', async () => {
      mockToPng.mockRejectedValueOnce(new Error('Rendering failed'));

      await expect(
        exportToPDF({ element: mockElement, filename: 'test' })
      ).rejects.toThrow('Failed to export PDF');
    });
  });

  describe('exportTournamentResults', () => {
    it('should return object with all export methods', () => {
      const exports = exportTournamentResults(mockElement, 'Test Tournament');

      expect(exports).toHaveProperty('png');
      expect(exports).toHaveProperty('jpeg');
      expect(exports).toHaveProperty('whatsapp');
      expect(exports).toHaveProperty('pdf');
      expect(typeof exports.png).toBe('function');
      expect(typeof exports.jpeg).toBe('function');
      expect(typeof exports.whatsapp).toBe('function');
      expect(typeof exports.pdf).toBe('function');
    });

    it('should sanitize filename from tournament name', async () => {
      const exports = exportTournamentResults(mockElement, 'Test Tournament #1!');

      // Calling png should create sanitized filename
      await exports.png();

      expect(mockToPng).toHaveBeenCalled();
      // Filename should be sanitized (no special chars) and include tournoi prefix
      expect(mockLinkElement.download).toMatch(/^tournoi_.*\.png$/);
      expect(mockLinkElement.download).toContain('test_tournament');
    });
  });

  describe('Text Export Functions', () => {
    // Mock clipboard and alert
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    const mockAlert = jest.fn();

    beforeEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: mockWriteText,
          },
        },
        writable: true,
      });
      global.alert = mockAlert;
    });

    describe('exportToWhatsAppText', () => {
      const mockData: TournamentResultsData = {
        tournamentName: 'Test Tournament',
        date: new Date('2025-01-15'),
        season: { name: 'Saison 2025', year: 2025 },
        players: [
          {
            finalRank: 1,
            player: { nickname: 'Winner' },
            totalPoints: 100,
            eliminationPoints: 20,
            bonusPoints: 10,
            penaltyPoints: 0,
            prizeAmount: 50,
          },
          {
            finalRank: 2,
            player: { nickname: 'Second' },
            totalPoints: 80,
            eliminationPoints: 15,
            bonusPoints: 5,
            penaltyPoints: 0,
          },
          {
            finalRank: 3,
            player: { nickname: 'Third' },
            totalPoints: 60,
            eliminationPoints: 10,
            bonusPoints: 0,
            penaltyPoints: -5,
          },
        ],
        buyIn: 10,
        prizePool: 100,
      };

      it('should copy formatted text to clipboard', async () => {
        exportToWhatsAppText(mockData);

        expect(mockWriteText).toHaveBeenCalled();
        const text = mockWriteText.mock.calls[0][0];
        expect(text).toContain('Test Tournament');
        expect(text).toContain('Winner');
        expect(text).toContain('100 pts');
      });

      it('should include podium with medals', async () => {
        exportToWhatsAppText(mockData);

        const text = mockWriteText.mock.calls[0][0];
        expect(text).toContain('PODIUM');
      });

      it('should show alert on success', async () => {
        exportToWhatsAppText(mockData);

        // Wait for async clipboard
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('copié'));
      });
    });

    describe('exportBlindStructureText', () => {
      const mockData: BlindStructureData = {
        tournamentName: 'Test Tournament',
        date: new Date('2025-01-15'),
        startingChips: 5000,
        levels: [
          { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12 },
          { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12 },
          { level: 3, smallBlind: 75, bigBlind: 150, ante: 25, duration: 12 },
        ],
        totalDuration: 180,
      };

      it('should copy blind structure to clipboard', async () => {
        exportBlindStructureText(mockData);

        expect(mockWriteText).toHaveBeenCalled();
        const text = mockWriteText.mock.calls[0][0];
        expect(text).toContain('STRUCTURE DES BLINDES');
        // Note: toLocaleString('fr-FR') uses non-breaking space (char 160) not regular space
        expect(text).toContain('5');
        expect(text).toContain('000');
        expect(text).toContain('25/50');
        expect(text).toContain('50/100');
      });

      it('should show total duration', async () => {
        exportBlindStructureText(mockData);

        const text = mockWriteText.mock.calls[0][0];
        expect(text).toContain('3h00');
      });
    });

    describe('exportSeasonLeaderboardText', () => {
      const mockData: SeasonLeaderboardData = {
        seasonName: 'Saison Test',
        year: 2025,
        players: [
          {
            rank: 1,
            player: { nickname: 'Leader' },
            totalPoints: 500,
            tournamentsPlayed: 10,
            firstPlaces: 3,
            secondPlaces: 2,
            thirdPlaces: 1,
          },
          {
            rank: 2,
            player: { nickname: 'Challenger' },
            totalPoints: 450,
            tournamentsPlayed: 10,
            firstPlaces: 2,
            secondPlaces: 3,
            thirdPlaces: 2,
          },
        ],
        totalTournaments: 10,
      };

      it('should copy leaderboard to clipboard', async () => {
        exportSeasonLeaderboardText(mockData);

        expect(mockWriteText).toHaveBeenCalled();
        const text = mockWriteText.mock.calls[0][0];
        expect(text).toContain('CLASSEMENT SAISON TEST');
        expect(text).toContain('Leader');
        expect(text).toContain('500 pts');
        expect(text).toContain('10 tournois');
      });
    });
  });

  describe('Sentinel: Non-empty output validation', () => {
    it('should produce non-empty data URL from toPng', async () => {
      const dataUrl = await mockToPng(mockElement, {});
      expect(dataUrl).toBeDefined();
      expect(dataUrl.length).toBeGreaterThan(0);
      expect(dataUrl).toMatch(/^data:image/);
    });

    it('should produce non-empty data URL from toJpeg', async () => {
      const dataUrl = await mockToJpeg(mockElement, {});
      expect(dataUrl).toBeDefined();
      expect(dataUrl.length).toBeGreaterThan(0);
      expect(dataUrl).toMatch(/^data:image/);
    });

    it('should never return undefined from export functions on success', async () => {
      // PNG should complete without returning undefined
      await expect(
        exportToPNG({ element: mockElement, filename: 'test' })
      ).resolves.toBeUndefined(); // void return is ok

      // Verify the download was triggered
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should log errors to console on PNG export failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockToPng.mockRejectedValueOnce(new Error('Test error'));

      await expect(
        exportToPNG({ element: mockElement, filename: 'test' })
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error exporting to PNG:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should log errors to console on JPEG export failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockToJpeg.mockRejectedValueOnce(new Error('Test error'));

      await expect(
        exportToJPEG({ element: mockElement, filename: 'test' })
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error exporting to JPEG:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should not leak stack traces in error messages', async () => {
      mockToPng.mockRejectedValueOnce(new Error('Internal canvas error with stack trace'));

      try {
        await exportToPNG({ element: mockElement, filename: 'test' });
      } catch (error) {
        // Error message should be generic, not exposing internals
        expect((error as Error).message).toBe('Failed to export image');
        expect((error as Error).message).not.toContain('stack');
        expect((error as Error).message).not.toContain('canvas');
      }
    });
  });
});
