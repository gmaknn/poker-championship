import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tournaments/[id]/live-leaderboard
 * Récupère le classement en temps réel pendant un tournoi actif
 * Calcule les points basés sur les événements actuels (éliminations, bonus, malus)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Trier par points décroissants, puis par éliminations décroissantes
    const sortedLeaderboard = liveLeaderboard.sort((a, b) => {
      if (b.currentPoints !== a.currentPoints) {
        return b.currentPoints - a.currentPoints;
      }
      return b.eliminationsCount - a.eliminationsCount;
    });

    // Ajouter le rang actuel
    const leaderboardWithRank = sortedLeaderboard.map((entry, index) => ({
      ...entry,
      currentRank: index + 1,
    }));

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
