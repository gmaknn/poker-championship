/**
 * Shared leaderboard calculation logic
 * Used by both the API route and internal server-side calls
 */

import { prisma } from '@/lib/prisma';

// Type for detailed points configuration
interface DetailedPointsConfig {
  type: 'DETAILED';
  byRank: Record<string, number>;
  rank19Plus: number;
}

/**
 * Get rank points using detailed config if available, otherwise fall back to legacy fields
 */
function getRankPointsForPosition(
  rank: number,
  season: {
    detailedPointsConfig?: unknown;
    pointsFirst: number;
    pointsSecond: number;
    pointsThird: number;
    pointsFourth: number;
    pointsFifth: number;
    pointsSixth: number;
    pointsSeventh: number;
    pointsEighth: number;
    pointsNinth: number;
    pointsTenth: number;
    pointsEleventh: number;
    pointsSixteenth: number;
  }
): number {
  const config = season.detailedPointsConfig as DetailedPointsConfig | null;
  if (config && config.type === 'DETAILED' && config.byRank) {
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) {
      return pointsForRank;
    }
    return config.rank19Plus ?? 0;
  }

  const legacyPointsMap: Record<number, number> = {
    1: season.pointsFirst,
    2: season.pointsSecond,
    3: season.pointsThird,
    4: season.pointsFourth,
    5: season.pointsFifth,
    6: season.pointsSixth,
    7: season.pointsSeventh,
    8: season.pointsEighth,
    9: season.pointsNinth,
    10: season.pointsTenth,
  };

  if (legacyPointsMap[rank] !== undefined) {
    return legacyPointsMap[rank];
  }

  if (rank >= 11 && rank <= 15) {
    return season.pointsEleventh;
  }

  return season.pointsSixteenth;
}

/**
 * Calculate points for a single tournament player (used in backfill)
 */
function calculatePlayerPoints(
  tp: { finalRank: number | null; eliminationsCount: number; leaderKills: number; penaltyPoints: number },
  season: Parameters<typeof getRankPointsForPosition>[1] & { eliminationPoints: number; leaderKillerBonus: number }
): { rankPoints: number; eliminationPoints: number; bonusPoints: number; totalPoints: number } {
  let rankPoints = 0;
  let eliminationPoints = 0;
  let bonusPoints = 0;

  if (tp.finalRank !== null) {
    rankPoints = getRankPointsForPosition(tp.finalRank, season);
    eliminationPoints = tp.eliminationsCount * season.eliminationPoints;
    bonusPoints = tp.leaderKills * season.leaderKillerBonus;
  }

  const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

  return { rankPoints, eliminationPoints, bonusPoints, totalPoints };
}

export type TournamentPerformance = {
  tournamentId: string;
  tournamentName: string | null;
  tournamentDate: Date;
  finalRank: number | null;
  totalPoints: number;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  eliminationsCount: number;
  leaderKills: number;
  rebuysCount: number;
};

export type PlayerStats = {
  playerId: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    avatar: string | null;
  };
  tournamentsPlayed: number;
  tournamentsCount: number;
  totalPoints: number;
  bestResult: number | null;
  averagePoints: number;
  victories: number;
  podiums: number;
  totalEliminations: number;
  totalLeaderKills: number;
  totalRebuys: number;
  performances: TournamentPerformance[];
  rank?: number;
};

export type LeaderboardResult = {
  season: {
    id: string;
    name: string;
    year: number;
    totalTournamentsCount: number | null;
    bestTournamentsCount: number | null;
    completedTournamentsCount: number;
  };
  leaderboard: (PlayerStats & { rank: number })[];
};

/**
 * Calculate leaderboard for a season
 * Can be called directly without HTTP fetch
 * Includes automatic backfill: if all points are 0 but there are ranked players,
 * recalculates points on-the-fly (idempotent, no infinite loop).
 */
