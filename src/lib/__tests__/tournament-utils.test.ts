import { areRecavesOpen } from '../tournament-utils';

describe('areRecavesOpen', () => {
  it('should return false when tournament is not IN_PROGRESS', () => {
    expect(areRecavesOpen({ status: 'PLANNED', currentLevel: 1, rebuyEndLevel: 5 })).toBe(false);
    expect(areRecavesOpen({ status: 'FINISHED', currentLevel: 1, rebuyEndLevel: 5 })).toBe(false);
    expect(areRecavesOpen({ status: 'CANCELLED', currentLevel: 1, rebuyEndLevel: 5 })).toBe(false);
  });

  it('should return true when rebuyEndLevel is null (unlimited rebuys)', () => {
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 1, rebuyEndLevel: null })).toBe(true);
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 10, rebuyEndLevel: null })).toBe(true);
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 100, rebuyEndLevel: null })).toBe(true);
  });

  it('should return true when currentLevel <= rebuyEndLevel', () => {
    // Exactly at rebuyEndLevel
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 2, rebuyEndLevel: 2 })).toBe(true);
    // Below rebuyEndLevel
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 1, rebuyEndLevel: 2 })).toBe(true);
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 1, rebuyEndLevel: 5 })).toBe(true);
  });

  it('should return false when currentLevel > rebuyEndLevel (CRITICAL - bug fix validation)', () => {
    // This is the main bug scenario: rebuyEndLevel=2, currentLevel=3
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 3, rebuyEndLevel: 2 })).toBe(false);

    // Other scenarios
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 4, rebuyEndLevel: 2 })).toBe(false);
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 6, rebuyEndLevel: 5 })).toBe(false);
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 10, rebuyEndLevel: 5 })).toBe(false);
  });

  it('should handle edge cases', () => {
    // rebuyEndLevel = 0 (no rebuys allowed at all)
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 1, rebuyEndLevel: 0 })).toBe(false);

    // Very high levels
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 50, rebuyEndLevel: 50 })).toBe(true);
    expect(areRecavesOpen({ status: 'IN_PROGRESS', currentLevel: 51, rebuyEndLevel: 50 })).toBe(false);
  });
});
