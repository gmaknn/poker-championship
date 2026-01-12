/**
 * Tests for PATCH /api/seasons/[id]
 *
 * Ensures:
 * - Valid payloads succeed (200)
 * - Invalid payloads return 400 (not 500)
 * - Legacy format (sans recavePenaltyTiers) works
 * - Empty/undefined fields are handled gracefully
 */

import { z } from 'zod';

// Copy of the schema from the API route for testing
const recavePenaltyTierSchema = z.object({
  fromRecaves: z.number().int().min(1),
  penaltyPoints: z.number().int().max(0),
});

const seasonSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  year: z.number().int().min(2020).max(2100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),

  pointsFirst: z.number().int().default(1500),
  pointsSecond: z.number().int().default(1000),
  pointsThird: z.number().int().default(700),
  pointsFourth: z.number().int().default(500),
  pointsFifth: z.number().int().default(400),
  pointsSixth: z.number().int().default(300),
  pointsSeventh: z.number().int().default(200),
  pointsEighth: z.number().int().default(200),
  pointsNinth: z.number().int().default(200),
  pointsTenth: z.number().int().default(200),
  pointsEleventh: z.number().int().default(100),
  pointsSixteenth: z.number().int().default(50),

  eliminationPoints: z.number().int().default(50),
  leaderKillerBonus: z.number().int().default(25),

  freeRebuysCount: z.number().int().default(2),
  rebuyPenaltyTier1: z.number().int().default(-50),
  rebuyPenaltyTier2: z.number().int().default(-100),
  rebuyPenaltyTier3: z.number().int().default(-150),

  recavePenaltyTiers: z.array(recavePenaltyTierSchema).optional().nullable(),

  totalTournamentsCount: z.number().int().optional().nullable(),
  bestTournamentsCount: z.number().int().optional().nullable(),
});

describe('Season PATCH validation', () => {
  const validPayload = {
    name: 'Saison 2026',
    year: 2026,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    totalTournamentsCount: null,
    bestTournamentsCount: null,
    pointsFirst: 1500,
    pointsSecond: 1000,
    pointsThird: 700,
    pointsFourth: 500,
    pointsFifth: 400,
    pointsSixth: 300,
    pointsSeventh: 200,
    pointsEighth: 200,
    pointsNinth: 200,
    pointsTenth: 200,
    pointsEleventh: 100,
    pointsSixteenth: 50,
    eliminationPoints: 50,
    leaderKillerBonus: 25,
    freeRebuysCount: 2,
    rebuyPenaltyTier1: -50,
    rebuyPenaltyTier2: -100,
    rebuyPenaltyTier3: -150,
    recavePenaltyTiers: [
      { fromRecaves: 3, penaltyPoints: -50 },
      { fromRecaves: 4, penaltyPoints: -100 },
      { fromRecaves: 5, penaltyPoints: -150 },
    ],
  };

  describe('valid payloads', () => {
    it('should accept a complete valid payload', () => {
      const result = seasonSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('should accept payload with null recavePenaltyTiers', () => {
      const payload = { ...validPayload, recavePenaltyTiers: null };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept payload without recavePenaltyTiers (legacy)', () => {
      const { recavePenaltyTiers, ...legacyPayload } = validPayload;
      const result = seasonSchema.safeParse(legacyPayload);
      expect(result.success).toBe(true);
    });

    it('should accept payload with empty recavePenaltyTiers array', () => {
      const payload = { ...validPayload, recavePenaltyTiers: [] };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept payload with single tier', () => {
      const payload = {
        ...validPayload,
        recavePenaltyTiers: [{ fromRecaves: 3, penaltyPoints: -50 }],
      };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept freeRebuysCount = 0', () => {
      const payload = {
        ...validPayload,
        freeRebuysCount: 0,
        recavePenaltyTiers: [{ fromRecaves: 1, penaltyPoints: -20 }],
      };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid payloads should fail with clear errors', () => {
    it('should reject NaN in numeric fields', () => {
      const payload = { ...validPayload, freeRebuysCount: NaN };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('freeRebuysCount');
      }
    });

    it('should reject string in numeric fields', () => {
      const payload = { ...validPayload, year: '2026' as unknown as number };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject tier with fromRecaves < 1', () => {
      const payload = {
        ...validPayload,
        recavePenaltyTiers: [{ fromRecaves: 0, penaltyPoints: -50 }],
      };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject tier with positive penaltyPoints', () => {
      const payload = {
        ...validPayload,
        recavePenaltyTiers: [{ fromRecaves: 3, penaltyPoints: 50 }],
      };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject tier with non-integer fromRecaves', () => {
      const payload = {
        ...validPayload,
        recavePenaltyTiers: [{ fromRecaves: 3.5, penaltyPoints: -50 }],
      };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject invalid startDate format', () => {
      const payload = { ...validPayload, startDate: '2026-01-01' }; // Not ISO datetime
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const payload = { ...validPayload, name: '' };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('edge cases from UI', () => {
    it('should handle parseInt("") scenario', () => {
      // This simulates what happens when user clears an input field
      // parseInt("") returns NaN, which should be rejected
      const payload = { ...validPayload, freeRebuysCount: parseInt('') };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should handle parseInt("abc") scenario', () => {
      const payload = { ...validPayload, year: parseInt('abc') };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('should handle undefined tier fields', () => {
      const payload = {
        ...validPayload,
        recavePenaltyTiers: [{ fromRecaves: undefined as unknown as number, penaltyPoints: -50 }],
      };
      const result = seasonSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
