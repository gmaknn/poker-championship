import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireActivePlayer } from '@/lib/auth-helpers';

/**
 * GET /api/tournaments/[id]/live-leaderboard
 * Récupère le classement en temps réel pendant un tournoi actif
 * Calcule les points basés sur les événements actuels (éliminations, bonus, malus)
 *
 * RBAC:
 * - 401: Not authenticated
 * - 403: INACTIVE status
 * - 200: ACTIVE status (PLAYER or higher)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and ACTIVE status
    const authResult = await requireActivePlayer(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id: tournamentId } = await params;

    // Récupérer le tournoi avec la saison et tous les joueurs
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
        tournamentPlayers: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                nickname: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (!tournament.season) {
      return NextResponse.json(
        { error: 'Tournament must be associated with a season' },
        { status: 400 }
      );
    }

    // Calculer le classement en temps réel pour chaque joueur
    const liveLeaderboard = await Promise.all(
      tournament.tournamentPlayers.map(async (tp) => {
        // Points d'élimination (compte les éliminations actuelles)
        const eliminationPoints = tp.eliminationsCount * tournament.season!.eliminationPoints;

        // Bonus Leader Killer (compte les leader kills actuels)
        const bonusPoints = tp.leaderKills * tournament.season!.leaderKillerBonus;

        // Malus de recaves (déjà stocké dans penaltyPoints)
        const penaltyPoints = tp.penaltyPoints;

        // Total des points actuels (sans les points de classement final)
        const currentPoints = eliminationPoints + bonusPoints + penaltyPoints;

        return {
          player: tp.player,
          eliminationsCount: tp.eliminationsCount,
          leaderKills: tp.leaderKills,
          rebuysCount: tp.rebuysCount,
          lightRebuyUsed: tp.lightRebuyUsed,
          eliminationPoints,
          bonusPoints,
          penaltyPoints,
          currentPoints,
          isEliminated: tp.finalRank !== null && tp.finalRank > 0,
          finalRank: tp.finalRank,
        };
      })
    );

    let leaderboardWithRank;

    // FINISHED: sort by finalRank (stable, persisted) and validate consistency
    if (tournament.status === 'FINISHED') {
      const N = liveLeaderboard.length;

      // Validate: all players must have a finalRank
      const allHaveRank = liveLeaderboard.every(entry => entry.finalRank !== null);
      if (!allHaveRank) {
        return NextResponse.json(
          { error: 'Invalid finished leaderboard: final ranks are inconsistent' },
          { status: 400 }
        );
      }

      // Validate: ranks must be unique and in bounds [1..N]
      const ranks = liveLeaderboard.map(entry => entry.finalRank as number);
      const uniqueRanks = new Set(ranks);
      const allInBounds = ranks.every(rank => rank >= 1 && rank <= N);
      if (uniqueRanks.size !== N || !allInBounds) {
        return NextResponse.json(
          { error: 'Invalid finished leaderboard: final ranks are inconsistent' },
          { status: 400 }
        );
      }

      // Sort by finalRank ascending (1, 2, 3, ..., N)
      const sortedByFinalRank = [...liveLeaderboard].sort(
        (a, b) => (a.finalRank as number) - (b.finalRank as number)
      );

      leaderboardWithRank = sortedByFinalRank.map((entry) => ({
        ...entry,
        currentRank: entry.finalRank as number,
      }));
    } else {
      // IN_PROGRESS or other: sort by currentPoints descending, then eliminations
      const sortedLeaderboard = liveLeaderboard.sort((a, b) => {
        if (b.currentPoints !== a.currentPoints) {
          return b.currentPoints - a.currentPoints;
        }
        return b.eliminationsCount - a.eliminationsCount;
      });

      leaderboardWithRank = sortedLeaderboard.map((entry, index) => ({
        ...entry,
        currentRank: index + 1,
      }));
    }

    // Statistiques du tournoi
    const stats = {
      totalPlayers: tournament.tournamentPlayers.length,
      remainingPlayers: tournament.tournamentPlayers.filter(tp => !tp.finalRank || tp.finalRank === 0).length,
      eliminatedPlayers: tournament.tournamentPlayers.filter(tp => tp.finalRank && tp.finalRank > 0).length,
      totalEliminations: tournament.tournamentPlayers.reduce((sum, tp) => sum + tp.eliminationsCount, 0),
      totalRebuys: tournament.tournamentPlayers.reduce((sum, tp) => sum + tp.rebuysCount, 0),
      leaderKillsTotal: tournament.tournamentPlayers.reduce((sum, tp) => sum + tp.leaderKills, 0),
    };

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        status: tournament.status,
        buyInAmount: tournament.buyInAmount,
        startingChips: tournament.startingChips,
        currentLevel: tournament.currentLevel,
      },
      season: {
        name: tournament.season.name,
        eliminationPoints: tournament.season.eliminationPoints,
        leaderKillerBonus: tournament.season.leaderKillerBonus,
      },
      leaderboard: leaderboardWithRank,
      stats,
    });
  } catch (error) {
    console.error('Error fetching live leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live leaderboard' },
      { status: 500 }
    );
  }
}
