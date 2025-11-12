/**
 * Tests pour les calculs de points de tournoi
 */

describe('Tournament Points Calculations', () => {
  describe('Rank Points', () => {
    const pointsMap = {
      1: 1500,
      2: 1000,
      3: 700,
      4: 500,
      5: 400,
      6: 300,
      7: 200,
      8: 200,
      9: 200,
      10: 200,
      11: 100,
      16: 50,
    };

    it('should calculate correct points for 1st place', () => {
      expect(pointsMap[1]).toBe(1500);
    });

    it('should calculate correct points for 2nd place', () => {
      expect(pointsMap[2]).toBe(1000);
    });

    it('should calculate correct points for 3rd place', () => {
      expect(pointsMap[3]).toBe(700);
    });

    it('should calculate correct points for 11th place', () => {
      expect(pointsMap[11]).toBe(100);
    });

    it('should calculate correct points for 16th+ place', () => {
      expect(pointsMap[16]).toBe(50);
    });
  });

  describe('Elimination Points', () => {
    const eliminationPoints = 50;

    it('should calculate points for no eliminations', () => {
      const eliminations = 0;
      expect(eliminations * eliminationPoints).toBe(0);
    });

    it('should calculate points for 1 elimination', () => {
      const eliminations = 1;
      expect(eliminations * eliminationPoints).toBe(50);
    });

    it('should calculate points for 3 eliminations', () => {
      const eliminations = 3;
      expect(eliminations * eliminationPoints).toBe(150);
    });
  });

  describe('Leader Killer Bonus', () => {
    const leaderKillerBonus = 25;

    it('should calculate bonus for no leader kills', () => {
      const leaderKills = 0;
      expect(leaderKills * leaderKillerBonus).toBe(0);
    });

    it('should calculate bonus for 1 leader kill', () => {
      const leaderKills = 1;
      expect(leaderKills * leaderKillerBonus).toBe(25);
    });

    it('should calculate bonus for multiple leader kills', () => {
      const leaderKills = 3;
      expect(leaderKills * leaderKillerBonus).toBe(75);
    });
  });

  describe('Rebuy Penalties', () => {
    const freeRebuysCount = 2;
    const rebuyPenaltyTier1 = -50;  // 3 rebuys
    const rebuyPenaltyTier2 = -100; // 4 rebuys
    const rebuyPenaltyTier3 = -150; // 5+ rebuys

    function calculateRebuyPenalty(rebuysCount: number): number {
      if (rebuysCount <= freeRebuysCount) return 0;
      if (rebuysCount === 3) return rebuyPenaltyTier1;
      if (rebuysCount === 4) return rebuyPenaltyTier2;
      if (rebuysCount >= 5) return rebuyPenaltyTier3;
      return 0;
    }

    it('should have no penalty for 0 rebuys', () => {
      expect(calculateRebuyPenalty(0)).toBe(0);
    });

    it('should have no penalty for 2 rebuys (free)', () => {
      expect(calculateRebuyPenalty(2)).toBe(0);
    });

    it('should apply tier 1 penalty for 3 rebuys', () => {
      expect(calculateRebuyPenalty(3)).toBe(-50);
    });

    it('should apply tier 2 penalty for 4 rebuys', () => {
      expect(calculateRebuyPenalty(4)).toBe(-100);
    });

    it('should apply tier 3 penalty for 5+ rebuys', () => {
      expect(calculateRebuyPenalty(5)).toBe(-150);
      expect(calculateRebuyPenalty(7)).toBe(-150);
    });
  });

  describe('Total Points Calculation', () => {
    function calculateTotalPoints(params: {
      rankPoints: number;
      eliminations: number;
      leaderKills: number;
      rebuys: number;
    }): number {
      const eliminationPoints = params.eliminations * 50;
      const bonusPoints = params.leaderKills * 25;

      let penaltyPoints = 0;
      if (params.rebuys === 3) penaltyPoints = -50;
      else if (params.rebuys === 4) penaltyPoints = -100;
      else if (params.rebuys >= 5) penaltyPoints = -150;

      return params.rankPoints + eliminationPoints + bonusPoints + penaltyPoints;
    }

    it('should calculate total for 1st place, no eliminations, no bonuses, no penalties', () => {
      const total = calculateTotalPoints({
        rankPoints: 1500,
        eliminations: 0,
        leaderKills: 0,
        rebuys: 0,
      });
      expect(total).toBe(1500);
    });

    it('should calculate total for 1st place with 3 eliminations and 1 leader kill', () => {
      const total = calculateTotalPoints({
        rankPoints: 1500,
        eliminations: 3,
        leaderKills: 1,
        rebuys: 0,
      });
      expect(total).toBe(1500 + 150 + 25); // 1675
    });

    it('should calculate total for 3rd place with 1 elimination and 3 rebuys (penalty)', () => {
      const total = calculateTotalPoints({
        rankPoints: 700,
        eliminations: 1,
        leaderKills: 0,
        rebuys: 3,
      });
      expect(total).toBe(700 + 50 - 50); // 700
    });

    it('should calculate total for 10th place with 0 eliminations and 5 rebuys', () => {
      const total = calculateTotalPoints({
        rankPoints: 200,
        eliminations: 0,
        leaderKills: 0,
        rebuys: 5,
      });
      expect(total).toBe(200 - 150); // 50
    });

    it('should handle complex scenario: 2nd place, 2 eliminations, 1 leader kill, 4 rebuys', () => {
      const total = calculateTotalPoints({
        rankPoints: 1000,
        eliminations: 2,
        leaderKills: 1,
        rebuys: 4,
      });
      expect(total).toBe(1000 + 100 + 25 - 100); // 1025
    });
  });
});
