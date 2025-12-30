import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitToTournament } from '@/lib/socket';
import { requireTournamentPermission } from '@/lib/auth-helpers';

// POST - Reprendre le timer du tournoi
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id },
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

    // Vérifier que le timer est en pause
    if (!tournament.timerPausedAt) {
      return NextResponse.json(
        { error: 'Timer is not paused' },
        { status: 400 }
      );
    }

    // Reprendre le timer
    const now = new Date();
    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        timerStartedAt: now,
        timerPausedAt: null,
        // timerElapsedSeconds reste inchangé
      },
    });

    // Émettre l'événement WebSocket
    emitToTournament(id, 'timer:resumed', {
      tournamentId: id,
      resumedAt: now,
    });

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error('Error resuming timer:', error);
    return NextResponse.json(
      { error: 'Failed to resume timer' },
      { status: 500 }
    );
  }
}
