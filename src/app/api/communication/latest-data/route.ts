import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/communication/latest-data
 * Récupère les dernières données pour remplir les templates de messages
 */
export async function GET() {
  try {
    // Récupérer le dernier tournoi terminé
    const latestTournament = await prisma.tournament.findFirst({
      where: {
        status: 'FINISHED',
      },
      orderBy: {
        date: 'desc',
      },
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

    // Récupérer la saison active
    const activeSeason = await prisma.season.findFirst({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    // Récupérer le classement de la saison (Top 10)
    let leaderboard = [];
    if (activeSeason) {
      const tournamentPlayers = await prisma.tournamentPlayer.findMany({
        where: {
          tournament: {
            seasonId: activeSeason.id,
            status: 'FINISHED',
          },
        },
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
      });

      // Agréger les points par joueur
      const playerPoints = new Map<string, { player: any; totalPoints: number; tournaments: number }>();

      tournamentPlayers.forEach((tp) => {
        const existing = playerPoints.get(tp.playerId);
        if (existing) {
          existing.totalPoints += tp.totalPoints;
          existing.tournaments += 1;
        } else {
          playerPoints.set(tp.playerId, {
            player: tp.player,
            totalPoints: tp.totalPoints,
            tournaments: 1,
          });
        }
      });

      // Convertir en tableau et trier
      leaderboard = Array.from(playerPoints.values())
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10)
        .map((item, index) => ({
          rank: index + 1,
          ...item,
        }));
    }

    // Récupérer les Top Sharks (plus d'éliminations)
    const topSharks = await prisma.elimination.groupBy({
      by: ['eliminatorId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    // Enrichir avec les infos des joueurs
    const sharksWithInfo = await Promise.all(
      topSharks.map(async (shark) => {
        const player = await prisma.player.findUnique({
          where: { id: shark.eliminatorId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        });
        return {
          player,
          eliminations: shark._count.id,
        };
      })
    );

    // Récupérer le prochain tournoi planifié
    const nextTournament = await prisma.tournament.findFirst({
      where: {
        status: {
          in: ['PLANNED', 'REGISTRATION'],
        },
        date: {
          gte: new Date(),
        },
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        season: true,
      },
    });

    return NextResponse.json({
      latestTournament: latestTournament
        ? {
            id: latestTournament.id,
            name: latestTournament.name,
            date: latestTournament.date,
            buyInAmount: latestTournament.buyInAmount,
            prizePool: latestTournament.prizePool,
            season: latestTournament.season
              ? {
                  name: latestTournament.season.name,
                  year: latestTournament.season.year,
                }
              : null,
            podium: latestTournament.tournamentPlayers.slice(0, 3).map((tp) => ({
              rank: tp.finalRank,
              player: tp.player,
              points: tp.totalPoints,
              prizeAmount: tp.prizeAmount,
            })),
            topKiller: latestTournament.tournamentPlayers.reduce((max, tp) =>
              tp.eliminationsCount > (max?.eliminationsCount || 0) ? tp : max
            , latestTournament.tournamentPlayers[0]),
          }
        : null,

      activeSeason: activeSeason
        ? {
            id: activeSeason.id,
            name: activeSeason.name,
            year: activeSeason.year,
          }
        : null,

      leaderboard,

      topSharks: sharksWithInfo.filter((s) => s.player !== null),

      nextTournament: nextTournament
        ? {
            id: nextTournament.id,
            name: nextTournament.name,
            date: nextTournament.date,
            buyInAmount: nextTournament.buyInAmount,
            startingChips: nextTournament.startingChips,
            season: nextTournament.season
              ? {
                  name: nextTournament.season.name,
                  year: nextTournament.season.year,
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching latest data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest data' },
      { status: 500 }
    );
  }
}
