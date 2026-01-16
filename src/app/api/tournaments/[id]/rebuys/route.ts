import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { computeRecavePenalty, parseRecavePenaltyRules } from '@/lib/scoring';
import { calculateEffectiveLevel, isBreakAfterRebuyEnd } from '@/lib/tournament-utils';

const rebuySchema = z.object({
  playerId: z.string().cuid(),
  type: z.enum(['STANDARD', 'LIGHT']),
});

// POST - Enregistrer une recave (standard ou light)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Récupérer le tournoi avec la saison et les niveaux de blindes
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

    // Vérifier les permissions (ADMIN ou TD du tournoi ou TD assigné)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const body = await request.json();
    const validatedData = rebuySchema.parse(body);

    // Pre-checks rapides (hors transaction)
    // Block mutations on finished tournaments (readonly)
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

    // Calculer le niveau effectif basé sur le timer (pas la valeur DB qui n'est pas synchronisée)
    const effectiveLevel = calculateEffectiveLevel(tournament, tournament.blindLevels);

    // Vérifier si on est dans la pause juste après rebuyEndLevel (pour LIGHT uniquement)
    const inBreakAfterRebuy = isBreakAfterRebuyEnd(
      tournament.rebuyEndLevel,
      effectiveLevel,
      tournament.blindLevels
    );

    // Guard: période de recaves terminée
    // - STANDARD: bloqué si effectiveLevel > rebuyEndLevel
    // - LIGHT: autorisé pendant la pause juste après rebuyEndLevel
    if (tournament.rebuyEndLevel && effectiveLevel > tournament.rebuyEndLevel) {
      const isLightDuringBreak = validatedData.type === 'LIGHT' && inBreakAfterRebuy;
      if (!isLightDuringBreak) {
        return NextResponse.json(
          { error: 'Période de recaves terminée' },
          { status: 400 }
        );
      }
    }

    // Récupérer le joueur inscrit (pre-check rapide)
    const tournamentPlayer = await prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId: validatedData.playerId,
        },
      },
    });

    if (!tournamentPlayer) {
      return NextResponse.json(
        { error: 'Player is not enrolled in this tournament' },
        { status: 404 }
      );
    }

    // Pre-check rapide : joueur éliminé
    if (tournamentPlayer.finalRank !== null) {
      return NextResponse.json(
        { error: 'Player has been eliminated' },
        { status: 400 }
      );
    }

    // Pre-check rapide : max rebuys
    if (validatedData.type === 'STANDARD' && tournament.maxRebuysPerPlayer !== null) {
      if (tournamentPlayer.rebuysCount >= tournament.maxRebuysPerPlayer) {
        return NextResponse.json(
          { error: `Maximum rebuys reached (${tournament.maxRebuysPerPlayer})` },
          { status: 400 }
        );
      }
    }

    // Pre-check rapide : light rebuy
    // Note: lightRebuyEnabled flag removed - LIGHT is always allowed when rebuy period is open
    if (validatedData.type === 'LIGHT') {
      if (tournamentPlayer.lightRebuyUsed) {
        return NextResponse.json(
          { error: 'Player has already used their light rebuy' },
          { status: 400 }
        );
      }
    }

    // === TRANSACTION ATOMIQUE ===
    // Utiliser updateMany conditionnel (optimistic lock) pour éviter les race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Re-lecture atomique du joueur dans la transaction
      const currentPlayer = await tx.tournamentPlayer.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: validatedData.playerId,
          },
        },
      });

      if (!currentPlayer) {
        throw new Error('PLAYER_NOT_ENROLLED');
      }

      // Re-vérifier joueur non éliminé (race-safe)
      if (currentPlayer.finalRank !== null) {
        throw new Error('PLAYER_ELIMINATED');
      }

      // Re-vérifier max rebuys (race-safe)
      if (validatedData.type === 'STANDARD' && tournament.maxRebuysPerPlayer !== null) {
        if (currentPlayer.rebuysCount >= tournament.maxRebuysPerPlayer) {
          throw new Error('MAX_REBUYS_REACHED');
        }
      }

      // Re-vérifier light rebuy (race-safe)
      if (validatedData.type === 'LIGHT' && currentPlayer.lightRebuyUsed) {
        throw new Error('LIGHT_REBUY_ALREADY_USED');
      }

      // Calculer les nouvelles valeurs
      const newRebuysCount = currentPlayer.rebuysCount + (validatedData.type === 'STANDARD' ? 1 : 0);
      const lightRebuyUsed = validatedData.type === 'LIGHT' ? true : currentPlayer.lightRebuyUsed;

      // Calculer les malus de recave selon la saison (fonction centralisée)
      let penaltyPoints = 0;
      if (tournament.season) {
        const rules = parseRecavePenaltyRules(tournament.season);
        penaltyPoints = computeRecavePenalty(newRebuysCount, rules);
      }

      // === ÉCRITURE ATOMIQUE avec updateMany conditionnel (optimistic lock) ===
      // Condition sur rebuysCount + lightRebuyUsed pour détecter les modifications concurrentes
      const updateCondition: Record<string, unknown> = {
        tournamentId,
        playerId: validatedData.playerId,
        finalRank: null, // Joueur non éliminé
      };

      if (validatedData.type === 'STANDARD') {
        // Pour rebuy standard: vérifier que rebuysCount n'a pas changé
        updateCondition.rebuysCount = currentPlayer.rebuysCount;
      } else {
        // Pour light rebuy: vérifier que lightRebuyUsed est toujours false
        updateCondition.lightRebuyUsed = false;
      }

      const updateResult = await tx.tournamentPlayer.updateMany({
        where: updateCondition,
        data: {
          rebuysCount: newRebuysCount,
          lightRebuyUsed,
          penaltyPoints,
        },
      });

      // Si count != 1, une requête concurrente a modifié l'état
      if (updateResult.count !== 1) {
        if (validatedData.type === 'LIGHT') {
          throw new Error('LIGHT_REBUY_ALREADY_USED');
        }
        throw new Error('MAX_REBUYS_REACHED');
      }

      // Récupérer le joueur mis à jour pour la réponse
      const updatedPlayer = await tx.tournamentPlayer.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: validatedData.playerId,
          },
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

      return { updatedPlayer, penaltyPoints };
    });

    return NextResponse.json({
      success: true,
      tournamentPlayer: result.updatedPlayer,
      rebuyType: validatedData.type,
      penaltyPoints: result.penaltyPoints,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    // Mapper les erreurs de transaction atomique en 400 clairs
    if (error instanceof Error) {
      if (error.message === 'PLAYER_NOT_ENROLLED') {
        return NextResponse.json(
          { error: 'Player is not enrolled in this tournament' },
          { status: 404 }
        );
      }
      if (error.message === 'PLAYER_ELIMINATED') {
        return NextResponse.json(
          { error: 'Player has been eliminated' },
          { status: 400 }
        );
      }
      if (error.message === 'MAX_REBUYS_REACHED') {
        return NextResponse.json(
          { error: 'Maximum rebuys reached' },
          { status: 400 }
        );
      }
      if (error.message === 'LIGHT_REBUY_ALREADY_USED') {
        return NextResponse.json(
          { error: 'Player has already used their light rebuy' },
          { status: 400 }
        );
      }
    }

    console.error('Error processing rebuy:', error);
    return NextResponse.json(
      { error: 'Failed to process rebuy' },
      { status: 500 }
    );
  }
}
