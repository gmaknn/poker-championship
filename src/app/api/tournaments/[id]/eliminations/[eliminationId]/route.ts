import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';

// DELETE - Annuler une élimination (en cas d'erreur)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eliminationId: string }> }
) {
  try {
    const { id: tournamentId, eliminationId } = await params;

    // Récupérer l'élimination
    const elimination = await prisma.elimination.findUnique({
      where: { id: eliminationId },
      include: {
        tournament: true,
      },
    });

    if (!elimination) {
      return NextResponse.json(
        { error: 'Elimination not found' },
        { status: 404 }
      );
    }

    if (elimination.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Elimination does not belong to this tournament' },
        { status: 400 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, elimination.tournament.createdById, 'manage');
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier que c'est la dernière élimination (on ne peut annuler que la dernière)
    const lastElimination = await prisma.elimination.findFirst({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastElimination || lastElimination.id !== eliminationId) {
      return NextResponse.json(
        { error: 'Can only cancel the most recent elimination' },
        { status: 400 }
      );
    }

    // Annuler l'élimination dans une transaction
    await prisma.$transaction(async (tx) => {
      // Supprimer l'élimination
      await tx.elimination.delete({
        where: { id: eliminationId },
      });

      // Remettre le finalRank du joueur éliminé à null
      await tx.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: elimination.eliminatedId,
          },
        },
        data: {
          finalRank: null,
        },
      });

      // Décrémenter le nombre d'éliminations de l'éliminateur
      await tx.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: elimination.eliminatorId,
          },
        },
        data: {
          eliminationsCount: { decrement: 1 },
          leaderKills: elimination.isLeaderKill ? { decrement: 1 } : undefined,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting elimination:', error);
    return NextResponse.json(
      { error: 'Failed to delete elimination' },
      { status: 500 }
    );
  }
}
