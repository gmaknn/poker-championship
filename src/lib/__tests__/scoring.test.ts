import {
  computeRecavePenalty,
  parseRecavePenaltyRules,
  generatePenaltyPreview,
  validateTierConfiguration,
  RecavePenaltyRules,
  RecavePenaltyTier,
} from '../scoring';

describe('computeRecavePenalty', () => {
  describe('with standard rules (freeRebuys=2)', () => {
    const standardRules: RecavePenaltyRules = {
      freeRebuysCount: 2,
      tiers: [
        { fromRecaves: 3, penaltyPoints: -50 },
        { fromRecaves: 4, penaltyPoints: -100 },
        { fromRecaves: 5, penaltyPoints: -150 },
      ],
    };

    it('should return 0 for 0 rebuys', () => {
      expect(computeRecavePenalty(0, standardRules)).toBe(0);
    });

    it('should return 0 for rebuys within free count', () => {
      expect(computeRecavePenalty(1, standardRules)).toBe(0);
      expect(computeRecavePenalty(2, standardRules)).toBe(0);
    });

    it('should return tier1 penalty for 3 rebuys', () => {
      expect(computeRecavePenalty(3, standardRules)).toBe(-50);
    });

    it('should return tier2 penalty for 4 rebuys', () => {
      expect(computeRecavePenalty(4, standardRules)).toBe(-100);
    });

    it('should return tier3 penalty for 5+ rebuys (NON-CUMULATIVE)', () => {
      expect(computeRecavePenalty(5, standardRules)).toBe(-150);
      expect(computeRecavePenalty(6, standardRules)).toBe(-150);
      expect(computeRecavePenalty(10, standardRules)).toBe(-150);
    });
  });

  describe('with freeRebuys=0 (malus from first rebuy)', () => {
    const zeroFreeRules: RecavePenaltyRules = {
      freeRebuysCount: 0,
      tiers: [
        { fromRecaves: 1, penaltyPoints: -20 },
        { fromRecaves: 2, penaltyPoints: -50 },
        { fromRecaves: 3, penaltyPoints: -100 },
      ],
    };

    it('should return 0 for 0 rebuys', () => {
      expect(computeRecavePenalty(0, zeroFreeRules)).toBe(0);
    });

    it('should return penalty from first rebuy', () => {
      expect(computeRecavePenalty(1, zeroFreeRules)).toBe(-20);
    });

    it('should return higher tier for more rebuys', () => {
      expect(computeRecavePenalty(2, zeroFreeRules)).toBe(-50);
      expect(computeRecavePenalty(3, zeroFreeRules)).toBe(-100);
      expect(computeRecavePenalty(5, zeroFreeRules)).toBe(-100);
    });
  });

  describe('with custom tier gaps', () => {
    const gappedRules: RecavePenaltyRules = {
      freeRebuysCount: 1,
      tiers: [
        { fromRecaves: 2, penaltyPoints: -30 },
        { fromRecaves: 5, penaltyPoints: -80 },
        { fromRecaves: 10, penaltyPoints: -200 },
      ],
    };

    it('should handle gaps correctly', () => {
      expect(computeRecavePenalty(1, gappedRules)).toBe(0);    // free
      expect(computeRecavePenalty(2, gappedRules)).toBe(-30);  // tier1
      expect(computeRecavePenalty(3, gappedRules)).toBe(-30);  // still tier1
      expect(computeRecavePenalty(4, gappedRules)).toBe(-30);  // still tier1
      expect(computeRecavePenalty(5, gappedRules)).toBe(-80);  // tier2
      expect(computeRecavePenalty(9, gappedRules)).toBe(-80);  // still tier2
      expect(computeRecavePenalty(10, gappedRules)).toBe(-200); // tier3
      expect(computeRecavePenalty(15, gappedRules)).toBe(-200); // still tier3
    });
  });

  describe('edge cases', () => {
    it('should return 0 with empty tiers', () => {
      const emptyRules: RecavePenaltyRules = {
        freeRebuysCount: 2,
        tiers: [],
      };
      expect(computeRecavePenalty(5, emptyRules)).toBe(0);
    });

    it('should handle single tier', () => {
      const singleTierRules: RecavePenaltyRules = {
        freeRebuysCount: 0,
        tiers: [{ fromRecaves: 3, penaltyPoints: -100 }],
      };
      expect(computeRecavePenalty(1, singleTierRules)).toBe(0);
      expect(computeRecavePenalty(2, singleTierRules)).toBe(0);
      expect(computeRecavePenalty(3, singleTierRules)).toBe(-100);
      expect(computeRecavePenalty(5, singleTierRules)).toBe(-100);
    });

    it('should handle unsorted tiers (sorts internally)', () => {
      const unsortedRules: RecavePenaltyRules = {
        freeRebuysCount: 0,
        tiers: [
          { fromRecaves: 5, penaltyPoints: -150 },
          { fromRecaves: 2, penaltyPoints: -50 },
          { fromRecaves: 3, penaltyPoints: -100 },
        ],
      };
      expect(computeRecavePenalty(2, unsortedRules)).toBe(-50);
      expect(computeRecavePenalty(3, unsortedRules)).toBe(-100);
      expect(computeRecavePenalty(5, unsortedRules)).toBe(-150);
    });
  });
});

