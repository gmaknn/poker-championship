import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { computeRecavePenalty, parseRecavePenaltyRules } from '@/lib/scoring';

// DELETE - Annuler la dernière recave enregistrée
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Récupérer le tournoi
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
      },
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
        { error: 'Tournament is finished' },
        { status: 400 }
      );
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Tournament is not in progress' },
        { status: 400 }
      );
    }

    // Trouver le joueur avec la recave la plus récente
    // On cherche les joueurs qui ont au moins 1 recave (rebuysCount > 0)
    // et on prend celui avec le updatedAt le plus récent
    const playersWithRebuys = await prisma.tournamentPlayer.findMany({
      where: {
        tournamentId,
        rebuysCount: { gt: 0 },
      },
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
      orderBy: {
        updatedAt: 'desc',
      },
      take: 1,
    });

    if (playersWithRebuys.length === 0) {
      return NextResponse.json(
        { error: 'Aucune recave à annuler' },
        { status: 400 }
      );
    }

    const lastRebuyPlayer = playersWithRebuys[0];

    // === TRANSACTION ATOMIQUE ===
    const result = await prisma.$transaction(async (tx) => {
      // Re-lecture atomique
      const currentPlayer = await tx.tournamentPlayer.findUnique({
        where: { id: lastRebuyPlayer.id },
      });

      if (!currentPlayer || currentPlayer.rebuysCount === 0) {
        throw new Error('NO_REBUY_TO_CANCEL');
      }

      const newRebuysCount = currentPlayer.rebuysCount - 1;

      // Recalculer les malus de recave selon la saison (fonction centralisée)
      let penaltyPoints = 0;
      if (tournament.season) {
        const rules = parseRecavePenaltyRules(tournament.season);
        penaltyPoints = computeRecavePenalty(newRebuysCount, rules);
      }

      // Mise à jour atomique avec vérification optimiste
      const updateResult = await tx.tournamentPlayer.updateMany({
        where: {
          id: lastRebuyPlayer.id,
          rebuysCount: currentPlayer.rebuysCount, // Optimistic lock
        },
        data: {
          rebuysCount: newRebuysCount,
          penaltyPoints,
        },
      });

      if (updateResult.count !== 1) {
        throw new Error('CONCURRENT_MODIFICATION');
      }

      // Récupérer le joueur mis à jour
      const updatedPlayer = await tx.tournamentPlayer.findUnique({
        where: { id: lastRebuyPlayer.id },
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
      });

      return {
        updatedPlayer,
        cancelledRebuyCount: currentPlayer.rebuysCount,
        newRebuyCount: newRebuysCount,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Recave annulée pour ${result.updatedPlayer?.player.nickname}`,
      tournamentPlayer: result.updatedPlayer,
      previousRebuysCount: result.cancelledRebuyCount,
      newRebuysCount: result.newRebuyCount,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NO_REBUY_TO_CANCEL') {
        return NextResponse.json(
          { error: 'Aucune recave à annuler' },
          { status: 400 }
        );
      }
      if (error.message === 'CONCURRENT_MODIFICATION') {
        return NextResponse.json(
          { error: 'Modification concurrente détectée, veuillez réessayer' },
          { status: 409 }
        );
      }
    }

    console.error('Error cancelling rebuy:', error);
    return NextResponse.json(
      { error: 'Failed to cancel rebuy' },
      { status: 500 }
    );
  }
}
