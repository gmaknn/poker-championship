import {
  computeRecavePenalty,
  parseRecavePenaltyRules,
  generatePenaltyPreview,
  validateTierConfiguration,
  RecavePenaltyRules,
  RecavePenaltyTier,
} from '../scoring';

describe('computeRecavePenalty', () => {
  describe('with WPT Villelaure rules (freeRebuys=1, -50pts per paid rebuy)', () => {
    const wptRules: RecavePenaltyRules = {
      freeRebuysCount: 1,
      tiers: [
        { fromRecaves: 2, penaltyPoints: -50 },
      ],
    };

    it('should return 0 for 0 rebuys', () => {
      expect(computeRecavePenalty(0, wptRules)).toBe(0);
    });

    it('should return 0 for rebuys within free count (1 free)', () => {
      expect(computeRecavePenalty(1, wptRules)).toBe(0);
    });

    it('should return -50 for 2 rebuys (1 paid)', () => {
      expect(computeRecavePenalty(2, wptRules)).toBe(-50);
    });

    it('should return -100 for 3 rebuys (2 paid)', () => {
      expect(computeRecavePenalty(3, wptRules)).toBe(-100);
    });

    it('should return -150 for 4 rebuys (3 paid) - CUMULATIVE', () => {
      expect(computeRecavePenalty(4, wptRules)).toBe(-150);
    });

    it('should return -200 for 5 rebuys (4 paid)', () => {
      expect(computeRecavePenalty(5, wptRules)).toBe(-200);
    });

    // Bruno example: 4 rebuys + 1 light = -175 pts
    it('should handle Bruno example: 4 rebuys + 1 light = -175 pts', () => {
      // équivalentes = 4 + 0.5 = 4.5
      // payantes = max(0, 4.5 - 1) = 3.5
      // malus = round(3.5 × -50) = -175
      expect(computeRecavePenalty(4, wptRules, true)).toBe(-175);
    });
  });

  describe('with light rebuy (0.5 recave équivalente)', () => {
    const rules: RecavePenaltyRules = {
      freeRebuysCount: 1,
      tiers: [
        { fromRecaves: 2, penaltyPoints: -50 },
      ],
    };

    it('should return 0 for light only when within free count', () => {
      // 0 rebuy + light : équivalentes = 0.5, payantes = max(0, 0.5-1) = 0
      expect(computeRecavePenalty(0, rules, true)).toBe(0);
    });

    it('should return -25 for 1 rebuy + light (0.5 recave payante)', () => {
      // 1 rebuy + light : équivalentes = 1.5, payantes = max(0, 1.5-1) = 0.5
      // malus = round(0.5 × -50) = -25
      expect(computeRecavePenalty(1, rules, true)).toBe(-25);
    });

    it('should add light as 0.5 recave on top of paid rebuys', () => {
      // 2 rebuys + light : équivalentes = 2.5, payantes = 1.5, malus = -75
      expect(computeRecavePenalty(2, rules, true)).toBe(-75);
      // 3 rebuys + light : équivalentes = 3.5, payantes = 2.5, malus = -125
      expect(computeRecavePenalty(3, rules, true)).toBe(-125);
    });
  });

  describe('with freeRebuys=0 (malus from first rebuy)', () => {
    const zeroFreeRules: RecavePenaltyRules = {
      freeRebuysCount: 0,
      tiers: [
        { fromRecaves: 1, penaltyPoints: -50 },
      ],
    };

    it('should return 0 for 0 rebuys', () => {
      expect(computeRecavePenalty(0, zeroFreeRules)).toBe(0);
    });

    it('should return -50 for 1 rebuy (first rebuy is paid)', () => {
      expect(computeRecavePenalty(1, zeroFreeRules)).toBe(-50);
    });

    it('should return -100 for 2 rebuys (both paid)', () => {
      expect(computeRecavePenalty(2, zeroFreeRules)).toBe(-100);
    });

    it('should return -150 for 3 rebuys (all paid)', () => {
      expect(computeRecavePenalty(3, zeroFreeRules)).toBe(-150);
    });
  });

  describe('with freeRebuys=2', () => {
    const twoFreeRules: RecavePenaltyRules = {
      freeRebuysCount: 2,
      tiers: [
        { fromRecaves: 3, penaltyPoints: -50 },
      ],
    };

    it('should return 0 for 1 or 2 rebuys (both free)', () => {
      expect(computeRecavePenalty(1, twoFreeRules)).toBe(0);
      expect(computeRecavePenalty(2, twoFreeRules)).toBe(0);
    });

    it('should return -50 for 3 rebuys (1 paid)', () => {
      expect(computeRecavePenalty(3, twoFreeRules)).toBe(-50);
    });

    it('should return -100 for 4 rebuys (2 paid)', () => {
      expect(computeRecavePenalty(4, twoFreeRules)).toBe(-100);
    });
  });

  describe('edge cases', () => {
    it('should return 0 with empty tiers (fallback to -50 default)', () => {
      const emptyRules: RecavePenaltyRules = {
        freeRebuysCount: 1,
        tiers: [],
      };
      // With empty tiers, uses -50 default
      expect(computeRecavePenalty(2, emptyRules)).toBe(-50);
      expect(computeRecavePenalty(3, emptyRules)).toBe(-100);
    });

    it('should use first tier penaltyPoints as unit cost', () => {
      const customRules: RecavePenaltyRules = {
        freeRebuysCount: 1,
        tiers: [
          { fromRecaves: 2, penaltyPoints: -30 }, // -30 per paid rebuy
        ],
      };
      expect(computeRecavePenalty(2, customRules)).toBe(-30);  // 1 paid
      expect(computeRecavePenalty(3, customRules)).toBe(-60);  // 2 paid
      expect(computeRecavePenalty(4, customRules)).toBe(-90);  // 3 paid
    });
  });
});

describe('parseRecavePenaltyRules', () => {
  describe('with new format (recavePenaltyTiers)', () => {
    it('should parse valid tier array', () => {
      const season = {
        freeRebuysCount: 1,
        recavePenaltyTiers: [
          { fromRecaves: 2, penaltyPoints: -50 },
        ],
        rebuyPenaltyTier1: -50,
        rebuyPenaltyTier2: -100,
        rebuyPenaltyTier3: -150,
      };

      const rules = parseRecavePenaltyRules(season);

      expect(rules.freeRebuysCount).toBe(1);
      expect(rules.tiers).toEqual([
        { fromRecaves: 2, penaltyPoints: -50 },
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
  it('should generate preview for default range with CUMULATIVE logic', () => {
    const rules: RecavePenaltyRules = {
      freeRebuysCount: 1,
      tiers: [
        { fromRecaves: 2, penaltyPoints: -50 },
      ],
    };

    const preview = generatePenaltyPreview(rules);

    expect(preview).toEqual([
      { rebuys: 0, penalty: 0 },
      { rebuys: 1, penalty: 0 },     // free
      { rebuys: 2, penalty: -50 },   // 1 paid
      { rebuys: 3, penalty: -100 },  // 2 paid
      { rebuys: 4, penalty: -150 },  // 3 paid
      { rebuys: 5, penalty: -200 },  // 4 paid
      { rebuys: 6, penalty: -250 },  // 5 paid
      { rebuys: 7, penalty: -300 },  // 6 paid
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
    expect(preview[1]).toEqual({ rebuys: 1, penalty: -10 });
    expect(preview[2]).toEqual({ rebuys: 2, penalty: -20 });
    expect(preview[3]).toEqual({ rebuys: 3, penalty: -30 });
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
