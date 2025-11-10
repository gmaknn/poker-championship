import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Réinitialiser le timer du tournoi
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

    // Réinitialiser le timer
    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        timerStartedAt: null,
        timerPausedAt: null,
        timerElapsedSeconds: 0,
        currentLevel: 1,
        status: 'PLANNED',
      },
    });

    return NextResponse.json({
      success: true,
      tournament: updatedTournament,
    });
  } catch (error) {
    console.error('Error resetting timer:', error);
    return NextResponse.json(
      { error: 'Failed to reset timer' },
      { status: 500 }
    );
  }
}