describe('parseRecavePenaltyRules', () => {
  describe('with new format (recavePenaltyTiers)', () => {
    it('should parse valid tier array', () => {
      const season = {
        freeRebuysCount: 1,
        recavePenaltyTiers: [
          { fromRecaves: 2, penaltyPoints: -30 },
          { fromRecaves: 4, penaltyPoints: -80 },
        ],
        rebuyPenaltyTier1: -50,
        rebuyPenaltyTier2: -100,
        rebuyPenaltyTier3: -150,
      };

      const rules = parseRecavePenaltyRules(season);

      expect(rules.freeRebuysCount).toBe(1);
      expect(rules.tiers).toEqual([
        { fromRecaves: 2, penaltyPoints: -30 },
        { fromRecaves: 4, penaltyPoints: -80 },
      ]);
    });
  });

  describe('with legacy format (fallback)', () => {
    it('should convert legacy fields to tiers', () => {
      const season = {
        freeRebuysCount: 2,
        recavePenaltyTiers: null,
        rebuyPenaltyTier1: -50,
        rebuyPenaltyTier2: -100,
        rebuyPenaltyTier3: -150,
      };

      const rules = parseRecavePenaltyRules(season);

      expect(rules.freeRebuysCount).toBe(2);
      expect(rules.tiers).toEqual([
        { fromRecaves: 3, penaltyPoints: -50 },  // freeCount + 1
        { fromRecaves: 4, penaltyPoints: -100 }, // freeCount + 2
        { fromRecaves: 5, penaltyPoints: -150 }, // freeCount + 3
      ]);
    });

    it('should handle freeRebuysCount=0 in legacy mode', () => {
      const season = {
        freeRebuysCount: 0,
        recavePenaltyTiers: undefined,
        rebuyPenaltyTier1: -25,
        rebuyPenaltyTier2: -50,
        rebuyPenaltyTier3: -100,
      };

      const rules = parseRecavePenaltyRules(season);

      expect(rules.tiers).toEqual([
        { fromRecaves: 1, penaltyPoints: -25 },
        { fromRecaves: 2, penaltyPoints: -50 },
        { fromRecaves: 3, penaltyPoints: -100 },
      ]);
    });
  });

  describe('with invalid new format (fallback to legacy)', () => {
    it('should fallback when tiers has wrong structure', () => {
      const season = {
        freeRebuysCount: 2,
        recavePenaltyTiers: [{ wrong: 'format' }],
        rebuyPenaltyTier1: -50,
        rebuyPenaltyTier2: -100,
        rebuyPenaltyTier3: -150,
      };

      const rules = parseRecavePenaltyRules(season);

      // Should use legacy format
      expect(rules.tiers).toEqual([
        { fromRecaves: 3, penaltyPoints: -50 },
        { fromRecaves: 4, penaltyPoints: -100 },
        { fromRecaves: 5, penaltyPoints: -150 },
      ]);
    });

    it('should fallback when fromRecaves is negative', () => {
      const season = {
        freeRebuysCount: 2,
        recavePenaltyTiers: [{ fromRecaves: -1, penaltyPoints: -50 }],
        rebuyPenaltyTier1: -50,
        rebuyPenaltyTier2: -100,
        rebuyPenaltyTier3: -150,
      };

      const rules = parseRecavePenaltyRules(season);

      // Should use legacy format
      expect(rules.tiers[0].fromRecaves).toBe(3);
    });
  });
});

