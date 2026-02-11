import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { pauseTimerForTournament } from '@/lib/timer-actions';

// POST - Mettre en pause le timer du tournoi
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
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', id);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier que le timer est en cours
    if (!tournament.timerStartedAt || tournament.timerPausedAt) {
      return NextResponse.json(
        { error: 'Timer is not running' },
        { status: 400 }
      );
    }

    // Mettre en pause via l'utilitaire partagé (DB + WebSocket)
    await pauseTimerForTournament(id);

    // Récupérer le tournoi mis à jour pour la réponse
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error('Error pausing timer:', error);
    return NextResponse.json(
      { error: 'Failed to pause timer' },
      { status: 500 }
    );
  }
}
