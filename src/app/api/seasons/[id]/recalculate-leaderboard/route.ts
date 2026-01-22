import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';

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

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/seasons/[id]/recalculate-leaderboard
 * Idempotent endpoint to recalculate and save points for all FINISHED tournaments in a season
 *
 * RBAC:
 * - 401: Not authenticated
 * - 403: Not ADMIN
 * - 200: Success
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // Check authentication and ADMIN role
    const authResult = await requirePermission(request, 'ADMIN');
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id: seasonId } = await params;

    // Get season with all FINISHED CHAMPIONSHIP tournaments
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        tournaments: {
          where: {
            status: 'FINISHED',
            type: 'CHAMPIONSHIP',
          },
          include: {
            tournamentPlayers: true,
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

    let totalUpdated = 0;
    let tournamentsProcessed = 0;

    // Process each FINISHED tournament
    for (const tournament of season.tournaments) {
      tournamentsProcessed++;

      // Calculate and update points for each player
      for (const tp of tournament.tournamentPlayers) {
        let rankPoints = 0;
        let eliminationPoints = 0;
        let bonusPoints = 0;

        if (tp.finalRank !== null) {
          rankPoints = getRankPointsForPosition(tp.finalRank, season);
          // Points d'élimination (finales + bust)
          // - éliminations finales (après recaves) = eliminationPoints (50 pts par défaut)
          // - éliminations bust (pendant recaves) = bustEliminationBonus (25 pts par défaut)
          const finalElimPoints = tp.eliminationsCount * season.eliminationPoints;
          const bustElimPoints = tp.bustEliminations * season.bustEliminationBonus;
          eliminationPoints = finalElimPoints + bustElimPoints;
          bonusPoints = tp.leaderKills * season.leaderKillerBonus;
        }

        const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

        // Only update if values are different (idempotent)
        if (
          tp.rankPoints !== rankPoints ||
          tp.eliminationPoints !== eliminationPoints ||
          tp.bonusPoints !== bonusPoints ||
          tp.totalPoints !== totalPoints
        ) {
          await prisma.tournamentPlayer.update({
            where: {
              tournamentId_playerId: {
                tournamentId: tournament.id,
                playerId: tp.playerId,
              },
            },
            data: {
              rankPoints,
              eliminationPoints,
              bonusPoints,
              totalPoints,
            },
          });
          totalUpdated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      seasonId,
      seasonName: season.name,
      tournamentsProcessed,
      playersUpdated: totalUpdated,
    });
  } catch (error) {
    console.error('Error recalculating leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to recalculate leaderboard' },
      { status: 500 }
    );
  }
}
