import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';

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
  // Check if detailed config exists and is valid
  const config = season.detailedPointsConfig as DetailedPointsConfig | null;
  if (config && config.type === 'DETAILED' && config.byRank) {
    // Use detailed config
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) {
      return pointsForRank;
    }
    // Rank not in byRank (19+), use rank19Plus
    return config.rank19Plus ?? 0;
  }

  // Fall back to legacy field-based system
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

  // Legacy: positions 1-10
  if (legacyPointsMap[rank] !== undefined) {
    return legacyPointsMap[rank];
  }

  // Legacy: positions 11-15
  if (rank >= 11 && rank <= 15) {
    return season.pointsEleventh;
  }

  // Legacy: positions 16+
  return season.pointsSixteenth;
}

// GET - Récupérer les résultats calculés du tournoi
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
          orderBy: {
            finalRank: 'asc',
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

    // Calculer les résultats pour chaque joueur
    const results = tournament.tournamentPlayers.map((tp) => {
      let rankPoints = 0;
      let eliminationPoints = 0;
      let bonusPoints = 0;
      const penaltyPoints = tp.penaltyPoints; // Déjà calculé lors des recaves

      // Points de classement selon la position finale (uniquement pour les tournois CHAMPIONSHIP)
      if (tournament.type === 'CHAMPIONSHIP' && tournament.season && tp.finalRank !== null) {
        // Use new detailed config if available, otherwise fall back to legacy
        rankPoints = getRankPointsForPosition(tp.finalRank, tournament.season);

        // Points d'élimination (finales + bust)
        // - éliminations finales (après recaves) = eliminationPoints (50 pts par défaut)
        // - éliminations bust (pendant recaves) = bustEliminationBonus (25 pts par défaut)
        const finalElimPoints = tp.eliminationsCount * tournament.season.eliminationPoints;
        const bustElimPoints = tp.bustEliminations * tournament.season.bustEliminationBonus;
        eliminationPoints = finalElimPoints + bustElimPoints;

        // Bonus Leader Killer
        bonusPoints = tp.leaderKills * tournament.season.leaderKillerBonus;
      }

      // Calculer le total (0 pour les tournois CASUAL)
      const totalPoints = rankPoints + eliminationPoints + bonusPoints + penaltyPoints;

      return {
        ...tp,
        rankPoints,
        eliminationPoints,
        bonusPoints,
        penaltyPoints,
        totalPoints,
      };
    });

    return NextResponse.json({
      tournament: {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        status: tournament.status,
        type: tournament.type,
        buyInAmount: tournament.buyInAmount,
        lightRebuyAmount: tournament.lightRebuyAmount,
        prizePool: tournament.prizePool,
      },
      season: tournament.season,
      results,
    });
  } catch (error) {
    console.error('Error fetching tournament results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament results' },
      { status: 500 }
    );
  }
}

// POST - Calculer et sauvegarder les points pour tous les joueurs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Récupérer le tournoi avec la saison, les joueurs et les montants de gains
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
        tournamentPlayers: true,
      },
      // Also get prize payout config
    });

    // Get prize amounts from tournament (stored in prizePayoutPercents as € amounts)
    const tournamentWithPrizes = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        prizePayoutPercents: true,
        prizePayoutCount: true,
      },
    });

    // Parse prize amounts (stored as JSON array of € amounts)
    const prizeAmounts = (tournamentWithPrizes?.prizePayoutPercents as number[] | null) || [];

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    if (!tournament.season) {
      return NextResponse.json(
        { error: 'Tournament must be associated with a season to calculate points' },
        { status: 400 }
      );
    }

    // Calculer et mettre à jour les points pour chaque joueur
    const updates = tournament.tournamentPlayers.map(async (tp) => {
      let rankPoints = 0;
      let eliminationPoints = 0;
      let bonusPoints = 0;

      // Points de classement selon la position finale
      if (tp.finalRank !== null) {
        // Use new detailed config if available, otherwise fall back to legacy
        rankPoints = getRankPointsForPosition(tp.finalRank, tournament.season!);

        // Points d'élimination (finales + bust)
        // - éliminations finales (après recaves) = eliminationPoints (50 pts par défaut)
        // - éliminations bust (pendant recaves) = bustEliminationBonus (25 pts par défaut)
        const finalElimPoints = tp.eliminationsCount * tournament.season!.eliminationPoints;
        const bustElimPoints = tp.bustEliminations * tournament.season!.bustEliminationBonus;
        eliminationPoints = finalElimPoints + bustElimPoints;

        // Bonus Leader Killer
        bonusPoints = tp.leaderKills * tournament.season!.leaderKillerBonus;
      }

      // Calculer le total (penaltyPoints déjà stocké)
      const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

      // Déterminer le gain (prize) selon le classement final
      // prizeAmounts[0] = gain pour le 1er, prizeAmounts[1] = gain pour le 2ème, etc.
      let prizeAmount: number | null = null;
      if (tp.finalRank !== null && tp.finalRank >= 1 && tp.finalRank <= prizeAmounts.length) {
        prizeAmount = prizeAmounts[tp.finalRank - 1];
      }

      // Mettre à jour dans la base de données
      return prisma.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: tp.playerId,
          },
        },
        data: {
          rankPoints,
          eliminationPoints,
          bonusPoints,
          totalPoints,
          prizeAmount,
        },
      });
    });

    await Promise.all(updates);

    // Récupérer les résultats mis à jour
    const updatedPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
      },
      orderBy: [
        { finalRank: 'asc' },
        { totalPoints: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      message: 'Points calculated and saved successfully',
      results: updatedPlayers,
    });
  } catch (error) {
    console.error('Error calculating tournament results:', error);
    return NextResponse.json(
      { error: 'Failed to calculate tournament results' },
      { status: 500 }
    );
  }
}
