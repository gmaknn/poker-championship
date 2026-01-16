/**
 * Tests for tournament-utils.ts
 * Specifically for areRecavesOpen() function with break-after-rebuyEndLevel rule
 */

import { areRecavesOpen, calculateEffectiveLevel, isBreakAfterRebuyEnd } from '../tournament-utils';

describe('areRecavesOpen', () => {
  describe('Basic rules', () => {
    it('should return false when tournament is not IN_PROGRESS', () => {
      const tournament = {
        status: 'PLANNED',
        currentLevel: 3,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament, 3)).toBe(false);
    });

    it('should return false when tournament is FINISHED', () => {
      const tournament = {
        status: 'FINISHED',
        currentLevel: 3,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament, 3)).toBe(false);
    });

    it('should return true when rebuyEndLevel is null (unlimited)', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 10,
        rebuyEndLevel: null,
      };

      expect(areRecavesOpen(tournament, 10)).toBe(true);
    });

    it('should return true when effectiveLevel < rebuyEndLevel', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 3,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament, 3)).toBe(true);
    });

    it('should return true when effectiveLevel == rebuyEndLevel', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 5,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament, 5)).toBe(true);
    });

    it('should return false when effectiveLevel > rebuyEndLevel (no blindLevels)', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 6,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament, 6)).toBe(false);
    });
  });

  describe('Break-after-rebuyEndLevel rule', () => {
    const blindLevels = [
      { level: 1, isBreak: false },
      { level: 2, isBreak: false },
      { level: 3, isBreak: false },
      { level: 4, isBreak: false },
      { level: 5, isBreak: false }, // rebuyEndLevel
      { level: 6, isBreak: true },  // Break after rebuyEndLevel - recaves should stay open
      { level: 7, isBreak: false },
      { level: 8, isBreak: false },
    ];

    it('should return true when on break immediately after rebuyEndLevel', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 6, // During break
        rebuyEndLevel: 5,
      };

      // Level 6 is a break, immediately after rebuyEndLevel 5
      expect(areRecavesOpen(tournament, 6, blindLevels)).toBe(true);
    });

    it('should return false on level 7 (after the break)', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 7,
        rebuyEndLevel: 5,
      };

      // Level 7 is not a break and is beyond rebuyEndLevel + 1
      expect(areRecavesOpen(tournament, 7, blindLevels)).toBe(false);
    });

    it('should return false on level 6 if it is NOT a break', () => {
      const blindLevelsNoBreak = [
        { level: 1, isBreak: false },
        { level: 2, isBreak: false },
        { level: 3, isBreak: false },
        { level: 4, isBreak: false },
        { level: 5, isBreak: false },
        { level: 6, isBreak: false }, // No break after rebuyEndLevel
        { level: 7, isBreak: false },
      ];

      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 6,
        rebuyEndLevel: 5,
      };

      // Level 6 is NOT a break, so recaves should be closed
      expect(areRecavesOpen(tournament, 6, blindLevelsNoBreak)).toBe(false);
    });

    it('should return false without blindLevels parameter even on level 6', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 6,
        rebuyEndLevel: 5,
      };

      // Without blindLevels, we can't check if it's a break
      expect(areRecavesOpen(tournament, 6)).toBe(false);
    });

    it('should use effectiveLevel parameter over currentLevel', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 3, // DB says 3
        rebuyEndLevel: 5,
      };

      // effectiveLevel 6 (on break) should override currentLevel 3
      expect(areRecavesOpen(tournament, 6, blindLevels)).toBe(true);
    });

    it('should return true on rebuyEndLevel with blindLevels', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 5,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament, 5, blindLevels)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty blindLevels array', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 6,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament, 6, [])).toBe(false);
    });

    it('should handle blindLevels without level 6', () => {
      const blindLevels = [
        { level: 1, isBreak: false },
        { level: 2, isBreak: false },
        { level: 3, isBreak: false },
        { level: 4, isBreak: false },
        { level: 5, isBreak: false },
        // Missing level 6
      ];

      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 6,
        rebuyEndLevel: 5,
      };

      // Level 6 doesn't exist in blindLevels, so can't be a break
      expect(areRecavesOpen(tournament, 6, blindLevels)).toBe(false);
    });

    it('should use currentLevel from tournament if effectiveLevel is not provided', () => {
      const tournament = {
        status: 'IN_PROGRESS',
        currentLevel: 3,
        rebuyEndLevel: 5,
      };

      expect(areRecavesOpen(tournament)).toBe(true);
    });
  });
});

