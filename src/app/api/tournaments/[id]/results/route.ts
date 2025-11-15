import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        const pointsMap: Record<number, number> = {
          1: tournament.season.pointsFirst,
          2: tournament.season.pointsSecond,
          3: tournament.season.pointsThird,
          4: tournament.season.pointsFourth,
          5: tournament.season.pointsFifth,
          6: tournament.season.pointsSixth,
          7: tournament.season.pointsSeventh,
          8: tournament.season.pointsEighth,
          9: tournament.season.pointsNinth,
          10: tournament.season.pointsTenth,
        };

        // Points pour les positions 11-15
        if (tp.finalRank === 11) rankPoints = tournament.season.pointsEleventh;
        // Points pour les positions 16+
        else if (tp.finalRank >= 16) rankPoints = tournament.season.pointsSixteenth;
        // Points pour les positions 1-10
        else rankPoints = pointsMap[tp.finalRank] || 0;

        // Points d'élimination
        eliminationPoints = tp.eliminationsCount * tournament.season.eliminationPoints;

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
        buyInAmount: tournament.buyInAmount,
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

    // Récupérer le tournoi avec la saison et tous les joueurs
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
        tournamentPlayers: true,
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
        const pointsMap: Record<number, number> = {
          1: tournament.season!.pointsFirst,
          2: tournament.season!.pointsSecond,
          3: tournament.season!.pointsThird,
          4: tournament.season!.pointsFourth,
          5: tournament.season!.pointsFifth,
          6: tournament.season!.pointsSixth,
          7: tournament.season!.pointsSeventh,
          8: tournament.season!.pointsEighth,
          9: tournament.season!.pointsNinth,
          10: tournament.season!.pointsTenth,
        };

        // Points pour les positions 11-15
        if (tp.finalRank === 11) rankPoints = tournament.season!.pointsEleventh;
        // Points pour les positions 16+
        else if (tp.finalRank >= 16) rankPoints = tournament.season!.pointsSixteenth;
        // Points pour les positions 1-10
        else rankPoints = pointsMap[tp.finalRank] || 0;

        // Points d'élimination
        eliminationPoints = tp.eliminationsCount * tournament.season!.eliminationPoints;

        // Bonus Leader Killer
        bonusPoints = tp.leaderKills * tournament.season!.leaderKillerBonus;
      }

      // Calculer le total (penaltyPoints déjà stocké)
      const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

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
