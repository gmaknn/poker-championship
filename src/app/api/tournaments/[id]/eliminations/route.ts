import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { emitToTournament } from '@/lib/socket';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { areRecavesOpen, calculateEffectiveLevel } from '@/lib/tournament-utils';

// Type for detailed points configuration
interface DetailedPointsConfig {
  type: 'DETAILED';
  byRank: Record<string, number>;
  rank19Plus: number;
}

/**
 * Get rank points using detailed config if available, otherwise fall back to legacy fields
 */
function getRankPointsForPosition(
  rank: number,
  season: {
    detailedPointsConfig?: unknown;
    pointsFirst: number;
    pointsSecond: number;
    pointsThird: number;
    pointsFourth: number;
    pointsFifth: number;
    pointsSixth: number;
    pointsSeventh: number;
    pointsEighth: number;
    pointsNinth: number;
    pointsTenth: number;
    pointsEleventh: number;
    pointsSixteenth: number;
  }
): number {
  const config = season.detailedPointsConfig as DetailedPointsConfig | null;
  if (config && config.type === 'DETAILED' && config.byRank) {
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) {
      return pointsForRank;
    }
    return config.rank19Plus ?? 0;
  }

  const legacyPointsMap: Record<number, number> = {
    1: season.pointsFirst,
    2: season.pointsSecond,
    3: season.pointsThird,
    4: season.pointsFourth,
    5: season.pointsFifth,
    6: season.pointsSixth,
    7: season.pointsSeventh,
    8: season.pointsEighth,
    9: season.pointsNinth,
    10: season.pointsTenth,
  };

  if (legacyPointsMap[rank] !== undefined) {
    return legacyPointsMap[rank];
  }

  if (rank >= 11 && rank <= 15) {
    return season.pointsEleventh;
  }

  return season.pointsSixteenth;
}

/**
 * Calculate and save points for all players when tournament finishes
 */
async function calculateAndSavePoints(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      season: true,
      tournamentPlayers: true,
    },
  });

  if (!tournament || !tournament.season || tournament.type !== 'CHAMPIONSHIP') {
    return; // Points only for CHAMPIONSHIP tournaments with a season
  }

  const updates = tournament.tournamentPlayers.map(async (tp) => {
    let rankPoints = 0;
    let eliminationPoints = 0;
    let bonusPoints = 0;

    if (tp.finalRank !== null) {
      rankPoints = getRankPointsForPosition(tp.finalRank, tournament.season!);
      // Points d'élimination:
      // - éliminations finales (après recaves) = eliminationPoints (50 pts par défaut)
      // - éliminations bust (pendant recaves) = bustEliminationBonus (25 pts par défaut)
      const finalElimPoints = tp.eliminationsCount * tournament.season!.eliminationPoints;
      const bustElimPoints = tp.bustEliminations * tournament.season!.bustEliminationBonus;
      eliminationPoints = finalElimPoints + bustElimPoints;
      // Bonus leader kill (uniquement après recaves)
      bonusPoints = tp.leaderKills * tournament.season!.leaderKillerBonus;
    }

    const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

    return prisma.tournamentPlayer.update({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId: tp.playerId,
        },
      },
      data: {
        rankPoints,
        eliminationPoints,
        bonusPoints,
        totalPoints,
      },
    });
  });

  await Promise.all(updates);
}

const eliminationSchema = z.object({
  eliminatedId: z.string().cuid(),
  eliminatorId: z.string().cuid(),
});

// GET - Récupérer toutes les éliminations du tournoi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const eliminations = await prisma.elimination.findMany({
      where: { tournamentId: id },
      include: {
        eliminated: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
        eliminator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(eliminations);
  } catch (error) {
    console.error('Error fetching eliminations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eliminations' },
      { status: 500 }
    );
  }
}

