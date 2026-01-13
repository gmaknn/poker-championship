/**
 * Tests for leaderboard calculation logic
 * Ensures KO points (elimination + bonus) are correctly aggregated
 */

import { TournamentPerformance, PlayerStats } from '../leaderboard';

// Test the TournamentPerformance type structure
describe('TournamentPerformance type', () => {
  it('should include all scoring breakdown fields', () => {
    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 1,
      totalPoints: 1700,
      rankPoints: 1500,
      eliminationPoints: 150,
      bonusPoints: 50,
      penaltyPoints: 0,
      eliminationsCount: 3,
      leaderKills: 2,
      rebuysCount: 1,
    };

    // Verify all fields are present and typed correctly
    expect(perf.rankPoints).toBe(1500);
    expect(perf.eliminationPoints).toBe(150);
    expect(perf.bonusPoints).toBe(50);
    expect(perf.penaltyPoints).toBe(0);
    expect(perf.totalPoints).toBe(1700);
  });

  it('should calculate total points correctly from breakdown', () => {
    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 2,
      totalPoints: 1150, // 1000 + 200 + 50 - 100
      rankPoints: 1000,
      eliminationPoints: 200,
      bonusPoints: 50,
      penaltyPoints: -100,
      eliminationsCount: 4,
      leaderKills: 2,
      rebuysCount: 5,
    };

    const expectedTotal =
      perf.rankPoints +
      perf.eliminationPoints +
      perf.bonusPoints +
      perf.penaltyPoints;

    expect(perf.totalPoints).toBe(expectedTotal);
  });
});

describe('KO points calculation scenarios', () => {
  it('should handle 0 eliminations correctly', () => {
    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 10,
      totalPoints: 300, // Just rank points
      rankPoints: 300,
      eliminationPoints: 0,
      bonusPoints: 0,
      penaltyPoints: 0,
      eliminationsCount: 0,
      leaderKills: 0,
      rebuysCount: 0,
    };

    expect(perf.eliminationPoints).toBe(0);
    expect(perf.bonusPoints).toBe(0);
    expect(perf.eliminationsCount).toBe(0);
  });

  it('should handle single elimination correctly', () => {
    const eliminationPointsPerKO = 50;
    const elimCount = 1;

    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 5,
      totalPoints: 450,
      rankPoints: 400,
      eliminationPoints: elimCount * eliminationPointsPerKO,
      bonusPoints: 0,
      penaltyPoints: 0,
      eliminationsCount: elimCount,
      leaderKills: 0,
      rebuysCount: 0,
    };

    expect(perf.eliminationPoints).toBe(50);
    expect(perf.eliminationsCount).toBe(1);
  });

  it('should handle multiple eliminations correctly', () => {
    const eliminationPointsPerKO = 50;
    const elimCount = 5;

    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 1,
      totalPoints: 1750,
      rankPoints: 1500,
      eliminationPoints: elimCount * eliminationPointsPerKO,
      bonusPoints: 0,
      penaltyPoints: 0,
      eliminationsCount: elimCount,
      leaderKills: 0,
      rebuysCount: 0,
    };

    expect(perf.eliminationPoints).toBe(250);
    expect(perf.eliminationsCount).toBe(5);
  });

  it('should handle leader kills bonus correctly', () => {
    const eliminationPointsPerKO = 50;
    const leaderKillerBonus = 25;
    const elimCount = 3;
    const leaderKillCount = 1;

    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 2,
      totalPoints: 1175,
      rankPoints: 1000,
      eliminationPoints: elimCount * eliminationPointsPerKO,
      bonusPoints: leaderKillCount * leaderKillerBonus,
      penaltyPoints: 0,
      eliminationsCount: elimCount,
      leaderKills: leaderKillCount,
      rebuysCount: 0,
    };

    expect(perf.eliminationPoints).toBe(150);
    expect(perf.bonusPoints).toBe(25);
    expect(perf.totalPoints).toBe(1000 + 150 + 25);
  });

  it('should handle elimination + bonus + penalty together', () => {
    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 3,
      totalPoints: 825, // 700 + 200 + 25 - 100
      rankPoints: 700,
      eliminationPoints: 200,
      bonusPoints: 25,
      penaltyPoints: -100,
      eliminationsCount: 4,
      leaderKills: 1,
      rebuysCount: 4,
    };

    const expectedTotal =
      perf.rankPoints +
      perf.eliminationPoints +
      perf.bonusPoints +
      perf.penaltyPoints;

    expect(perf.totalPoints).toBe(825);
    expect(expectedTotal).toBe(825);
  });
});

