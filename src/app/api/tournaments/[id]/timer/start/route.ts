import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitToTournament } from '@/lib/socket';
import { requireTournamentPermission } from '@/lib/auth-helpers';

// POST - Démarrer le timer du tournoi
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
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

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage');
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier qu'il y a des blind levels
    if (tournament.blindLevels.length === 0) {
      return NextResponse.json(
        { error: 'Cannot start timer without blind structure' },
        { status: 400 }
      );
    }

    // Vérifier que le timer n'est pas déjà démarré
    if (tournament.timerStartedAt && !tournament.timerPausedAt) {
      return NextResponse.json(
        { error: 'Timer is already running' },
        { status: 400 }
      );
    }

    // Démarrer le timer
    const now = new Date();
    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        timerStartedAt: now,
        timerPausedAt: null,
        currentLevel: 1,
      },
    });

    // Émettre l'événement WebSocket
    emitToTournament(id, 'timer:started', {
      tournamentId: id,
      startedAt: now,
      currentLevel: 1,
    });

    emitToTournament(id, 'tournament:status_change', {
      tournamentId: id,
      status: 'IN_PROGRESS',
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error('Error starting timer:', error);
    return NextResponse.json(
      { error: 'Failed to start timer' },
      { status: 500 }
    );
  }
}
