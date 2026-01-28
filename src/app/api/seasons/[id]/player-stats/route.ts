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
                lightRebuyUsed: true,
                penaltyPoints: true,
                bonusPoints: true,
                finalRank: true,
                prizeAmount: true,
                eliminationsCount: true, // Final eliminations (after rebuy period)
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
            // Include bust events to count eliminations and rebuy busts
            bustEvents: {
              select: {
                eliminatedId: true,
                killerId: true,
                recaveApplied: true,
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
      totalRebuys: number; // Decimal: 0.5 for light rebuy, 1 for full
      totalPenalty: number;
      tableFinals: number;
      itm: number;
      top3: number;
      victories: number;
      finalEliminations: number; // Eliminations after rebuy period (same as Top Sharks)
      rebuyBusts: number;        // Times this player eliminated someone who then rebuyed
      totalBonusPoints: number;
      totalLosses: number;
      totalGains: number;
    }>();

    // Process each tournament
    for (const tournament of season.tournaments) {
      const buyIn = tournament.buyInAmount;
      const rebuyPrice = tournament.buyInAmount; // Full rebuy = buy-in price (10€)
      const lightRebuyPrice = tournament.lightRebuyAmount || buyIn / 2; // Light = 5€

      // Map TournamentPlayer ID to playerId
      const tpIdToPlayerIdMap = new Map<string, string>();
      for (const tp of tournament.tournamentPlayers) {
        tpIdToPlayerIdMap.set(tp.id, tp.playerId);
      }

      // Count busts given (eliminations) and rebuy busts per player
      // bustsGiven = times this player eliminated someone
      // rebuyBusts = times this player eliminated someone who then rebuyed
      const bustsGivenMap = new Map<string, number>();
      const rebuyBustsMap = new Map<string, number>();

      for (const bust of tournament.bustEvents) {
        if (bust.killerId) {
          const killerPlayerId = tpIdToPlayerIdMap.get(bust.killerId);
          if (killerPlayerId) {
            // Count total busts given
            bustsGivenMap.set(killerPlayerId, (bustsGivenMap.get(killerPlayerId) || 0) + 1);
            // Count rebuy busts (eliminations where victim rebuyed)
            if (bust.recaveApplied) {
              rebuyBustsMap.set(killerPlayerId, (rebuyBustsMap.get(killerPlayerId) || 0) + 1);
            }
          }
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
            finalEliminations: 0,
            rebuyBusts: 0,
            totalBonusPoints: 0,
            totalLosses: 0,
            totalGains: 0,
          };
          playerStatsMap.set(tp.playerId, stats);
        }

        stats.tournamentsCount++;
        stats.totalPoints += tp.totalPoints;
        stats.totalPenalty += tp.penaltyPoints;
        stats.totalBonusPoints += tp.bonusPoints;

        // Calculate rebuys as decimal (0.5 for light, 1 for full)
        // rebuysCount is the total number of rebuys
        // lightRebuyUsed indicates if one of them was a light rebuy
        let rebuysDecimal = tp.rebuysCount;
        if (tp.lightRebuyUsed && tp.rebuysCount > 0) {
          // One of the rebuys was light (0.5 instead of 1)
          rebuysDecimal = tp.rebuysCount - 0.5;
        }
        stats.totalRebuys += rebuysDecimal;

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

        // Final eliminations (after rebuy period) - same as Top Sharks data
        stats.finalEliminations += tp.eliminationsCount || 0;
        // Rebuy busts (eliminations where victim rebuyed)
        stats.rebuyBusts += rebuyBustsMap.get(tp.playerId) || 0;

        // Mises = buy-in + (rebuys in euros)
        // rebuysDecimal already accounts for light (0.5) vs full (1)
        // Each unit of rebuy = rebuyPrice (10€)
        stats.totalLosses += buyIn + (rebuysDecimal * rebuyPrice);
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