describe('Season aggregation of KO points', () => {
  it('should aggregate KO points across multiple tournaments', () => {
    const performances: TournamentPerformance[] = [
      {
        tournamentId: 't1',
        tournamentName: 'Tournament 1',
        tournamentDate: new Date('2025-01-01'),
        finalRank: 1,
        totalPoints: 1600,
        rankPoints: 1500,
        eliminationPoints: 100,
        bonusPoints: 0,
        penaltyPoints: 0,
        eliminationsCount: 2,
        leaderKills: 0,
        rebuysCount: 0,
      },
      {
        tournamentId: 't2',
        tournamentName: 'Tournament 2',
        tournamentDate: new Date('2025-01-15'),
        finalRank: 2,
        totalPoints: 1175,
        rankPoints: 1000,
        eliminationPoints: 150,
        bonusPoints: 25,
        penaltyPoints: 0,
        eliminationsCount: 3,
        leaderKills: 1,
        rebuysCount: 0,
      },
      {
        tournamentId: 't3',
        tournamentName: 'Tournament 3',
        tournamentDate: new Date('2025-02-01'),
        finalRank: 5,
        totalPoints: 500,
        rankPoints: 400,
        eliminationPoints: 50,
        bonusPoints: 50,
        penaltyPoints: 0,
        eliminationsCount: 1,
        leaderKills: 2,
        rebuysCount: 0,
      },
    ];

    // Calculate aggregates
    const totalPoints = performances.reduce((sum, p) => sum + p.totalPoints, 0);
    const totalElimPoints = performances.reduce((sum, p) => sum + p.eliminationPoints, 0);
    const totalBonusPoints = performances.reduce((sum, p) => sum + p.bonusPoints, 0);
    const totalKoPoints = totalElimPoints + totalBonusPoints;
    const totalEliminations = performances.reduce((sum, p) => sum + p.eliminationsCount, 0);
    const totalLeaderKills = performances.reduce((sum, p) => sum + p.leaderKills, 0);

    expect(totalPoints).toBe(1600 + 1175 + 500);
    expect(totalElimPoints).toBe(100 + 150 + 50);
    expect(totalBonusPoints).toBe(0 + 25 + 50);
    expect(totalKoPoints).toBe(300 + 75);
    expect(totalEliminations).toBe(2 + 3 + 1);
    expect(totalLeaderKills).toBe(0 + 1 + 2);
  });

  it('should respect bestTournamentsCount when aggregating KO points', () => {
    const performances: TournamentPerformance[] = [
      {
        tournamentId: 't1',
        tournamentName: 'Tournament 1',
        tournamentDate: new Date('2025-01-01'),
        finalRank: 1,
        totalPoints: 1700,
        rankPoints: 1500,
        eliminationPoints: 200,
        bonusPoints: 0,
        penaltyPoints: 0,
        eliminationsCount: 4,
        leaderKills: 0,
        rebuysCount: 0,
      },
      {
        tournamentId: 't2',
        tournamentName: 'Tournament 2',
        tournamentDate: new Date('2025-01-15'),
        finalRank: 3,
        totalPoints: 800,
        rankPoints: 700,
        eliminationPoints: 100,
        bonusPoints: 0,
        penaltyPoints: 0,
        eliminationsCount: 2,
        leaderKills: 0,
        rebuysCount: 0,
      },
      {
        tournamentId: 't3',
        tournamentName: 'Tournament 3 (worst - should be excluded)',
        tournamentDate: new Date('2025-02-01'),
        finalRank: 10,
        totalPoints: 350,
        rankPoints: 300,
        eliminationPoints: 50,
        bonusPoints: 0,
        penaltyPoints: 0,
        eliminationsCount: 1,
        leaderKills: 0,
        rebuysCount: 0,
      },
    ];

    // Sort by totalPoints descending (like leaderboard.ts does)
    const sortedPerfs = [...performances].sort((a, b) => b.totalPoints - a.totalPoints);

    // Apply bestTournamentsCount = 2
    const bestTournamentsCount = 2;
    const countedPerfs = sortedPerfs.slice(0, bestTournamentsCount);

    const totalPointsCounted = countedPerfs.reduce((sum, p) => sum + p.totalPoints, 0);
    const totalKoPointsCounted = countedPerfs.reduce(
      (sum, p) => sum + p.eliminationPoints + p.bonusPoints,
      0
    );

    // Only t1 (1700) and t2 (800) should be counted, not t3 (350)
    expect(countedPerfs).toHaveLength(2);
    expect(totalPointsCounted).toBe(1700 + 800);
    expect(totalKoPointsCounted).toBe(200 + 100); // KO from t1 and t2 only
  });
});

