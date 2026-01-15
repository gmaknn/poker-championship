/**
 * TEMPORARY DIAGNOSTIC ENDPOINT
 * Read tournament directly from DB to verify rebuyEndLevel persistence
 * DELETE THIS FILE AFTER DIAGNOSIS
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDiagnosticHeaders } from '@/lib/app-version';
import { areRecavesOpen } from '@/lib/tournament-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only allow if RECIPE_DIAGNOSTICS is enabled
  if (process.env.RECIPE_DIAGNOSTICS !== '1') {
    return NextResponse.json(
      { error: 'Diagnostic endpoint disabled' },
      { status: 403 }
    );
  }

  const { id } = await params;

  // Raw DB read - no transformations
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      rebuyEndLevel: true,
      currentLevel: true,
      status: true,
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const response = NextResponse.json({
    _diagnostic: true,
    _timestamp: new Date().toISOString(),
    tournament: {
      id: tournament.id,
      rebuyEndLevel: tournament.rebuyEndLevel,
      rebuyEndLevelType: typeof tournament.rebuyEndLevel,
      rebuyEndLevelIsNull: tournament.rebuyEndLevel === null,
      rebuyEndLevelIsZero: tournament.rebuyEndLevel === 0,
      currentLevel: tournament.currentLevel,
      status: tournament.status,
    },
  });

  const headers = getDiagnosticHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * DIAGNOSTIC PATCH - Test rebuyEndLevel persistence
 * DELETE AFTER DIAGNOSIS
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only allow if RECIPE_DIAGNOSTICS is enabled
  if (process.env.RECIPE_DIAGNOSTICS !== '1') {
    return NextResponse.json(
      { error: 'Diagnostic endpoint disabled' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  // Trace input
  const inputTrace = {
    bodyRebuyEndLevel: body.rebuyEndLevel,
    bodyType: typeof body.rebuyEndLevel,
    bodyIsNull: body.rebuyEndLevel === null,
    bodyIsZero: body.rebuyEndLevel === 0,
    bodyIsUndefined: body.rebuyEndLevel === undefined,
  };

  // Read BEFORE
  const before = await prisma.tournament.findUnique({
    where: { id },
    select: { rebuyEndLevel: true },
  });

  if (!before) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Perform raw Prisma update with explicit rebuyEndLevel
  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      rebuyEndLevel: body.rebuyEndLevel,
    },
    select: { rebuyEndLevel: true },
  });

  // Read AFTER (fresh query)
  const after = await prisma.tournament.findUnique({
    where: { id },
    select: { rebuyEndLevel: true },
  });

  const response = NextResponse.json({
    _diagnostic: true,
    _timestamp: new Date().toISOString(),
    input: inputTrace,
    before: {
      rebuyEndLevel: before.rebuyEndLevel,
      type: typeof before.rebuyEndLevel,
    },
    updateResult: {
      rebuyEndLevel: updated.rebuyEndLevel,
      type: typeof updated.rebuyEndLevel,
    },
    after: {
      rebuyEndLevel: after?.rebuyEndLevel,
      type: typeof after?.rebuyEndLevel,
    },
    conclusion: {
      writeSucceeded: updated.rebuyEndLevel === body.rebuyEndLevel,
      readMatchesWrite: after?.rebuyEndLevel === updated.rebuyEndLevel,
      finalValue: after?.rebuyEndLevel,
    },
  });

  const headers = getDiagnosticHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * DIAGNOSTIC POST - Test elimination flow
 * DELETE AFTER DIAGNOSIS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Only allow if RECIPE_DIAGNOSTICS is enabled
  if (process.env.RECIPE_DIAGNOSTICS !== '1') {
    return NextResponse.json(
      { error: 'Diagnostic endpoint disabled' },
      { status: 403 }
    );
  }

  const { id: tournamentId } = await params;
  const body = await request.json();
  const { action } = body;

  // Action: test-elimination
  if (action === 'test-elimination') {
    const { eliminatedId, eliminatorId } = body;

    // Get tournament state
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        status: true,
        currentLevel: true,
        rebuyEndLevel: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check areRecavesOpen
    const recavesOpen = areRecavesOpen(tournament);

    if (recavesOpen) {
      const response = NextResponse.json({
        _diagnostic: true,
        success: false,
        error: 'Recaves still open - eliminations blocked',
        tournament: {
          status: tournament.status,
          currentLevel: tournament.currentLevel,
          rebuyEndLevel: tournament.rebuyEndLevel,
        },
        areRecavesOpen: recavesOpen,
      }, { status: 400 });

      const headers = getDiagnosticHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Get remaining players count
    const remainingPlayers = await prisma.tournamentPlayer.count({
      where: { tournamentId, finalRank: null },
    });

    // Perform elimination
    const rank = remainingPlayers;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // Update eliminated player
        const updateResult = await tx.tournamentPlayer.updateMany({
          where: {
            tournamentId,
            playerId: eliminatedId,
            finalRank: null,
          },
          data: { finalRank: rank },
        });

        if (updateResult.count !== 1) {
          throw new Error('PLAYER_ALREADY_ELIMINATED');
        }

        // Create elimination record
        const elimination = await tx.elimination.create({
          data: {
            tournamentId,
            eliminatedId,
            eliminatorId,
            rank,
            level: tournament.currentLevel,
            isLeaderKill: false,
          },
        });

        // Update eliminator stats
        await tx.tournamentPlayer.update({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId: eliminatorId,
            },
          },
          data: { eliminationsCount: { increment: 1 } },
        });

        return { elimination, rank };
      });

      const response = NextResponse.json({
        _diagnostic: true,
        success: true,
        elimination: result.elimination,
        rank: result.rank,
        remainingPlayers: remainingPlayers - 1,
      }, { status: 201 });

      const headers = getDiagnosticHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;

    } catch (error) {
      const response = NextResponse.json({
        _diagnostic: true,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 400 });

      const headers = getDiagnosticHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
  }

  // Action: test-finish
  if (action === 'test-finish') {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        tournamentPlayers: {
          select: { playerId: true, finalRank: true },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Check invariants
    const N = tournament.tournamentPlayers.length;
    const playersWithRank = tournament.tournamentPlayers.filter(tp => tp.finalRank !== null);
    const ranks = playersWithRank.map(tp => tp.finalRank as number);
    const uniqueRanks = new Set(ranks);
    const outOfBounds = ranks.some(rank => rank < 1 || rank > N);

    const invariants = {
      totalPlayers: N,
      playersWithRank: playersWithRank.length,
      completeness: playersWithRank.length === N,
      uniqueness: uniqueRanks.size === playersWithRank.length,
      bounds: !outOfBounds,
      allPassing: playersWithRank.length === N && uniqueRanks.size === N && !outOfBounds,
    };

    if (!invariants.allPassing) {
      const response = NextResponse.json({
        _diagnostic: true,
        success: false,
        error: 'Invariants not met',
        invariants,
        players: tournament.tournamentPlayers,
      }, { status: 400 });

      const headers = getDiagnosticHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Update tournament status
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'FINISHED',
        finishedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        finishedAt: true,
      },
    });

    const response = NextResponse.json({
      _diagnostic: true,
      success: true,
      tournament: updated,
      invariants,
    });

    const headers = getDiagnosticHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Action: set-winner-rank
  if (action === 'set-winner-rank') {
    const { playerId } = body;

    await prisma.tournamentPlayer.update({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
      data: { finalRank: 1 },
    });

    const response = NextResponse.json({
      _diagnostic: true,
      success: true,
      message: `Set finalRank=1 for player ${playerId}`,
    });

    const headers = getDiagnosticHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