describe('calculateEffectiveLevel', () => {
  const blindLevels = [
    { level: 1, duration: 12 }, // 12 min = 720 sec
    { level: 2, duration: 12 },
    { level: 3, duration: 12 },
    { level: 4, duration: 12 },
    { level: 5, duration: 12 },
  ];

  it('should return level 1 when no time elapsed', () => {
    const tournament = {
      timerStartedAt: null,
      timerPausedAt: null,
      timerElapsedSeconds: 0,
    };

    expect(calculateEffectiveLevel(tournament, blindLevels)).toBe(1);
  });

  it('should return level 2 after 720 seconds (12 minutes)', () => {
    const tournament = {
      timerStartedAt: null,
      timerPausedAt: null,
      timerElapsedSeconds: 720, // Exactly 12 minutes
    };

    expect(calculateEffectiveLevel(tournament, blindLevels)).toBe(2);
  });

  it('should return level 3 after 1440 seconds (24 minutes)', () => {
    const tournament = {
      timerStartedAt: null,
      timerPausedAt: null,
      timerElapsedSeconds: 1440, // Exactly 24 minutes
    };

    expect(calculateEffectiveLevel(tournament, blindLevels)).toBe(3);
  });

  it('should not exceed max level', () => {
    const tournament = {
      timerStartedAt: null,
      timerPausedAt: null,
      timerElapsedSeconds: 10000, // Way past all levels
    };

    expect(calculateEffectiveLevel(tournament, blindLevels)).toBe(5);
  });

  it('should calculate additional time from running timer', () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 720 * 1000); // Started 720 seconds ago

    const tournament = {
      timerStartedAt: startTime,
      timerPausedAt: null,
      timerElapsedSeconds: 0,
    };

    expect(calculateEffectiveLevel(tournament, blindLevels)).toBe(2);
  });

  it('should not add time when timer is paused', () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - 1000 * 1000);
    const pausedTime = new Date(now.getTime() - 500 * 1000);

    const tournament = {
      timerStartedAt: startTime,
      timerPausedAt: pausedTime,
      timerElapsedSeconds: 500, // Paused at 500 seconds
    };

    expect(calculateEffectiveLevel(tournament, blindLevels)).toBe(1);
  });
});

describe('isBreakAfterRebuyEnd', () => {
  const blindLevels = [
    { level: 1, isBreak: false },
    { level: 2, isBreak: true },  // Break after level 1
    { level: 3, isBreak: false },
    { level: 4, isBreak: false },
  ];

  it('should return true when on break immediately after rebuyEndLevel', () => {
    // rebuyEndLevel = 1, effectiveLevel = 2 (break)
    expect(isBreakAfterRebuyEnd(1, 2, blindLevels)).toBe(true);
  });

  it('should return false when level is not a break', () => {
    // rebuyEndLevel = 2, effectiveLevel = 3 (not a break)
    expect(isBreakAfterRebuyEnd(2, 3, blindLevels)).toBe(false);
  });

  it('should return false when not immediately after rebuyEndLevel', () => {
    // rebuyEndLevel = 1, effectiveLevel = 3 (2 levels after)
    expect(isBreakAfterRebuyEnd(1, 3, blindLevels)).toBe(false);
  });

  it('should return false when rebuyEndLevel is null', () => {
    expect(isBreakAfterRebuyEnd(null, 2, blindLevels)).toBe(false);
  });

  it('should return false when on rebuyEndLevel itself', () => {
    // rebuyEndLevel = 1, effectiveLevel = 1 (same level)
    expect(isBreakAfterRebuyEnd(1, 1, blindLevels)).toBe(false);
  });

  it('should return false when blind level not found', () => {
    const limitedBlindLevels = [
      { level: 1, isBreak: false },
    ];
    // Level 2 doesn't exist
    expect(isBreakAfterRebuyEnd(1, 2, limitedBlindLevels)).toBe(false);
  });
});
