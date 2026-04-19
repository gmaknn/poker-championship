import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLeaderboard } from '@/lib/leaderboard';
import { requireActivePlayer } from '@/lib/auth-helpers';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/players/[id]/dashboard
 * Get comprehensive dashboard data for a player
 *
 * RBAC:
 * - 401: Not authenticated
 * - 403: INACTIVE status
 * - 200: ACTIVE status (PLAYER or higher)
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Check authentication and ACTIVE status
    const authResult = await requireActivePlayer(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

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

    // Get last tournament played (CHAMPIONSHIP only)
    const lastTournament = await prisma.tournamentPlayer.findFirst({
      where: {
        playerId: id,
        tournament: {
          status: 'FINISHED',
          type: 'CHAMPIONSHIP',
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
      // Calculate leaderboard directly (no HTTP fetch - avoids SSL issues in production)
      const leaderboardData = await calculateLeaderboard(activeSeason.id);

      if (leaderboardData) {
        leaderboardTop10 = leaderboardData.leaderboard.slice(0, 10);
        myRanking = leaderboardData.leaderboard.find(
          (entry) => entry.playerId === id
        );
      }
    }

    // Get tournament history (CHAMPIONSHIP only)
    const tournamentHistory = await prisma.tournamentPlayer.findMany({
      where: {
        playerId: id,
        tournament: {
          status: 'FINISHED',
          type: 'CHAMPIONSHIP',
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

    // Calculate fun stats (CHAMPIONSHIP only)
    // 1. Nemesis (who eliminates me the most)
    const eliminatedBy = await prisma.elimination.groupBy({
      by: ['eliminatorId'],
      where: {
        eliminatedId: id,
        eliminatorId: { not: null },
        tournament: { type: 'CHAMPIONSHIP' },
      },
      _count: { eliminatorId: true },
      orderBy: {
        _count: { eliminatorId: 'desc' },
      },
      take: 1,
    });

    let nemesis = null;
    if (eliminatedBy.length > 0 && eliminatedBy[0].eliminatorId) {
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
      where: {
        eliminatorId: id,
        tournament: { type: 'CHAMPIONSHIP' },
      },
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

    // 3. Overall stats (CHAMPIONSHIP only)
    const championshipFilter = {
      playerId: id,
      tournament: { status: 'FINISHED' as const, type: 'CHAMPIONSHIP' as const },
    };

    const totalTournaments = await prisma.tournamentPlayer.count({
      where: championshipFilter,
    });

    const victories = await prisma.tournamentPlayer.count({
      where: {
        ...championshipFilter,
        finalRank: 1,
      },
    });

    const podiums = await prisma.tournamentPlayer.count({
      where: {
        ...championshipFilter,
        finalRank: { lte: 3 },
      },
    });

    const totalEliminationsSum = await prisma.tournamentPlayer.aggregate({
      where: championshipFilter,
      _sum: { eliminationsCount: true },
    });

    const totalLeaderKillsSum = await prisma.tournamentPlayer.aggregate({
      where: championshipFilter,
      _sum: { leaderKills: true },
    });

    const totalRebuysSum = await prisma.tournamentPlayer.aggregate({
      where: championshipFilter,
      _sum: { rebuysCount: true },
    });

    // Get all finished CHAMPIONSHIP participations for detailed stats
    const allTournamentParticipations = await prisma.tournamentPlayer.findMany({
      where: championshipFilter,
      orderBy: {
        tournament: { date: 'asc' },
      },
      include: {
        tournament: true,
      },
    });

    // 4. Deadliest tournament (most eliminations in one tournament)
    const deadliestTournament = allTournamentParticipations.reduce(
      (max, tp) => (tp.eliminationsCount > (max?.eliminationsCount || 0) ? tp : max),
      null as typeof allTournamentParticipations[0] | null
    );

    // 5. Best comeback (victory with most rebuys)
    const bestComeback = allTournamentParticipations
      .filter(tp => tp.finalRank === 1)
      .reduce(
        (max, tp) => (tp.rebuysCount > (max?.rebuysCount || 0) ? tp : max),
        null as typeof allTournamentParticipations[0] | null
      );

    // 6. Bubble boy count (4th place finishes)
    const bubbleBoyCount = allTournamentParticipations.filter(
      tp => tp.finalRank === 4
    ).length;

    // 7. Iron Man tournaments (0 rebuys)
    const ironManTournaments = allTournamentParticipations.filter(
      tp => tp.rebuysCount === 0
    ).length;

    // 8. Total winnings and losses (CHAMPIONSHIP only)
    const totalWinningsSum = await prisma.tournamentPlayer.aggregate({
      where: championshipFilter,
      _sum: { prizeAmount: true },
    });
    const totalWinnings = totalWinningsSum._sum.prizeAmount || 0;

    // Calculate total losses (buy-ins + rebuys + light rebuys) and total rebuy amount
    let totalLosses = 0;
    let totalRebuyAmount = 0;
    for (const tp of allTournamentParticipations) {
      const buyIn = tp.tournament.buyInAmount || 0;
      const lightRebuyAmount = tp.tournament.lightRebuyAmount || 0;

      // Base buy-in (if player paid)
      totalLosses += buyIn;

      // Full rebuys (each rebuy costs buyIn amount)
      const fullRebuysCost = tp.rebuysCount * buyIn;
      totalLosses += fullRebuysCost;
      totalRebuyAmount += fullRebuysCost;

      // Light rebuy (half stack, costs lightRebuyAmount)
      if (tp.lightRebuyUsed) {
        totalLosses += lightRebuyAmount;
        totalRebuyAmount += lightRebuyAmount;
      }
    }

    // Net profit/loss
    const netProfit = totalWinnings - totalLosses;

    // 9. Win rate and ITM rate
    const winRate = totalTournaments > 0 ? Math.round((victories / totalTournaments) * 100) : 0;
    const itmRate = totalTournaments > 0 ? Math.round((podiums / totalTournaments) * 100) : 0;

    // 10. Best streak (consecutive podiums)
    let bestStreak = 0;
    let currentStreak = 0;
    for (const tp of allTournamentParticipations) {
      if (tp.finalRank && tp.finalRank <= 3) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    // 11. Early exit count (bottom 3 finishes)
    const earlyExits = allTournamentParticipations.filter(tp => {
      if (!tp.finalRank || !tp.tournament.totalPlayers) return false;
      return tp.finalRank > tp.tournament.totalPlayers - 3;
    }).length;

    // Calculate badges
    const badges = [];

    // 🏆 Champion - At least 1 victory
    if (victories >= 1) {
      badges.push({
        id: 'champion',
        name: 'Champion',
        icon: '🏆',
        description: 'Remporté au moins 1 victoire',
        rarity: 'gold',
      });
    }

    // 🥇 Serial Winner - 3+ victories
    if (victories >= 3) {
      badges.push({
        id: 'serial-winner',
        name: 'Serial Winner',
        icon: '🥇',
        description: 'Remporté 3 victoires ou plus',
        rarity: 'legendary',
      });
    }

    // 🥉 Podium Regular - 5+ podiums
    if (podiums >= 5) {
      badges.push({
        id: 'podium-regular',
        name: 'Habitué du Podium',
        icon: '🥉',
        description: '5 podiums ou plus',
        rarity: 'gold',
      });
    }

    // 💀 Shark - 20+ total eliminations
    const totalEliminations = totalEliminationsSum._sum.eliminationsCount || 0;
    if (totalEliminations >= 20) {
      badges.push({
        id: 'shark',
        name: 'Requin',
        icon: '💀',
        description: '20 éliminations ou plus',
        rarity: 'epic',
      });
    }

    // 👑 King Slayer - 5+ leader kills
    const totalLeaderKills = totalLeaderKillsSum._sum.leaderKills || 0;
    if (totalLeaderKills >= 5) {
      badges.push({
        id: 'king-slayer',
        name: 'Tueur de Roi',
        icon: '👑',
        description: '5 éliminations de leader ou plus',
        rarity: 'epic',
      });
    }

    // 🔥 Phoenix - 10+ total rebuys
    const totalLightRebuysCount = allTournamentParticipations.filter(tp => tp.lightRebuyUsed).length;
    const totalRebuys = (totalRebuysSum._sum.rebuysCount || 0) + totalLightRebuysCount * 0.5;
    if (totalRebuys >= 10) {
      badges.push({
        id: 'phoenix',
        name: 'Phoenix',
        icon: '🔥',
        description: '10 recaves ou plus (renaître de ses cendres)',
        rarity: 'rare',
      });
    }

    // 🛡️ Iron Man - 5+ tournaments with 0 rebuys
    if (ironManTournaments >= 5) {
      badges.push({
        id: 'iron-man',
        name: 'Iron Man',
        icon: '🛡️',
        description: '5 tournois ou plus sans recave',
        rarity: 'epic',
      });
    }

    // 💰 Money Maker - Total winnings > 100€
    if (totalWinnings >= 100) {
      badges.push({
        id: 'money-maker',
        name: 'Money Maker',
        icon: '💰',
        description: 'Plus de 100€ de gains',
        rarity: 'gold',
      });
    }

    // 🎯 Consistent - 10+ tournaments played
    if (totalTournaments >= 10) {
      badges.push({
        id: 'consistent',
        name: 'Régulier',
        icon: '🎯',
        description: '10 tournois ou plus joués',
        rarity: 'common',
      });
    }

    // 🌟 Legend - 20+ tournaments played
    if (totalTournaments >= 20) {
      badges.push({
        id: 'legend',
        name: 'Légende',
        icon: '🌟',
        description: '20 tournois ou plus joués',
        rarity: 'legendary',
      });
    }

    return NextResponse.json({
      player,
      activeSeason,
      upcomingTournaments,
      lastTournament,
      myRanking,
      leaderboardTop10,
      tournamentHistory,
      funStats: {
        // Existing stats
        nemesis,
        favoriteVictim,
        totalTournaments,
        victories,
        podiums,
        totalEliminations,
        totalLeaderKills,
        totalRebuys,
        // New stats
        deadliestTournament: deadliestTournament ? {
          tournamentId: deadliestTournament.tournamentId,
          tournamentName: deadliestTournament.tournament.name,
          tournamentDate: deadliestTournament.tournament.date,
          eliminationsCount: deadliestTournament.eliminationsCount,
        } : null,
        bestComeback: bestComeback ? {
          tournamentId: bestComeback.tournamentId,
          tournamentName: bestComeback.tournament.name,
          tournamentDate: bestComeback.tournament.date,
          rebuysCount: bestComeback.rebuysCount + (bestComeback.lightRebuyUsed ? 0.5 : 0),
        } : null,
        bubbleBoyCount,
        ironManTournaments,
        totalWinnings,
        totalLosses,
        totalRebuyAmount,
        netProfit,
        winRate,
        itmRate,
        bestStreak,
        earlyExits,
      },
      badges,
    });
  } catch (error) {
    console.error('Error fetching player dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player dashboard' },
      { status: 500 }
    );
  }
}
