import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/players/[id]/dashboard
 * Get comprehensive dashboard data for a player
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Get player info
    const player = await prisma.player.findUnique({
      where: { id },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Get current active season
    const activeSeason = await prisma.season.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startDate: 'desc' },
    });

    // Get upcoming tournaments (PLANNED status in active season)
    const upcomingTournaments = await prisma.tournament.findMany({
      where: {
        seasonId: activeSeason?.id,
        status: { in: ['PLANNED', 'REGISTRATION'] },
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 3,
      include: {
        season: true,
        _count: {
          select: { tournamentPlayers: true },
        },
      },
    });

    // Get last tournament played
    const lastTournament = await prisma.tournamentPlayer.findFirst({
      where: {
        playerId: id,
        tournament: {
          status: 'FINISHED',
        },
      },
      orderBy: {
        tournament: {
          date: 'desc',
        },
      },
      include: {
        tournament: {
          include: {
            season: true,
          },
        },
      },
    });

    // Get player stats in current season
    let myRanking = null;
    let leaderboardTop10 = null;

    if (activeSeason) {
      // Fetch leaderboard (we'll filter for this player)
      const leaderboardResponse = await fetch(
        `${request.nextUrl.origin}/api/seasons/${activeSeason.id}/leaderboard`
      );

      if (leaderboardResponse.ok) {
        const leaderboardData = await leaderboardResponse.json();
        leaderboardTop10 = leaderboardData.leaderboard.slice(0, 10);
        myRanking = leaderboardData.leaderboard.find(
          (entry: any) => entry.playerId === id
        );
      }
    }

    // Get tournament history (all tournaments)
    const tournamentHistory = await prisma.tournamentPlayer.findMany({
      where: {
        playerId: id,
        tournament: {
          status: 'FINISHED',
        },
      },
      orderBy: {
        tournament: {
          date: 'desc',
        },
      },
      take: 20,
      include: {
        tournament: {
          include: {
            season: true,
          },
        },
      },
    });

    // Calculate fun stats
    // 1. Nemesis (who eliminates me the most)
    const eliminatedBy = await prisma.elimination.groupBy({
      by: ['eliminatorId'],
      where: { eliminatedId: id },
      _count: { eliminatorId: true },
      orderBy: {
        _count: { eliminatorId: 'desc' },
      },
      take: 1,
    });

    let nemesis = null;
    if (eliminatedBy.length > 0) {
      const nemesisPlayer = await prisma.player.findUnique({
        where: { id: eliminatedBy[0].eliminatorId },
      });
      if (nemesisPlayer) {
        nemesis = {
          player: nemesisPlayer,
          count: eliminatedBy[0]._count.eliminatorId,
        };
      }
    }

    // 2. Favorite victim (who I eliminate the most)
    const iEliminated = await prisma.elimination.groupBy({
      by: ['eliminatedId'],
      where: { eliminatorId: id },
      _count: { eliminatedId: true },
      orderBy: {
        _count: { eliminatedId: 'desc' },
      },
      take: 1,
    });

    let favoriteVictim = null;
    if (iEliminated.length > 0) {
      const victimPlayer = await prisma.player.findUnique({
        where: { id: iEliminated[0].eliminatedId },
      });
      if (victimPlayer) {
        favoriteVictim = {
          player: victimPlayer,
          count: iEliminated[0]._count.eliminatedId,
        };
      }
    }

    // 3. Overall stats
    const totalTournaments = await prisma.tournamentPlayer.count({
      where: {
        playerId: id,
        tournament: { status: 'FINISHED' },
      },
    });

    const victories = await prisma.tournamentPlayer.count({
      where: {
        playerId: id,
        finalRank: 1,
        tournament: { status: 'FINISHED' },
      },
    });

    const podiums = await prisma.tournamentPlayer.count({
      where: {
        playerId: id,
        finalRank: { lte: 3 },
        tournament: { status: 'FINISHED' },
      },
    });

    const totalEliminationsSum = await prisma.tournamentPlayer.aggregate({
      where: {
        playerId: id,
        tournament: { status: 'FINISHED' },
      },
      _sum: { eliminationsCount: true },
    });

    const totalLeaderKillsSum = await prisma.tournamentPlayer.aggregate({
      where: {
        playerId: id,
        tournament: { status: 'FINISHED' },
      },
      _sum: { leaderKills: true },
    });

    const totalRebuysSum = await prisma.tournamentPlayer.aggregate({
      where: {
        playerId: id,
        tournament: { status: 'FINISHED' },
      },
      _sum: { rebuysCount: true },
    });

    return NextResponse.json({
      player,
      activeSeason,
      upcomingTournaments,
      lastTournament,
      myRanking,
      leaderboardTop10,
      tournamentHistory,
      funStats: {
        nemesis,
        favoriteVictim,
        totalTournaments,
        victories,
        podiums,
        totalEliminations: totalEliminationsSum._sum.eliminationsCount || 0,
        totalLeaderKills: totalLeaderKillsSum._sum.leaderKills || 0,
        totalRebuys: totalRebuysSum._sum.rebuysCount || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching player dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player dashboard' },
      { status: 500 }
    );
  }
}
