/**
 * GET /api/tournaments/[id]/admin-dashboard
 * Aggregated read-only endpoint for Admin Dashboard V1
 *
 * RBAC:
 * - 401: Not authenticated
 * - 403: Not ADMIN or TD (creator/assigned)
 * - 200: ADMIN or TD with manage permission
 *
 * Returns a snapshot of tournament state for dashboard display.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: tournamentId } = await params;

    // Fetch tournament with all needed relations
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
        tournamentPlayers: {
          select: {
            playerId: true,
            finalRank: true,
            rebuysCount: true,
            lightRebuyUsed: true,
          },
        },
        blindLevels: {
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // RBAC: require ADMIN or TD with manage permission
    const permResult = await requireTournamentPermission(
      request,
      tournament.createdById,
      'manage',
      tournamentId
    );

    if (!permResult.success) {
      return NextResponse.json(
        { error: permResult.error },
        { status: permResult.status }
      );
    }

    // === Calculate timer state (same logic as /timer endpoint) ===
    let currentElapsedSeconds = tournament.timerElapsedSeconds;

    if (tournament.timerStartedAt && !tournament.timerPausedAt) {
      const now = new Date();
      const startTime = new Date(tournament.timerStartedAt);
      const additionalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      currentElapsedSeconds += additionalSeconds;
    }

    // Determine current level based on elapsed time
    let calculatedLevel = 1;
    let timeIntoCurrentLevel = currentElapsedSeconds;

    for (const level of tournament.blindLevels) {
      const levelDuration = level.duration * 60;
      if (timeIntoCurrentLevel >= levelDuration) {
        timeIntoCurrentLevel -= levelDuration;
        calculatedLevel = level.level + 1;
      } else {
        calculatedLevel = level.level;
        break;
      }
    }

    // Clamp to max level
    const maxLevel = tournament.blindLevels[tournament.blindLevels.length - 1]?.level || 1;
    if (calculatedLevel > maxLevel) {
      calculatedLevel = maxLevel;
      const lastLevel = tournament.blindLevels[tournament.blindLevels.length - 1];
      timeIntoCurrentLevel = lastLevel ? lastLevel.duration * 60 : 0;
    }

    // Get current level data
    const currentLevelData = tournament.blindLevels.find(
      (bl) => bl.level === calculatedLevel
    );

    const isRunning = !!tournament.timerStartedAt && !tournament.timerPausedAt;
    const isPaused = !!tournament.timerPausedAt;

    // === Calculate player stats ===
    const totalPlayers = tournament.tournamentPlayers.length;
    const eliminatedPlayers = tournament.tournamentPlayers.filter(
      (tp) => tp.finalRank !== null && tp.finalRank > 0
    ).length;
    const remainingPlayers = totalPlayers - eliminatedPlayers;

    // === Calculate rebuy stats ===
    const totalRebuys = tournament.tournamentPlayers.reduce(
      (sum, tp) => sum + tp.rebuysCount,
      0
    );
    const lightRebuysUsed = tournament.tournamentPlayers.filter(
      (tp) => tp.lightRebuyUsed
    ).length;

    // === Calculate alerts ===
    const rebuyWindowClosed = tournament.rebuyEndLevel !== null &&
      calculatedLevel > tournament.rebuyEndLevel;

    const noPlayersRemaining = remainingPlayers === 0;

    // Check leaderboard consistency for FINISHED tournaments
    let finishedLeaderboardInconsistent = false;
    if (tournament.status === 'FINISHED') {
      const N = totalPlayers;
      const allHaveRank = tournament.tournamentPlayers.every(
        (tp) => tp.finalRank !== null
      );

      if (!allHaveRank) {
        finishedLeaderboardInconsistent = true;
      } else {
        const ranks = tournament.tournamentPlayers.map((tp) => tp.finalRank as number);
        const uniqueRanks = new Set(ranks);
        const allInBounds = ranks.every((rank) => rank >= 1 && rank <= N);

        if (uniqueRanks.size !== N || !allInBounds) {
          finishedLeaderboardInconsistent = true;
        }
      }
    }

    // === Calculate level timing ===
    const durationSeconds = currentLevelData ? currentLevelData.duration * 60 : 0;
    const remainingSeconds = Math.max(0, durationSeconds - timeIntoCurrentLevel);

    // === Build response ===
    const response = {
      tournament: {
        id: tournament.id,
        status: tournament.status,
        currentLevel: calculatedLevel,
        rebuyEndLevel: tournament.rebuyEndLevel,
      },
      players: {
        registered: totalPlayers,
        eliminated: eliminatedPlayers,
        remaining: remainingPlayers,
      },
      level: {
        currentLevel: calculatedLevel,
        blinds: {
          smallBlind: currentLevelData?.smallBlind ?? 0,
          bigBlind: currentLevelData?.bigBlind ?? 0,
          ante: currentLevelData?.ante ?? 0,
        },
        durationSeconds,
        secondsIntoCurrentLevel: timeIntoCurrentLevel,
        remainingSeconds,
        isRunning,
        isPaused,
      },
      rebuys: {
        total: totalRebuys,
        lightUsed: lightRebuysUsed,
      },
      alerts: {
        rebuyWindowClosed,
        noPlayersRemaining,
        finishedLeaderboardInconsistent,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin dashboard' },
      { status: 500 }
    );
  }
}
