import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';
import { computeRecavePenalty, parseRecavePenaltyRules } from '@/lib/scoring';

/**
 * DELETE - Annuler le dernier bust du tournoi
 *
 * Safety guards:
 * - Vérifie qu'aucune élimination définitive n'a eu lieu après ce bust
 * - Restaure le eliminationsCount du killer si applicable
 * - SI recaveApplied=true: annule aussi la recave liée (décrémente rebuysCount)
 * - Transaction atomique
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Récupérer le tournoi avec la saison (pour recalculer pénalités si recave annulée)
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
        { error: 'Le tournoi est terminé' },
        { status: 400 }
      );
    }

    // Récupérer le dernier bust (avec rebuysCount pour annuler la recave si nécessaire)
    const lastBust = await prisma.bustEvent.findFirst({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
      include: {
        eliminated: {
          select: {
            id: true,
            playerId: true,
            rebuysCount: true,
            finalRank: true,
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
    if (lastBust.eliminated.finalRank !== null) {
      return NextResponse.json(
        { error: 'Le joueur a déjà été éliminé définitivement' },
        { status: 400 }
      );
    }

    // Référence pour la transaction
    const eliminatedPlayer = lastBust.eliminated;

    // === TRANSACTION ATOMIQUE ===
    let recaveCancelled = false;
    await prisma.$transaction(async (tx) => {
      // Si le bust avait une recave appliquée, l'annuler d'abord
      if (lastBust.recaveApplied) {
        const newRebuysCount = Math.max(0, eliminatedPlayer.rebuysCount - 1);

        // Recalculer les pénalités
        let penaltyPoints = 0;
        if (tournament.season) {
          const rules = parseRecavePenaltyRules(tournament.season);
          penaltyPoints = computeRecavePenalty(newRebuysCount, rules);
        }

        await tx.tournamentPlayer.update({
          where: { id: lastBust.eliminatedId },
          data: {
            rebuysCount: newRebuysCount,
            penaltyPoints,
          },
        });

        recaveCancelled = true;
      }

      // Si un killer était spécifié, décrémenter son count d'éliminations
      if (lastBust.killerId) {
        await tx.tournamentPlayer.update({
          where: { id: lastBust.killerId },
          data: {
            eliminationsCount: { decrement: 1 },
          },
        });
      }

      // Supprimer le bust
      await tx.bustEvent.delete({
        where: { id: lastBust.id },
      });
    });

    // Émettre l'événement via WebSocket
    emitToTournament(tournamentId, 'bust:cancelled', {
      tournamentId,
      bustId: lastBust.id,
      eliminatedName: lastBust.eliminated.player.nickname,
      killerName: lastBust.killer?.player.nickname || null,
      recaveCancelled,
    });

    const message = recaveCancelled
      ? `Bust et recave de ${lastBust.eliminated.player.nickname} annulés`
      : `Bust de ${lastBust.eliminated.player.nickname} annulé`;

    return NextResponse.json({
      success: true,
      message,
      cancelledBust: {
        id: lastBust.id,
        eliminatedName: lastBust.eliminated.player.nickname,
        killerName: lastBust.killer?.player.nickname || null,
        level: lastBust.level,
      },
      recaveCancelled,
    });
  } catch (error) {
    console.error('Error cancelling last bust:', error);
    return NextResponse.json(
      { error: 'Échec de l\'annulation du bust' },
      { status: 500 }
    );
  }
}
