import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/seasons/[id]/player-stats
 * Get detailed player statistics for a season
 * Includes: TF, ITM, busts received, financial balance
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // Get season with its tournaments and player data
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        tournaments: {
          where: {
            status: 'FINISHED',
            type: 'CHAMPIONSHIP',
          },
          include: {
            tournamentPlayers: {
              select: {
                id: true,
                playerId: true,
                totalPoints: true,
                rebuysCount: true,
                penaltyPoints: true,
                bonusPoints: true,
                finalRank: true,
                prizeAmount: true,
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
            // Include bust events to count how many times each player was busted
            bustEvents: {
              select: {
                eliminatedId: true,
              },
            },
          },
          orderBy: {
            date: 'asc',
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

    // Build player statistics map
    const playerStatsMap = new Map<string, {
      playerId: string;
      firstName: string;
      lastName: string;
      nickname: string;
      avatar: string | null;
      totalPoints: number;
      tournamentsCount: number;
      totalRebuys: number;
      totalPenalty: number;
      tableFinals: number;
      itm: number;
      top3: number;
      victories: number;
      bustsReceived: number;
      totalBonusPoints: number;
      totalLosses: number;
      totalGains: number;
    }>();

    // Process each tournament
    for (const tournament of season.tournaments) {
      const buyIn = tournament.buyInAmount;
      const rebuyAmount = tournament.lightRebuyAmount || buyIn;

      // Count busts received per player in this tournament
      // bustEvents.eliminatedId is the TournamentPlayer ID, we need to map it to playerId
      const bustCountMap = new Map<string, number>();
      const tpIdToPlayerIdMap = new Map<string, string>();
      for (const tp of tournament.tournamentPlayers) {
        tpIdToPlayerIdMap.set(tp.id, tp.playerId);
      }
      for (const bust of tournament.bustEvents) {
        const playerId = tpIdToPlayerIdMap.get(bust.eliminatedId);
        if (playerId) {
          const current = bustCountMap.get(playerId) || 0;
          bustCountMap.set(playerId, current + 1);
        }
      }

      for (const tp of tournament.tournamentPlayers) {
        if (!tp.player) continue;

        let stats = playerStatsMap.get(tp.playerId);
        if (!stats) {
          stats = {
            playerId: tp.playerId,
            firstName: tp.player.firstName,
            lastName: tp.player.lastName,
            nickname: tp.player.nickname,
            avatar: tp.player.avatar,
            totalPoints: 0,
            tournamentsCount: 0,
            totalRebuys: 0,
            totalPenalty: 0,
            tableFinals: 0,
            itm: 0,
            top3: 0,
            victories: 0,
            bustsReceived: 0,
            totalBonusPoints: 0,
            totalLosses: 0,
            totalGains: 0,
          };
          playerStatsMap.set(tp.playerId, stats);
        }

        stats.tournamentsCount++;
        stats.totalPoints += tp.totalPoints;
        stats.totalRebuys += tp.rebuysCount;
        stats.totalPenalty += tp.penaltyPoints;
        stats.totalBonusPoints += tp.bonusPoints;

        // Table Finale = Top 9
        if (tp.finalRank !== null && tp.finalRank <= 9) {
          stats.tableFinals++;
        }

        // ITM = prize amount > 0
        if (tp.prizeAmount !== null && tp.prizeAmount > 0) {
          stats.itm++;
          stats.totalGains += tp.prizeAmount;
        }

        // Top 3 / Victories
        if (tp.finalRank !== null) {
          if (tp.finalRank <= 3) stats.top3++;
          if (tp.finalRank === 1) stats.victories++;
        }

        // Busts received
        const bustCount = bustCountMap.get(tp.playerId) || 0;
        stats.bustsReceived += bustCount;

        // Losses = buy-in + (rebuys * rebuy amount)
        stats.totalLosses += buyIn + (tp.rebuysCount * rebuyAmount);
      }
    }

    // Convert to array and sort by total points
    const playerStats = Array.from(playerStatsMap.values())
      .map((stats, index) => ({
        ...stats,
        rank: 0, // Will be set after sorting
        tableFinalsPct: stats.tournamentsCount > 0
          ? Math.round((stats.tableFinals / stats.tournamentsCount) * 100)
          : 0,
        itmPct: stats.tournamentsCount > 0
          ? Math.round((stats.itm / stats.tournamentsCount) * 100)
          : 0,
        balance: stats.totalGains - stats.totalLosses,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((stats, index) => ({
        ...stats,
        rank: index + 1,
      }));

    return NextResponse.json({
      season: {
        id: season.id,
        name: season.name,
        year: season.year,
      },
      tournamentsPlayed: season.tournaments.length,
      players: playerStats,
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}
