import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { computeRecavePenalty, parseRecavePenaltyRules } from '@/lib/scoring';
import { calculateEffectiveLevel, isBreakAfterRebuyEnd } from '@/lib/tournament-utils';
import { emitToTournament } from '@/lib/socket';
import { scheduleAutoResume } from '@/lib/timer-actions';

const rebuySchema = z.object({
  playerId: z.string().cuid(),
  type: z.enum(['STANDARD', 'LIGHT']),
  // Rebuy volontaire: joueur non busté qui veut rebuy
  isVoluntary: z.boolean().optional().default(false),
  // Stack actuel du joueur (requis pour rebuy volontaire pour déterminer half/full)
  currentStack: z.number().int().min(0).optional(),
});

// Seuil de stack pour déterminer le type de rebuy volontaire
// >= 3500 = half rebuy (LIGHT, 5€)
// < 3500 = full rebuy (STANDARD, 10€)
const VOLUNTARY_REBUY_STACK_THRESHOLD = 3500;

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
    // Pendant la pause juste après rebuyEndLevel (isVoluntaryRebuyPeriod):
    // - STANDARD ET LIGHT sont autorisés (recave après bust ou rebuy volontaire)
    // Après la pause: tout est bloqué
    if (tournament.rebuyEndLevel && effectiveLevel > tournament.rebuyEndLevel) {
      if (!inBreakAfterRebuy) {
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

    // === REBUY VOLONTAIRE: Logique spéciale ===
    // Si isVoluntary=true, le type de rebuy est déterminé par le stack actuel:
    // - stack >= 3500 -> LIGHT (half rebuy, 5€)
    // - stack < 3500 -> STANDARD (full rebuy, 10€)
    // LIMITE: 1 seul rebuy volontaire par joueur pendant la pause (Light OU Full)
    let effectiveType = validatedData.type;
    let voluntaryStackUpdate: number | null = null;

    if (validatedData.isVoluntary) {
      // Pour un rebuy volontaire, le stack actuel est requis
      if (validatedData.currentStack === undefined) {
        return NextResponse.json(
          { error: 'Le stack actuel est requis pour un rebuy volontaire' },
          { status: 400 }
        );
      }

      // Vérifier la limite : 1 seul rebuy/recave par joueur pendant la pause
      // Un joueur a déjà utilisé son droit s'il a :
      // - lightRebuyUsed OU voluntaryFullRebuyUsed (rebuy volontaire)
      // - OU une recave après bust (bustEvent avec recaveApplied = true)
      const hasVoluntaryRebuy = tournamentPlayer.lightRebuyUsed || tournamentPlayer.voluntaryFullRebuyUsed;

      // Vérifier aussi si le joueur a recavé après un bust PENDANT la pause
      // (seuls les busts au niveau >= rebuyEndLevel comptent)
      const bustWithRecaveDuringPause = tournament.rebuyEndLevel
        ? await prisma.bustEvent.findFirst({
            where: {
              tournamentId,
              eliminatedId: tournamentPlayer.id,
              recaveApplied: true,
              level: { gte: tournament.rebuyEndLevel },
            },
          })
        : null;

      if (hasVoluntaryRebuy || bustWithRecaveDuringPause) {
        return NextResponse.json(
          { error: bustWithRecaveDuringPause
            ? 'Ce joueur a déjà recavé après un bust pendant la pause'
            : 'Ce joueur a déjà utilisé son rebuy volontaire' },
          { status: 400 }
        );
      }

      // Déterminer le type de rebuy basé sur le stack
      if (validatedData.currentStack >= VOLUNTARY_REBUY_STACK_THRESHOLD) {
        // Stack >= 3500 = half rebuy (LIGHT)
        effectiveType = 'LIGHT';
      } else {
        // Stack < 3500 = full rebuy (STANDARD)
        effectiveType = 'STANDARD';
      }

      // Calculer le nouveau stack après rebuy
      // LIGHT (half rebuy): +2500 jetons
      // STANDARD (full rebuy): +5000 jetons (stack de départ)
      const rebuyChips = effectiveType === 'LIGHT' ? 2500 : tournament.startingChips;
      voluntaryStackUpdate = validatedData.currentStack + rebuyChips;
    }

    // Pre-check rapide : max rebuys
    if (effectiveType === 'STANDARD' && tournament.maxRebuysPerPlayer !== null) {
      if (tournamentPlayer.rebuysCount >= tournament.maxRebuysPerPlayer) {
        return NextResponse.json(
          { error: `Maximum rebuys reached (${tournament.maxRebuysPerPlayer})` },
          { status: 400 }
        );
      }
    }

    // Pre-check rapide : light rebuy
    // Note: lightRebuyEnabled flag removed - LIGHT is always allowed when rebuy period is open
    if (effectiveType === 'LIGHT') {
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

      // Re-vérifier limite rebuy volontaire (race-safe) : 1 seul par joueur pendant la pause
      if (validatedData.isVoluntary) {
        if (currentPlayer.lightRebuyUsed || currentPlayer.voluntaryFullRebuyUsed) {
          throw new Error('VOLUNTARY_REBUY_ALREADY_USED');
        }
        // Vérifier aussi les recaves après bust PENDANT la pause (race-safe)
        if (tournament.rebuyEndLevel) {
          const bustRecaveDuringPause = await tx.bustEvent.findFirst({
            where: {
              tournamentId,
              eliminatedId: currentPlayer.id,
              recaveApplied: true,
              level: { gte: tournament.rebuyEndLevel },
            },
          });
          if (bustRecaveDuringPause) {
            throw new Error('BUST_RECAVE_ALREADY_USED');
          }
        }
      }

      // Re-vérifier max rebuys (race-safe)
      if (effectiveType === 'STANDARD' && tournament.maxRebuysPerPlayer !== null) {
        if (currentPlayer.rebuysCount >= tournament.maxRebuysPerPlayer) {
          throw new Error('MAX_REBUYS_REACHED');
        }
      }

      // Re-vérifier light rebuy (race-safe)
      if (effectiveType === 'LIGHT' && currentPlayer.lightRebuyUsed) {
        throw new Error('LIGHT_REBUY_ALREADY_USED');
      }

      // Calculer les nouvelles valeurs
      const newRebuysCount = currentPlayer.rebuysCount + (effectiveType === 'STANDARD' ? 1 : 0);
      const newLightRebuyUsed = effectiveType === 'LIGHT' ? true : currentPlayer.lightRebuyUsed;
      // Tracker si c'est une recave volontaire full (STANDARD sans bust préalable)
      const newVoluntaryFullRebuyUsed = (validatedData.isVoluntary && effectiveType === 'STANDARD')
        ? true
        : currentPlayer.voluntaryFullRebuyUsed;

      // Calculer les malus de recave selon la saison (fonction centralisée)
      // Note: light rebuy compte comme 0.5 recave dans le calcul du malus
      let penaltyPoints = 0;
      if (tournament.season) {
        const rules = parseRecavePenaltyRules(tournament.season);
        penaltyPoints = computeRecavePenalty(newRebuysCount, rules, newLightRebuyUsed);
      }

      // === ÉCRITURE ATOMIQUE avec updateMany conditionnel (optimistic lock) ===
      // Condition sur rebuysCount + lightRebuyUsed pour détecter les modifications concurrentes
      const updateCondition: Record<string, unknown> = {
        tournamentId,
        playerId: validatedData.playerId,
        finalRank: null, // Joueur non éliminé
      };

      if (effectiveType === 'STANDARD') {
        // Pour rebuy standard: vérifier que rebuysCount n'a pas changé
        updateCondition.rebuysCount = currentPlayer.rebuysCount;
      } else {
        // Pour light rebuy: vérifier que lightRebuyUsed est toujours false
        updateCondition.lightRebuyUsed = false;
      }

      // Préparer les données de mise à jour
      const updateData: {
        rebuysCount: number;
        lightRebuyUsed: boolean;
        voluntaryFullRebuyUsed: boolean;
        penaltyPoints: number;
        currentStack?: number;
      } = {
        rebuysCount: newRebuysCount,
        lightRebuyUsed: newLightRebuyUsed,
        voluntaryFullRebuyUsed: newVoluntaryFullRebuyUsed,
        penaltyPoints,
      };

      // Pour rebuy volontaire, mettre à jour le stack
      if (voluntaryStackUpdate !== null) {
        updateData.currentStack = voluntaryStackUpdate;
      }

      const updateResult = await tx.tournamentPlayer.updateMany({
        where: updateCondition as Parameters<typeof tx.tournamentPlayer.updateMany>[0]['where'],
        data: updateData,
      });

      // Si count != 1, une requête concurrente a modifié l'état
      if (updateResult.count !== 1) {
        if (effectiveType === 'LIGHT') {
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

      return { updatedPlayer, penaltyPoints, effectiveType };
    });

    // Émettre l'événement rebuy via WebSocket
    if (result.updatedPlayer?.player?.nickname) {
      emitToTournament(tournamentId, 'rebuy:recorded', {
        tournamentId,
        playerId: validatedData.playerId,
        playerName: result.updatedPlayer.player.nickname,
        rebuyType: result.effectiveType === 'LIGHT' ? 'light' : 'standard',
      });

      // Auto-resume du timer après 5 secondes (le joueur a recavé)
      scheduleAutoResume(tournamentId, 5);
    }

    return NextResponse.json({
      success: true,
      tournamentPlayer: result.updatedPlayer,
      rebuyType: result.effectiveType,
      isVoluntary: validatedData.isVoluntary,
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
      if (error.message === 'VOLUNTARY_REBUY_ALREADY_USED') {
        return NextResponse.json(
          { error: 'Ce joueur a déjà utilisé son rebuy volontaire' },
          { status: 400 }
        );
      }
      if (error.message === 'BUST_RECAVE_ALREADY_USED') {
        return NextResponse.json(
          { error: 'Ce joueur a déjà recavé après un bust pendant la pause' },
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
    // En dev, renvoyer plus de détails sur l'erreur
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      {
        error: 'Failed to process rebuy',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
