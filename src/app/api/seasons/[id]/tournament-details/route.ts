import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/seasons/[id]/tournament-details
 *
 * Retourne les détails par tournoi pour chaque joueur d'une saison
 * Utilisé pour l'export #2 (Tableau détaillé)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seasonId } = await params;

    // Vérifier que la saison existe
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: 'Saison non trouvée' },
        { status: 404 }
      );
    }

    // Récupérer tous les tournois FINISHED de type CHAMPIONSHIP de la saison
    const tournaments = await prisma.tournament.findMany({
      where: {
        seasonId,
        status: 'FINISHED',
        type: 'CHAMPIONSHIP', // Only include championship tournaments
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        id: true,
        name: true,
        date: true,
      },
    });

    // Créer un mapping des tournois avec leur numéro d'ordre
    const tournamentMap = new Map(
      tournaments.map((t, index) => [t.id, index + 1])
    );

    // Récupérer tous les résultats des joueurs pour ces tournois
    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: {
        tournamentId: { in: tournaments.map((t) => t.id) },
        finalRank: { not: null }, // Seulement les joueurs classés
      },
      include: {
        player: {
          select: {
            id: true,
            nickname: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { tournamentId: 'asc' },
        { finalRank: 'asc' },
      ],
    });

    // Regrouper les résultats par joueur
    const playerResultsMap = new Map<string, any[]>();

    tournamentPlayers.forEach((tp) => {
      if (!playerResultsMap.has(tp.playerId)) {
        playerResultsMap.set(tp.playerId, []);
      }

      const tournamentNumber = tournamentMap.get(tp.tournamentId);
      if (tournamentNumber) {
        playerResultsMap.get(tp.playerId)!.push({
          tournamentId: tp.tournamentId,
          tournamentNumber,
          points: tp.totalPoints,
          rank: tp.finalRank,
        });
      }
    });

    // Récupérer le classement général pour avoir l'ordre des joueurs
    const leaderboard = await prisma.tournamentPlayer.groupBy({
      by: ['playerId'],
      where: {
        tournamentId: { in: tournaments.map((t) => t.id) },
        finalRank: { not: null },
      },
      _sum: {
        totalPoints: true,
      },
      orderBy: {
        _sum: {
          totalPoints: 'desc',
        },
      },
    });

    // Récupérer les infos des joueurs
    const playerIds = leaderboard.map((entry) => entry.playerId);
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIds },
      },
      select: {
        id: true,
        nickname: true,
        firstName: true,
        lastName: true,
      },
    });

    const playersMap = new Map(players.map((p) => [p.id, p]));

    // Construire la réponse
    const playerDetails = leaderboard.map((entry, index) => {
      const player = playersMap.get(entry.playerId);
      const results = playerResultsMap.get(entry.playerId) || [];

      return {
        rank: index + 1,
        playerId: entry.playerId,
        player: {
          id: player?.id,
          nickname: player?.nickname || 'Unknown',
          firstName: player?.firstName,
          lastName: player?.lastName,
        },
        totalPoints: entry._sum.totalPoints || 0,
        tournamentResults: results,
      };
    });

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        year: season.year,
      },
      tournamentCount: tournaments.length,
      tournaments: tournaments.map((t, index) => ({
        id: t.id,
        number: index + 1,
        name: t.name,
        date: t.date,
      })),
      players: playerDetails,
    });
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des détails' },
      { status: 500 }
    );
  }
}