describe('generatePenaltyPreview', () => {
  it('should generate preview for default range', () => {
    const rules: RecavePenaltyRules = {
      freeRebuysCount: 2,
      tiers: [
        { fromRecaves: 3, penaltyPoints: -50 },
        { fromRecaves: 5, penaltyPoints: -100 },
      ],
    };

    const preview = generatePenaltyPreview(rules);

    expect(preview).toEqual([
      { rebuys: 0, penalty: 0 },
      { rebuys: 1, penalty: 0 },
      { rebuys: 2, penalty: 0 },
      { rebuys: 3, penalty: -50 },
      { rebuys: 4, penalty: -50 },
      { rebuys: 5, penalty: -100 },
      { rebuys: 6, penalty: -100 },
      { rebuys: 7, penalty: -100 },
    ]);
  });

  it('should respect custom maxRebuys', () => {
    const rules: RecavePenaltyRules = {
      freeRebuysCount: 0,
      tiers: [{ fromRecaves: 1, penaltyPoints: -10 }],
    };

    const preview = generatePenaltyPreview(rules, 3);

    expect(preview).toHaveLength(4); // 0, 1, 2, 3
    expect(preview[0]).toEqual({ rebuys: 0, penalty: 0 });
    expect(preview[3]).toEqual({ rebuys: 3, penalty: -10 });
  });
});

describe('validateTierConfiguration', () => {
  it('should return empty array for valid configuration', () => {
    const tiers: RecavePenaltyTier[] = [
      { fromRecaves: 3, penaltyPoints: -50 },
      { fromRecaves: 5, penaltyPoints: -100 },
    ];

    const errors = validateTierConfiguration(2, tiers);

    expect(errors).toEqual([]);
  });

  it('should error on empty tiers', () => {
    const errors = validateTierConfiguration(2, []);

    expect(errors).toContain('Au moins un palier de malus est requis');
  });

  it('should error when fromRecaves <= freeRebuysCount', () => {
    const tiers: RecavePenaltyTier[] = [
      { fromRecaves: 2, penaltyPoints: -50 },
    ];

    const errors = validateTierConfiguration(2, tiers);

    expect(errors.some(e => e.includes('doit être > recaves gratuites'))).toBe(true);
  });

  it('should error on positive penaltyPoints', () => {
    const tiers: RecavePenaltyTier[] = [
      { fromRecaves: 3, penaltyPoints: 50 },
    ];

    const errors = validateTierConfiguration(2, tiers);

    expect(errors.some(e => e.includes('malus doit être <= 0'))).toBe(true);
  });

  it('should error on duplicate fromRecaves', () => {
    const tiers: RecavePenaltyTier[] = [
      { fromRecaves: 3, penaltyPoints: -50 },
      { fromRecaves: 3, penaltyPoints: -100 },
    ];

    const errors = validateTierConfiguration(2, tiers);

    expect(errors.some(e => e.includes('Palier en double'))).toBe(true);
  });

  it('should error when fromRecaves < 1', () => {
    const tiers: RecavePenaltyTier[] = [
      { fromRecaves: 0, penaltyPoints: -50 },
    ];

    const errors = validateTierConfiguration(0, tiers);

    expect(errors.some(e => e.includes('>= 1'))).toBe(true);
  });
});