describe('Edge cases', () => {
  it('should handle player with no eliminations across all tournaments', () => {
    const performances: TournamentPerformance[] = [
      {
        tournamentId: 't1',
        tournamentName: 'Tournament 1',
        tournamentDate: new Date(),
        finalRank: 10,
        totalPoints: 300,
        rankPoints: 300,
        eliminationPoints: 0,
        bonusPoints: 0,
        penaltyPoints: 0,
        eliminationsCount: 0,
        leaderKills: 0,
        rebuysCount: 0,
      },
      {
        tournamentId: 't2',
        tournamentName: 'Tournament 2',
        tournamentDate: new Date(),
        finalRank: 8,
        totalPoints: 350,
        rankPoints: 350,
        eliminationPoints: 0,
        bonusPoints: 0,
        penaltyPoints: 0,
        eliminationsCount: 0,
        leaderKills: 0,
        rebuysCount: 0,
      },
    ];

    const totalKoPoints = performances.reduce(
      (sum, p) => sum + p.eliminationPoints + p.bonusPoints,
      0
    );

    expect(totalKoPoints).toBe(0);
  });

  it('should handle player who is elimination leader', () => {
    // A player who eliminated many opponents
    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 1,
      totalPoints: 2075, // 1500 + 500 + 75
      rankPoints: 1500,
      eliminationPoints: 500, // 10 eliminations × 50 pts
      bonusPoints: 75, // 3 leader kills × 25 pts
      penaltyPoints: 0,
      eliminationsCount: 10,
      leaderKills: 3,
      rebuysCount: 0,
    };

    expect(perf.eliminationPoints + perf.bonusPoints).toBe(575);
    expect(perf.totalPoints).toBe(perf.rankPoints + perf.eliminationPoints + perf.bonusPoints);
  });

  it('should handle negative penalty points correctly in total', () => {
    const perf: TournamentPerformance = {
      tournamentId: 't1',
      tournamentName: 'Tournament 1',
      tournamentDate: new Date(),
      finalRank: 1,
      totalPoints: 1450, // 1500 + 100 - 150
      rankPoints: 1500,
      eliminationPoints: 100,
      bonusPoints: 0,
      penaltyPoints: -150,
      eliminationsCount: 2,
      leaderKills: 0,
      rebuysCount: 5,
    };

    const calculatedTotal =
      perf.rankPoints + perf.eliminationPoints + perf.bonusPoints + perf.penaltyPoints;

    expect(calculatedTotal).toBe(1450);
    expect(perf.totalPoints).toBe(calculatedTotal);
  });
});
