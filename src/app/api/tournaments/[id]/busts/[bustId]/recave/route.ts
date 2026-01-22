import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';
import { computeRecavePenalty, parseRecavePenaltyRules } from '@/lib/scoring';
import { calculateEffectiveLevel, areRecavesOpen } from '@/lib/tournament-utils';

/**
 * POST - Appliquer une recave depuis un bust
 *
 * Cette action:
 * 1. Vérifie que le bust existe et n'a pas déjà une recave appliquée
 * 2. Applique la recave au joueur (incrémente rebuysCount)
 * 3. Marque le bust comme recaveApplied=true
 * Le tout dans une transaction atomique.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bustId: string }> }
) {
  try {
    const { id: tournamentId, bustId } = await params;

    // Récupérer le tournoi avec la saison et les blindLevels
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
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

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Le tournoi n\'est pas en cours' },
        { status: 400 }
      );
    }

    // Vérifier que les recaves sont ouvertes
    // (inclut la pause suivant "Fin recaves" pour permettre les recaves light)
    const effectiveLevel = calculateEffectiveLevel(tournament, tournament.blindLevels);
    if (!areRecavesOpen(tournament, effectiveLevel, tournament.blindLevels)) {
      return NextResponse.json(
        { error: 'La période de recaves est terminée' },
        { status: 400 }
      );
    }

    // Récupérer le bust
    const bust = await prisma.bustEvent.findUnique({
      where: { id: bustId },
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
      },
    });

    if (!bust) {
      return NextResponse.json(
        { error: 'Bust non trouvé' },
        { status: 404 }
      );
    }

    if (bust.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Ce bust n\'appartient pas à ce tournoi' },
        { status: 400 }
      );
    }

    if (bust.recaveApplied) {
      return NextResponse.json(
        { error: 'Une recave a déjà été appliquée pour ce bust' },
        { status: 400 }
      );
    }

    // Vérifier que le joueur n'est pas éliminé définitivement
    if (bust.eliminated.finalRank !== null) {
      return NextResponse.json(
        { error: 'Le joueur a été éliminé définitivement' },
        { status: 400 }
      );
    }

    // === TRANSACTION ATOMIQUE ===
    const result = await prisma.$transaction(async (tx) => {
      // Calculer les nouvelles valeurs
      const newRebuysCount = bust.eliminated.rebuysCount + 1;

      // Calculer les malus de recave selon la saison
      // Note: light rebuy compte comme 0.5 recave dans le calcul du malus
      let penaltyPoints = 0;
      if (tournament.season) {
        const rules = parseRecavePenaltyRules(tournament.season);
        penaltyPoints = computeRecavePenalty(newRebuysCount, rules, bust.eliminated.lightRebuyUsed);
      }

      // Mettre à jour le joueur (incrémenter rebuysCount)
      const updatedPlayer = await tx.tournamentPlayer.update({
        where: { id: bust.eliminatedId },
        data: {
          rebuysCount: newRebuysCount,
          penaltyPoints,
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
      });

      // Marquer le bust comme ayant une recave appliquée
      await tx.bustEvent.update({
        where: { id: bustId },
        data: {
          recaveApplied: true,
        },
      });

      return { updatedPlayer, newRebuysCount, penaltyPoints };
    });

    // Émettre l'événement via WebSocket
    emitToTournament(tournamentId, 'rebuy:applied', {
      tournamentId,
      playerId: bust.eliminated.playerId,
      playerName: result.updatedPlayer.player.nickname,
      rebuysCount: result.newRebuysCount,
      fromBustId: bustId,
    });

    return NextResponse.json({
      success: true,
      message: `Recave appliquée pour ${result.updatedPlayer.player.nickname}`,
      tournamentPlayer: result.updatedPlayer,
      bustId,
      penaltyPoints: result.penaltyPoints,
    });
  } catch (error) {
    console.error('Error applying recave from bust:', error);
    return NextResponse.json(
      { error: 'Échec de l\'application de la recave' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Annuler une recave appliquée depuis un bust
 *
 * Cette action:
 * 1. Vérifie que le bust a bien une recave appliquée
 * 2. Décrémente le rebuysCount du joueur
 * 3. Marque le bust comme recaveApplied=false
 * Le tout dans une transaction atomique.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; bustId: string }> }
) {
  try {
    const { id: tournamentId, bustId } = await params;

    // Récupérer le tournoi avec la saison
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
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

    // Récupérer le bust
    const bust = await prisma.bustEvent.findUnique({
      where: { id: bustId },
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
      },
    });

    if (!bust) {
      return NextResponse.json(
        { error: 'Bust non trouvé' },
        { status: 404 }
      );
    }

    if (bust.tournamentId !== tournamentId) {
      return NextResponse.json(
        { error: 'Ce bust n\'appartient pas à ce tournoi' },
        { status: 400 }
      );
    }

    if (!bust.recaveApplied) {
      return NextResponse.json(
        { error: 'Aucune recave n\'est associée à ce bust' },
        { status: 400 }
      );
    }

    // === TRANSACTION ATOMIQUE ===
    const result = await prisma.$transaction(async (tx) => {
      // Calculer les nouvelles valeurs
      const newRebuysCount = Math.max(0, bust.eliminated.rebuysCount - 1);

      // Recalculer les malus de recave selon la saison
      // Note: light rebuy compte comme 0.5 recave dans le calcul du malus
      let penaltyPoints = 0;
      if (tournament.season) {
        const rules = parseRecavePenaltyRules(tournament.season);
        penaltyPoints = computeRecavePenalty(newRebuysCount, rules, bust.eliminated.lightRebuyUsed);
      }

      // Mettre à jour le joueur (décrémenter rebuysCount)
      const updatedPlayer = await tx.tournamentPlayer.update({
        where: { id: bust.eliminatedId },
        data: {
          rebuysCount: newRebuysCount,
          penaltyPoints,
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
      });

      // Retirer le flag recaveApplied du bust
      await tx.bustEvent.update({
        where: { id: bustId },
        data: {
          recaveApplied: false,
        },
      });

      return { updatedPlayer, newRebuysCount, penaltyPoints };
    });

    // Émettre l'événement via WebSocket
    emitToTournament(tournamentId, 'rebuy:cancelled', {
      tournamentId,
      playerId: bust.eliminated.playerId,
      playerName: result.updatedPlayer.player.nickname,
      rebuysCount: result.newRebuysCount,
      fromBustId: bustId,
    });

    return NextResponse.json({
      success: true,
      message: `Recave annulée pour ${result.updatedPlayer.player.nickname}`,
      tournamentPlayer: result.updatedPlayer,
      bustId,
    });
  } catch (error) {
    console.error('Error cancelling recave from bust:', error);
    return NextResponse.json(
      { error: 'Échec de l\'annulation de la recave' },
      { status: 500 }
    );
  }
}
