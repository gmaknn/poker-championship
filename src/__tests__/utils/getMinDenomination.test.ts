import { getMinDenomination } from '@/lib/utils';

describe('getMinDenomination', () => {
  describe('returns null for invalid inputs', () => {
    it('should return null for empty array', () => {
      expect(getMinDenomination([])).toBeNull();
    });

    it('should return null for array with only undefined', () => {
      expect(getMinDenomination([undefined, undefined])).toBeNull();
    });

    it('should return null for array with only null', () => {
      expect(getMinDenomination([null, null])).toBeNull();
    });

    it('should return null for array with only NaN', () => {
      expect(getMinDenomination([NaN, NaN])).toBeNull();
    });

    it('should return null for array with only Infinity', () => {
      expect(getMinDenomination([Infinity, -Infinity])).toBeNull();
    });

    it('should return null for array with only non-positive numbers', () => {
      expect(getMinDenomination([0, -5, -100])).toBeNull();
    });

    it('should return null for array with only non-numeric strings', () => {
      expect(getMinDenomination(['abc', 'def'])).toBeNull();
    });
  });

  describe('returns correct minimum for valid inputs', () => {
    it('should return minimum for array of positive numbers', () => {
      expect(getMinDenomination([25, 100, 500])).toBe(25);
    });

    it('should return minimum for array of string numbers', () => {
      expect(getMinDenomination(['25', '100', '500'])).toBe(25);
    });

    it('should return minimum for mixed string and number array', () => {
      expect(getMinDenomination(['50', 25, '100'])).toBe(25);
    });

    it('should return the only valid number when others are invalid', () => {
      expect(getMinDenomination([undefined, null, 50, NaN, Infinity])).toBe(50);
    });

    it('should handle single element array', () => {
      expect(getMinDenomination([100])).toBe(100);
    });

    it('should handle large numbers', () => {
      expect(getMinDenomination([1000000, 500000, 100000])).toBe(100000);
    });

    it('should handle decimal numbers', () => {
      expect(getMinDenomination([0.5, 1, 2.5])).toBe(0.5);
    });
  });

  describe('edge cases', () => {
    it('should filter out zero values', () => {
      expect(getMinDenomination([0, 25, 50])).toBe(25);
    });

    it('should filter out negative values', () => {
      expect(getMinDenomination([-10, 25, 50])).toBe(25);
    });

    it('should handle Object.keys output (strings)', () => {
      const distribution = { '25': 10, '100': 20, '500': 5 };
      const denominations = Object.keys(distribution);
      expect(getMinDenomination(denominations)).toBe(25);
    });

    it('should handle empty object keys', () => {
      const distribution = {};
      const denominations = Object.keys(distribution);
      expect(getMinDenomination(denominations)).toBeNull();
    });
  });
});
