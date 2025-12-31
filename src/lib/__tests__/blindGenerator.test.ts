/**
 * Tests for blind structure generation logic
 * Critical for tournament setup - prevents broken blind structures
 */

import {
  generateBlindStructure,
  calculateBlindStats,
  validateBlindStructure,
  PRESET_STRUCTURES,
  BlindLevel,
} from '../blindGenerator';

describe('blindGenerator', () => {
  describe('generateBlindStructure', () => {
    it('should generate correct number of levels based on duration', () => {
      const levels = generateBlindStructure({
        startingChips: 5000,
        targetDuration: 180,
        levelDuration: 15,
      });

      expect(levels.length).toBe(12); // 180 / 15 = 12 levels
    });

    it('should start with correct BB relative to starting chips', () => {
      const levels = generateBlindStructure({
        startingChips: 5000,
        targetDuration: 120,
        levelDuration: 10,
      });

      // Default starting BB = startingChips / 250 = 20
      expect(levels[0].bigBlind).toBe(20);
      expect(levels[0].smallBlind).toBe(10);
    });

    it('should respect custom starting BB', () => {
      const levels = generateBlindStructure({
        startingChips: 5000,
        targetDuration: 120,
        levelDuration: 10,
        startingBB: 50,
      });

      expect(levels[0].bigBlind).toBe(50);
      expect(levels[0].smallBlind).toBe(25);
    });

    it('should have increasing blinds across levels', () => {
      const levels = generateBlindStructure({
        startingChips: 5000,
        targetDuration: 180,
        levelDuration: 15,
      });

      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].bigBlind).toBeGreaterThan(levels[i - 1].bigBlind);
      }
    });

    it('should have sequential level numbers', () => {
      const levels = generateBlindStructure({
        startingChips: 5000,
        targetDuration: 120,
        levelDuration: 10,
      });

      levels.forEach((level, index) => {
        expect(level.level).toBe(index + 1);
      });
    });

    it('should not add antes by default (anteStartLevel=999)', () => {
      const levels = generateBlindStructure({
        startingChips: 5000,
        targetDuration: 180,
        levelDuration: 15,
      });

      levels.forEach((level) => {
        expect(level.ante).toBe(0);
      });
    });
  });

  describe('PRESET_STRUCTURES', () => {
    it('turbo should generate ~2h structure with 8min levels', () => {
      const levels = PRESET_STRUCTURES.turbo(5000);
      const stats = calculateBlindStats(levels, 5000);

      expect(stats.totalDuration).toBe(120); // 2 hours
      expect(levels[0].duration).toBe(8);
    });

    it('standard should generate ~3h structure with 12min levels', () => {
      const levels = PRESET_STRUCTURES.standard(5000);
      const stats = calculateBlindStats(levels, 5000);

      expect(stats.totalDuration).toBe(180); // 3 hours
      expect(levels[0].duration).toBe(12);
    });

    it('deep should generate ~4h structure with 15min levels', () => {
      const levels = PRESET_STRUCTURES.deep(5000);
      const stats = calculateBlindStats(levels, 5000);

      expect(stats.totalDuration).toBe(240); // 4 hours
      expect(levels[0].duration).toBe(15);
    });
  });

  describe('validateBlindStructure', () => {
    it('should validate a correct structure', () => {
      const levels = generateBlindStructure({
        startingChips: 5000,
        targetDuration: 120,
        levelDuration: 10,
      });

      const result = validateBlindStructure(levels);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty structure', () => {
      const result = validateBlindStructure([]);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La structure doit contenir au moins un niveau');
    });

    it('should detect non-increasing blinds', () => {
      const badLevels: BlindLevel[] = [
        { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 10 },
        { level: 2, smallBlind: 5, bigBlind: 10, ante: 0, duration: 10 }, // decreasing!
      ];

      const result = validateBlindStructure(badLevels);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("n'augmente pas"))).toBe(true);
    });

    it('should detect wrong level numbers', () => {
      const badLevels: BlindLevel[] = [
        { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 10 },
        { level: 5, smallBlind: 15, bigBlind: 30, ante: 0, duration: 10 }, // wrong level number
      ];

      const result = validateBlindStructure(badLevels);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('numéro incorrect'))).toBe(true);
    });
  });

  describe('calculateBlindStats', () => {
    it('should calculate correct stats', () => {
      const levels = PRESET_STRUCTURES.standard(5000);
      const stats = calculateBlindStats(levels, 5000);

      expect(stats.totalLevels).toBe(levels.length);
      expect(stats.totalDuration).toBe(180);
      expect(stats.startingBB).toBe(levels[0].bigBlind);
      expect(stats.endingBB).toBe(levels[levels.length - 1].bigBlind);
      expect(stats.startingStackBB).toBe(Math.floor(5000 / levels[0].bigBlind));
    });
  });
});
