import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';

/**
 * DELETE - Annuler le dernier bust du tournoi
 *
 * Safety guards:
 * - Vérifie qu'aucune élimination définitive n'a eu lieu après ce bust
 * - Restaure le eliminationsCount du killer si applicable
 * - Transaction atomique
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Récupérer le tournoi
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Block mutations on finished tournaments
    if (tournament.status === 'FINISHED') {
      return NextResponse.json(
        { error: 'Le tournoi est terminé' },
        { status: 400 }
      );
    }

    // Récupérer le dernier bust
    const lastBust = await prisma.bustEvent.findFirst({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
      include: {
        eliminated: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                nickname: true,
              },
            },
          },
        },
        killer: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                nickname: true,
              },
            },
          },
        },
      },
    });

    if (!lastBust) {
      return NextResponse.json(
        { error: 'Aucun bust à annuler' },
        { status: 404 }
      );
    }

    // Safety check: vérifier qu'aucune élimination définitive n'a eu lieu après ce bust
    const eliminationsAfterBust = await prisma.elimination.count({
      where: {
        tournamentId,
        createdAt: { gt: lastBust.createdAt },
      },
    });

    if (eliminationsAfterBust > 0) {
      return NextResponse.json(
        {
          error: 'Impossible d\'annuler: des éliminations définitives ont eu lieu après ce bust',
          bustsAfter: eliminationsAfterBust,
        },
        { status: 400 }
      );
    }

    // Safety check: vérifier que le joueur n'a pas été éliminé définitivement entre-temps
    const eliminatedPlayer = await prisma.tournamentPlayer.findUnique({
      where: { id: lastBust.eliminatedId },
    });

    if (eliminatedPlayer?.finalRank !== null) {
      return NextResponse.json(
        { error: 'Le joueur a déjà été éliminé définitivement' },
        { status: 400 }
      );
    }

    // === TRANSACTION ATOMIQUE ===
    await prisma.$transaction(async (tx) => {
      // Supprimer le bust
      await tx.bustEvent.delete({
        where: { id: lastBust.id },
      });

      // Si un killer était spécifié, décrémenter son count d'éliminations
      if (lastBust.killerId) {
        await tx.tournamentPlayer.update({
          where: { id: lastBust.killerId },
          data: {
            eliminationsCount: { decrement: 1 },
          },
        });
      }
    });

    // Émettre l'événement via WebSocket
    emitToTournament(tournamentId, 'bust:cancelled', {
      tournamentId,
      bustId: lastBust.id,
      eliminatedName: lastBust.eliminated.player.nickname,
      killerName: lastBust.killer?.player.nickname || null,
    });

    return NextResponse.json({
      success: true,
      message: `Bust de ${lastBust.eliminated.player.nickname} annulé`,
      cancelledBust: {
        id: lastBust.id,
        eliminatedName: lastBust.eliminated.player.nickname,
        killerName: lastBust.killer?.player.nickname || null,
        level: lastBust.level,
      },
    });
  } catch (error) {
    console.error('Error cancelling last bust:', error);
    return NextResponse.json(
      { error: 'Échec de l\'annulation du bust' },
      { status: 500 }
    );
  }
}