// POST - Enregistrer une nouvelle élimination
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Vérifier que le tournoi existe et est en cours
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
        tournamentPlayers: {
          include: {
            player: true,
          },
        },
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

    const body = await request.json();
    const validatedData = eliminationSchema.parse(body);

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

    // Les éliminations définitives ne sont autorisées que lorsque les recaves sont fermées
    // (inclut la pause suivant "Fin recaves" pour permettre les recaves light)
    if (areRecavesOpen(tournament, effectiveLevel, tournament.blindLevels)) {
      // Diagnostic optionnel (activé via RECIPE_DIAGNOSTICS=1)
      const isDiag = process.env.RECIPE_DIAGNOSTICS === '1';
      if (isDiag) {
        console.log('[DIAG POST /eliminations] recaves ouvertes - blocked:', {
          tournamentId,
          dbCurrentLevel: tournament.currentLevel,
          effectiveLevel,
          rebuyEndLevel: tournament.rebuyEndLevel,
        });
      }

      const diagnostics = isDiag
        ? { dbCurrentLevel: tournament.currentLevel, effectiveLevel, rebuyEndLevel: tournament.rebuyEndLevel }
        : {};

      return NextResponse.json(
        {
          error: 'Période de recaves encore ouverte. Utilisez le formulaire de perte de tapis.',
          ...diagnostics,
        },
        { status: 400 }
      );
    }

    // Vérifier que les deux joueurs sont inscrits au tournoi (pre-check rapide)
    const eliminatedPlayer = tournament.tournamentPlayers.find(
      (tp) => tp.playerId === validatedData.eliminatedId
    );
    const eliminatorPlayer = tournament.tournamentPlayers.find(
      (tp) => tp.playerId === validatedData.eliminatorId
    );

    if (!eliminatedPlayer || !eliminatorPlayer) {
      return NextResponse.json(
        { error: 'One or both players are not enrolled in this tournament' },
        { status: 400 }
      );
    }

    // Vérifier que le joueur éliminé n'a pas déjà une position finale (pre-check rapide)
    if (eliminatedPlayer.finalRank !== null) {
      return NextResponse.json(
        { error: 'Player has already been eliminated' },
        { status: 400 }
      );
    }

    // === TRANSACTION ATOMIQUE ===
    // Toutes les validations critiques et écritures sont dans la transaction
    // pour éviter les race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Re-lecture atomique des joueurs du tournoi dans la transaction
      const currentPlayers = await tx.tournamentPlayer.findMany({
        where: { tournamentId },
        include: { player: true },
      });

      // Re-vérifier que le joueur n'est pas déjà éliminé (race-safe)
      const targetPlayer = currentPlayers.find(
        (tp) => tp.playerId === validatedData.eliminatedId
      );
      if (!targetPlayer || targetPlayer.finalRank !== null) {
        throw new Error('PLAYER_ALREADY_ELIMINATED');
      }

      // Calculer le rank à partir des données fraîches
      const remainingPlayers = currentPlayers.filter(
        (tp) => tp.finalRank === null
      ).length;
      const rank = remainingPlayers;

      // Vérifier les bornes
      const totalPlayers = currentPlayers.length;
      if (rank < 1 || rank > totalPlayers) {
        throw new Error('RANK_OUT_OF_BOUNDS');
      }

      // Vérifier que le rank n'est pas déjà pris (race-safe)
      const existingRank = currentPlayers.find(
        (tp) => tp.finalRank === rank && tp.playerId !== validatedData.eliminatedId
      );
      if (existingRank) {
        throw new Error('RANK_ALREADY_TAKEN');
      }

      // Vérifier si c'est un Leader Kill
      // Un Leader Kill se produit quand la victime est le leader du classement
      // de la saison au début du tournoi (seasonLeaderAtStartId)
      // Note: On récupère le tournoi frais dans la transaction pour avoir seasonLeaderAtStartId
      const tournamentData = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: { seasonLeaderAtStartId: true },
      });
      const isLeaderKill = tournamentData?.seasonLeaderAtStartId === validatedData.eliminatedId;

      // === ÉCRITURE ATOMIQUE avec updateMany conditionnel ===
      // Utiliser updateMany avec condition finalRank: null pour garantir l'atomicité
      const updateResult = await tx.tournamentPlayer.updateMany({
        where: {
          tournamentId,
          playerId: validatedData.eliminatedId,
          finalRank: null, // Condition critique: seulement si pas encore éliminé
        },
        data: {
          finalRank: rank,
        },
      });

      // Si count != 1, le joueur a été éliminé par une autre requête concurrente
      if (updateResult.count !== 1) {
        throw new Error('PLAYER_ALREADY_ELIMINATED');
      }

      // Créer l'élimination avec le niveau effectif (pas la valeur DB)
      const elimination = await tx.elimination.create({
        data: {
          tournamentId,
          eliminatedId: validatedData.eliminatedId,
          eliminatorId: validatedData.eliminatorId,
          rank,
          level: effectiveLevel,
          isLeaderKill,
        },
        include: {
          eliminated: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
          eliminator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
        },
      });

      // Mettre à jour l'éliminateur
      await tx.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: validatedData.eliminatorId,
          },
        },
        data: {
          eliminationsCount: { increment: 1 },
          leaderKills: isLeaderKill ? { increment: 1 } : undefined,
        },
      });

      return { elimination, rank, isLeaderKill };
    });

    const { elimination, rank, isLeaderKill } = result;

    // Émettre l'événement d'élimination via WebSocket
    emitToTournament(tournamentId, 'elimination:player_out', {
      tournamentId,
      eliminatedId: validatedData.eliminatedId,
      eliminatedName: elimination.eliminated.nickname,
      eliminatorId: validatedData.eliminatorId,
      eliminatorName: elimination.eliminator.nickname,
      rank,
      level: effectiveLevel,
      isLeaderKill,
    });

    // Mettre à jour le leaderboard
    emitToTournament(tournamentId, 'leaderboard:updated', {
      tournamentId,
      timestamp: new Date(),
    });

    // Vérifier s'il ne reste qu'un joueur actif (fin du tournoi)
    const activePlayersCount = await prisma.tournamentPlayer.count({
      where: {
        tournamentId,
        finalRank: null,
      },
    });

    let tournamentCompleted = false;
    if (activePlayersCount === 1) {
      // Il ne reste qu'un joueur, c'est le gagnant
      const winner = await prisma.tournamentPlayer.findFirst({
        where: {
          tournamentId,
          finalRank: null,
        },
        include: {
          player: true,
        },
      });

      if (winner) {
        // Marquer le gagnant avec le rang 1
        await prisma.tournamentPlayer.update({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId: winner.playerId,
            },
          },
          data: {
            finalRank: 1,
          },
        });

        // Marquer le tournoi comme terminé
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'FINISHED',
            finishedAt: new Date(),
          },
        });

        tournamentCompleted = true;

        // Calculer et sauvegarder les points pour le leaderboard saison
        await calculateAndSavePoints(tournamentId);

        // Émettre les événements de fin de tournoi
        emitToTournament(tournamentId, 'elimination:tournament_complete', {
          tournamentId,
          winnerId: winner.playerId,
          winnerName: winner.player.nickname,
        });

        emitToTournament(tournamentId, 'tournament:status_change', {
          tournamentId,
          status: 'FINISHED',
          timestamp: new Date(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      elimination,
      tournamentCompleted,
      remainingPlayers: activePlayersCount,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    // Mapper les erreurs de transaction atomique en 400 clairs
    if (error instanceof Error) {
      if (error.message === 'PLAYER_ALREADY_ELIMINATED') {
        return NextResponse.json(
          { error: 'Player has already been eliminated' },
          { status: 400 }
        );
      }
      if (error.message === 'RANK_OUT_OF_BOUNDS') {
        return NextResponse.json(
          { error: 'Computed finalRank is out of bounds' },
          { status: 400 }
        );
      }
      if (error.message === 'RANK_ALREADY_TAKEN') {
        return NextResponse.json(
          { error: 'FinalRank is already taken' },
          { status: 400 }
        );
      }
    }

    // Map Prisma unique constraint violation (P2002) on finalRank to 400
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      if (Array.isArray(target) && target.includes('finalRank')) {
        return NextResponse.json(
          { error: 'FinalRank is already taken' },
          { status: 400 }
        );
      }
    }

    console.error('Error creating elimination:', error);
    return NextResponse.json(
      { error: 'Failed to create elimination' },
      { status: 500 }
    );
  }
}