export async function calculateLeaderboard(seasonId: string): Promise<LeaderboardResult | null> {
  // Get season with its configuration
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      tournaments: {
        where: {
          status: 'FINISHED',
          type: 'CHAMPIONSHIP',
        },
        include: {
          tournamentPlayers: {
            include: {
              player: true,
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      },
    },
  });

  if (!season) {
    return null;
  }

  // Check if we need to backfill points (all totalPoints are 0 but we have ranked players)
  let needsBackfill = false;
  if (season.tournaments.length > 0) {
    const allPointsZero = season.tournaments.every(t =>
      t.tournamentPlayers.every(tp => tp.totalPoints === 0)
    );
    const hasRankedPlayers = season.tournaments.some(t =>
      t.tournamentPlayers.some(tp => tp.finalRank !== null)
    );
    needsBackfill = allPointsZero && hasRankedPlayers;
  }

  // Build player statistics
  const playerStatsMap = new Map<string, PlayerStats>();

  // Process each tournament
  for (const tournament of season.tournaments) {
    for (const tp of tournament.tournamentPlayers) {
      if (!tp.player) continue;

      let playerStats = playerStatsMap.get(tp.playerId);

      if (!playerStats) {
        playerStats = {
          playerId: tp.playerId,
          player: {
            id: tp.player.id,
            firstName: tp.player.firstName,
            lastName: tp.player.lastName,
            nickname: tp.player.nickname,
            avatar: tp.player.avatar,
          },
          tournamentsPlayed: 0,
          tournamentsCount: 0,
          totalPoints: 0,
          bestResult: null,
          averagePoints: 0,
          victories: 0,
          podiums: 0,
          totalEliminations: 0,
          totalLeaderKills: 0,
          totalRebuys: 0,
          performances: [],
        };
        playerStatsMap.set(tp.playerId, playerStats);
      }

      // Calculate points on-the-fly if backfill needed, otherwise use stored values
      let perfPoints = {
        totalPoints: tp.totalPoints,
        rankPoints: tp.rankPoints,
        eliminationPoints: tp.eliminationPoints,
        bonusPoints: tp.bonusPoints,
      };

      if (needsBackfill) {
        perfPoints = calculatePlayerPoints(tp, season);
      }

      // Add tournament performance
      playerStats.performances.push({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        tournamentDate: tournament.date,
        finalRank: tp.finalRank,
        totalPoints: perfPoints.totalPoints,
        rankPoints: perfPoints.rankPoints,
        eliminationPoints: perfPoints.eliminationPoints,
        bonusPoints: perfPoints.bonusPoints,
        penaltyPoints: tp.penaltyPoints,
        eliminationsCount: tp.eliminationsCount,
        leaderKills: tp.leaderKills,
        rebuysCount: tp.rebuysCount,
      });

      playerStats.tournamentsPlayed++;
      playerStats.totalEliminations += tp.eliminationsCount;
      playerStats.totalLeaderKills += tp.leaderKills;
      playerStats.totalRebuys += tp.rebuysCount;

      // Track best result (lowest rank number is best)
      if (tp.finalRank !== null) {
        if (playerStats.bestResult === null || tp.finalRank < playerStats.bestResult) {
          playerStats.bestResult = tp.finalRank;
        }

        // Count victories and podiums
        if (tp.finalRank === 1) playerStats.victories++;
        if (tp.finalRank <= 3) playerStats.podiums++;
      }
    }
  }

  // Apply "best performances" system
  const bestTournamentsCount = season.bestTournamentsCount;

  for (const playerStats of playerStatsMap.values()) {
    // Sort performances by points (descending)
    playerStats.performances.sort((a, b) => b.totalPoints - a.totalPoints);

    // If bestTournamentsCount is set, only keep the best performances
    let performancesToCount = playerStats.performances;
    if (bestTournamentsCount && bestTournamentsCount > 0) {
      performancesToCount = playerStats.performances.slice(0, bestTournamentsCount);
    }

    // Calculate total points from best performances
    playerStats.totalPoints = performancesToCount.reduce(
      (sum, perf) => sum + perf.totalPoints,
      0
    );
    playerStats.tournamentsCount = performancesToCount.length;

    // Calculate average
    playerStats.averagePoints =
      playerStats.tournamentsCount > 0
        ? Math.round(playerStats.totalPoints / playerStats.tournamentsCount)
        : 0;
  }

  // Convert to array and sort by total points (descending)
  const leaderboard = Array.from(playerStatsMap.values()).sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  // Add rank to each player
  const leaderboardWithRank = leaderboard.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));

  return {
    season: {
      id: season.id,
      name: season.name,
      year: season.year,
      totalTournamentsCount: season.totalTournamentsCount,
      bestTournamentsCount: season.bestTournamentsCount,
      completedTournamentsCount: season.tournaments.length,
    },
    leaderboard: leaderboardWithRank,
  };
}
