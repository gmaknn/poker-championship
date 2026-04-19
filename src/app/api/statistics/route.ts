import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Récupérer les statistiques globales
    const [
      totalTournaments,
      finishedTournaments,
      totalPlayers,
      totalRegistrations,
      activePlayers,
      seasons,
    ] = await Promise.all([
      // Total des tournois (championnat uniquement)
      prisma.tournament.count({
        where: { type: 'CHAMPIONSHIP' }
      }),

      // Tournois terminés (championnat uniquement)
      prisma.tournament.count({
        where: { status: 'FINISHED', type: 'CHAMPIONSHIP' }
      }),

      // Total des joueurs
      prisma.player.count(),

      // Total des inscriptions (championnat uniquement)
      prisma.tournamentPlayer.count({
        where: {
          tournament: { type: 'CHAMPIONSHIP' }
        }
      }),

      // Joueurs actifs cette année (championnat uniquement)
      prisma.player.count({
        where: {
          tournamentPlayers: {
            some: {
              tournament: { type: 'CHAMPIONSHIP' },
              createdAt: {
                gte: new Date(new Date().getFullYear(), 0, 1)
              }
            }
          }
        }
      }),

      // Saisons (championnat uniquement)
      prisma.season.findMany({
        include: {
          tournaments: {
            where: { type: 'CHAMPIONSHIP' },
            include: {
              tournamentPlayers: true,
              eliminations: true
            }
          }
        }
      })
    ]);

    // Calculer la moyenne d'entrées par tournoi
    const avgPlayersPerTournament = totalTournaments > 0
      ? Math.round(totalRegistrations / totalTournaments)
      : 0;

    // Calculer la durée moyenne des tournois terminés
    const tournamentsWithDuration = await prisma.tournament.findMany({
      where: {
        status: 'FINISHED',
        type: 'CHAMPIONSHIP',
        timerElapsedSeconds: { gt: 0 }
      },
      select: {
        timerElapsedSeconds: true
      }
    });

    const avgDurationSeconds = tournamentsWithDuration.length > 0
      ? tournamentsWithDuration.reduce((acc, t) => acc + t.timerElapsedSeconds, 0) / tournamentsWithDuration.length
      : 0;

    const avgDurationHours = Math.round(avgDurationSeconds / 3600 * 10) / 10;

    // Statistiques par saison
    const seasonStats = seasons.map(season => {
      const tournaments = season.tournaments;
      const finishedTournaments = tournaments.filter(t => t.status === 'FINISHED');
      const totalPlayersInSeason = tournaments.reduce((acc, t) => acc + t.tournamentPlayers.length, 0);
      const totalEliminations = tournaments.reduce((acc, t) => acc + t.eliminations.length, 0);

      return {
        id: season.id,
        name: season.name,
        status: season.status,
        totalTournaments: tournaments.length,
        finishedTournaments: finishedTournaments.length,
        totalPlayers: totalPlayersInSeason,
        totalEliminations,
        avgPlayersPerTournament: tournaments.length > 0
          ? Math.round(totalPlayersInSeason / tournaments.length)
          : 0
      };
    });

    // Top 5 joueurs les plus actifs (championnat uniquement)
    const topActivePlayers = await prisma.player.findMany({
      include: {
        tournamentPlayers: {
          where: {
            tournament: { type: 'CHAMPIONSHIP' }
          },
          include: {
            tournament: {
              select: {
                name: true,
                date: true
              }
            }
          }
        }
      },
      orderBy: {
        tournamentPlayers: {
          _count: 'desc'
        }
      },
      take: 5
    });

    const topPlayers = topActivePlayers.map(player => ({
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      nickname: player.nickname,
      avatar: player.avatar,
      tournamentsPlayed: player.tournamentPlayers.length,
      lastTournament: player.tournamentPlayers[0]?.tournament.date || null
    }));

    // Évolution du nombre de joueurs par mois (12 derniers mois)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const tournamentsLastYear = await prisma.tournament.findMany({
      where: {
        type: 'CHAMPIONSHIP',
        date: {
          gte: twelveMonthsAgo
        }
      },
      include: {
        tournamentPlayers: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    const monthlyData = tournamentsLastYear.map(t => ({
      date: t.date,
      month: t.date.toLocaleString('fr-FR', { month: 'short', year: 'numeric' }),
      playerCount: t.tournamentPlayers.length,
      tournamentName: t.name
    }));

    return NextResponse.json({
      overview: {
        totalTournaments,
        finishedTournaments,
        totalPlayers,
        activePlayers,
        avgPlayersPerTournament,
        avgDurationHours
      },
      seasonStats,
      topPlayers,
      monthlyData
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
