import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { rebalanceTablesBetweenExisting } from '@/lib/table-rebalance';

// POST - Rééquilibrage intelligent des tables (filet de sécurité)
// Corrige les déséquilibres sans redistribuer tout le monde
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        status: true,
        createdById: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Tournament is not in progress' }, { status: 400 });
    }

    const moves = await rebalanceTablesBetweenExisting(tournamentId, {
      emitSocketEvents: true,
    });

    if (moves.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'Tables already balanced' });
    }

    return NextResponse.json({
      success: true,
      moves,
      totalMoves: moves.length,
    });
  } catch (error) {
    console.error('Error in smart-rebalance:', error);
    return NextResponse.json(
      { error: 'Failed to smart-rebalance tables' },
      { status: 500 }
    );
  }
}
