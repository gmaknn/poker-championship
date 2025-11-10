import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = {
  params: Promise<{ id: string }>;
};

type TournamentPerformance = {
  tournamentId: string;
  tournamentName: string | null;
  tournamentDate: Date;
  finalRank: number | null;
  totalPoints: number;
  eliminationsCount: number;
  leaderKills: number;
  rebuysCount: number;
};

type PlayerStats = {
  playerId: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    avatar: string | null;
  };
  tournamentsPlayed: number;
  tournamentsCount: number; // Total tournaments counted (after best performances filter)
  totalPoints: number;
  bestResult: number | null; // Best finalRank
  averagePoints: number;
  victories: number; // Number of 1st places
  podiums: number; // Number of top 3 finishes
  totalEliminations: number;
  totalLeaderKills: number;
  totalRebuys: number;
  performances: TournamentPerformance[];
};

/**
 * GET /api/seasons/[id]/leaderboard
 * Get the season leaderboard with "best performances" system
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Get season with its configuration
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        tournaments: {
          where: {
            status: 'FINISHED',
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
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
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

        // Add tournament performance
        playerStats.performances.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          tournamentDate: tournament.date,
          finalRank: tp.finalRank,
          totalPoints: tp.totalPoints,
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

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        year: season.year,
        totalTournamentsCount: season.totalTournamentsCount,
        bestTournamentsCount: season.bestTournamentsCount,
        completedTournamentsCount: season.tournaments.length,
      },
      leaderboard: leaderboardWithRank,
    });
  } catch (error) {
    console.error('Error fetching season leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season leaderboard' },
      { status: 500 }
    );
  }
}
