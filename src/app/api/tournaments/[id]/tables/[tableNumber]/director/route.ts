import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';

// PATCH - Désigner/retirer un directeur de table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableNumber: string }> }
) {
  try {
    const { id: tournamentId, tableNumber: tableNumberStr } = await params;
    const tableNumber = parseInt(tableNumberStr, 10);

    if (isNaN(tableNumber)) {
      return NextResponse.json({ error: 'Numéro de table invalide' }, { status: 400 });
    }

    const body = await request.json();
    const { playerId, isTableDirector } = body;

    if (!playerId || typeof isTableDirector !== 'boolean') {
      return NextResponse.json(
        { error: 'playerId et isTableDirector requis' },
        { status: 400 }
      );
    }

    // Vérifier le tournoi
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournoi introuvable' }, { status: 404 });
    }

    // Permissions : ADMIN ou TD du tournoi
    const permResult = await requireTournamentPermission(
      request,
      tournament.createdById,
      'manage',
      tournamentId
    );
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier que l'assignation existe
    const assignment = await prisma.tableAssignment.findFirst({
      where: {
        tournamentId,
        tableNumber,
        playerId,
        isActive: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Joueur non trouvé à cette table' },
        { status: 404 }
      );
    }

    // Transaction : 1 seul DT par table
    await prisma.$transaction(async (tx) => {
      if (isTableDirector) {
        // Retirer le DT actuel de cette table
        await tx.tableAssignment.updateMany({
          where: {
            tournamentId,
            tableNumber,
            isActive: true,
            isTableDirector: true,
          },
          data: { isTableDirector: false },
        });
      }

      // Mettre à jour le joueur ciblé
      await tx.tableAssignment.update({
        where: { id: assignment.id },
        data: { isTableDirector },
      });
    });

    return NextResponse.json({ success: true, isTableDirector });
  } catch (error) {
    console.error('Error toggling table director:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du directeur de table' },
      { status: 500 }
    );
  }
}
