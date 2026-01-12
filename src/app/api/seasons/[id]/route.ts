import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  computeRecavePenalty,
  parseRecavePenaltyRules,
  RecavePenaltyTier,
  RecavePenaltyRules,
} from '@/lib/scoring';

// Type pour le client transactionnel Prisma
type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Schéma pour les paliers de malus dynamiques
const recavePenaltyTierSchema = z.object({
  fromRecaves: z.number().int().min(1),
  penaltyPoints: z.number().int().max(0), // Doit être <= 0
});

const seasonSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  year: z.number().int().min(2020).max(2100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),

  pointsFirst: z.number().int().default(1500),
  pointsSecond: z.number().int().default(1000),
  pointsThird: z.number().int().default(700),
  pointsFourth: z.number().int().default(500),
  pointsFifth: z.number().int().default(400),
  pointsSixth: z.number().int().default(300),
  pointsSeventh: z.number().int().default(200),
  pointsEighth: z.number().int().default(200),
  pointsNinth: z.number().int().default(200),
  pointsTenth: z.number().int().default(200),
  pointsEleventh: z.number().int().default(100),
  pointsSixteenth: z.number().int().default(50),

  eliminationPoints: z.number().int().default(50),
  leaderKillerBonus: z.number().int().default(25),

  // Champs legacy (gardés pour rétrocompat)
  freeRebuysCount: z.number().int().default(2),
  rebuyPenaltyTier1: z.number().int().default(-50),
  rebuyPenaltyTier2: z.number().int().default(-100),
  rebuyPenaltyTier3: z.number().int().default(-150),

  // Nouveau: paliers dynamiques (optionnel, prioritaire sur les champs legacy)
  recavePenaltyTiers: z.array(recavePenaltyTierSchema).optional().nullable(),

  totalTournamentsCount: z.number().int().optional().nullable(),
  bestTournamentsCount: z.number().int().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        tournaments: {
          orderBy: { date: 'desc' },
        },
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    return NextResponse.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season' },
      { status: 500 }
    );
  }
}

/**
 * Vérifie si un tableau contient des tiers valides
 * @exported for testing
 */
export function isValidTierArray(arr: unknown): arr is RecavePenaltyTier[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as RecavePenaltyTier).fromRecaves === 'number' &&
      typeof (item as RecavePenaltyTier).penaltyPoints === 'number'
  );
}

/**
 * Détecte si les règles de malus recaves ont changé
 * @exported for testing
 */
export function haveRecaveRulesChanged(
  oldSeason: {
    freeRebuysCount: number;
    recavePenaltyTiers: unknown;
    rebuyPenaltyTier1: number;
    rebuyPenaltyTier2: number;
    rebuyPenaltyTier3: number;
  },
  newData: {
    freeRebuysCount: number;
    recavePenaltyTiers?: RecavePenaltyTier[] | null;
    rebuyPenaltyTier1: number;
    rebuyPenaltyTier2: number;
    rebuyPenaltyTier3: number;
  }
): boolean {
  // Si freeRebuysCount change
  if (oldSeason.freeRebuysCount !== newData.freeRebuysCount) {
    return true;
  }

  // Vérifier si les tableaux de tiers sont valides et extraire les tiers typés
  const oldTiers = isValidTierArray(oldSeason.recavePenaltyTiers)
    ? oldSeason.recavePenaltyTiers
    : null;
  const newTiers = isValidTierArray(newData.recavePenaltyTiers)
    ? newData.recavePenaltyTiers
    : null;

  // Si on passe de legacy à dynamique ou vice-versa
  const oldHasDynamic = oldTiers !== null && oldTiers.length > 0;
  const newHasDynamic = newTiers !== null && newTiers.length > 0;

  if (oldHasDynamic !== newHasDynamic) {
    return true;
  }

  // Si les deux utilisent le format dynamique, comparer les tableaux
  if (newHasDynamic && oldHasDynamic && oldTiers && newTiers) {
    if (oldTiers.length !== newTiers.length) {
      return true;
    }

    // Trier et comparer
    const sortedOld = [...oldTiers].sort((a, b) => a.fromRecaves - b.fromRecaves);
    const sortedNew = [...newTiers].sort((a, b) => a.fromRecaves - b.fromRecaves);

    for (let i = 0; i < sortedOld.length; i++) {
      if (
        sortedOld[i].fromRecaves !== sortedNew[i].fromRecaves ||
        sortedOld[i].penaltyPoints !== sortedNew[i].penaltyPoints
      ) {
        return true;
      }
    }
  }

  // Si les deux utilisent legacy, comparer les tiers legacy
  if (!newHasDynamic && !oldHasDynamic) {
    if (
      oldSeason.rebuyPenaltyTier1 !== newData.rebuyPenaltyTier1 ||
      oldSeason.rebuyPenaltyTier2 !== newData.rebuyPenaltyTier2 ||
      oldSeason.rebuyPenaltyTier3 !== newData.rebuyPenaltyTier3
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Recalcule les points de malus pour tous les joueurs de la saison
 * @param tx Client transactionnel Prisma (pour atomicité)
 * @param seasonId ID de la saison
 * @param rules Règles de malus recaves
 */
async function recalculateSeasonPenalties(
  tx: TransactionClient,
  seasonId: string,
  rules: RecavePenaltyRules
): Promise<{ updatedPlayers: number; updatedTournaments: number }> {
  // Charger tous les tournois FINISHED de la saison avec leurs joueurs
  const tournaments = await tx.tournament.findMany({
    where: {
      seasonId,
      status: 'FINISHED',
      type: 'CHAMPIONSHIP',
    },
    include: {
      tournamentPlayers: true,
    },
  });

  let updatedPlayers = 0;

  // Mettre à jour chaque joueur individuellement dans la transaction
  for (const tournament of tournaments) {
    for (const tp of tournament.tournamentPlayers) {
      const newPenalty = computeRecavePenalty(tp.rebuysCount, rules);

      // Recalculer totalPoints
      const newTotal = tp.rankPoints + tp.eliminationPoints + tp.bonusPoints + newPenalty;

      // Seulement si changement
      if (tp.penaltyPoints !== newPenalty || tp.totalPoints !== newTotal) {
        await tx.tournamentPlayer.update({
          where: { id: tp.id },
          data: {
            penaltyPoints: newPenalty,
            totalPoints: newTotal,
          },
        });
        updatedPlayers++;
      }
    }
  }

  return {
    updatedPlayers,
    updatedTournaments: tournaments.length,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Vérifier les permissions - seuls les ADMIN peuvent modifier des saisons
  const currentPlayer = await getCurrentPlayer(request);

  if (!currentPlayer || !hasPermission(currentPlayer.role, PERMISSIONS.EDIT_SEASON)) {
    return NextResponse.json(
      { error: 'Vous n\'avez pas la permission de modifier des saisons' },
      { status: 403 }
    );
  }

  const { id } = await params;

  // Parser le body en dehors du try pour gérer les erreurs JSON séparément
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Validation Zod avec safeParse pour capturer les erreurs proprement
  const parseResult = seasonSchema.safeParse(body);
  if (!parseResult.success) {
    console.error('[Season PATCH] Validation failed:', parseResult.error.issues);
    return NextResponse.json(
      { error: 'Validation error', details: parseResult.error.issues },
      { status: 400 }
    );
  }
  const validatedData = parseResult.data;

  // Récupérer l'ancienne saison pour détecter les changements de règles
  const oldSeason = await prisma.season.findUnique({
    where: { id },
  });

  if (!oldSeason) {
    return NextResponse.json({ error: 'Season not found' }, { status: 404 });
  }

  // Détecter si les règles de malus ont changé
  const rulesChanged = haveRecaveRulesChanged(oldSeason, validatedData);

  // Préparer les données de mise à jour
  const updateData = {
    name: validatedData.name,
    year: validatedData.year,
    startDate: new Date(validatedData.startDate),
    endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,

    pointsFirst: validatedData.pointsFirst,
    pointsSecond: validatedData.pointsSecond,
    pointsThird: validatedData.pointsThird,
    pointsFourth: validatedData.pointsFourth,
    pointsFifth: validatedData.pointsFifth,
    pointsSixth: validatedData.pointsSixth,
    pointsSeventh: validatedData.pointsSeventh,
    pointsEighth: validatedData.pointsEighth,
    pointsNinth: validatedData.pointsNinth,
    pointsTenth: validatedData.pointsTenth,
    pointsEleventh: validatedData.pointsEleventh,
    pointsSixteenth: validatedData.pointsSixteenth,

    eliminationPoints: validatedData.eliminationPoints,
    leaderKillerBonus: validatedData.leaderKillerBonus,

    freeRebuysCount: validatedData.freeRebuysCount,
    rebuyPenaltyTier1: validatedData.rebuyPenaltyTier1,
    rebuyPenaltyTier2: validatedData.rebuyPenaltyTier2,
    rebuyPenaltyTier3: validatedData.rebuyPenaltyTier3,
    recavePenaltyTiers: validatedData.recavePenaltyTiers ?? Prisma.JsonNull,

    totalTournamentsCount: validatedData.totalTournamentsCount,
    bestTournamentsCount: validatedData.bestTournamentsCount,
  };

  try {
    // === TRANSACTION ATOMIQUE ===
    // Si les règles changent, update + recalcul sont atomiques (rollback si échec)
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la saison
      const updatedSeason = await tx.season.update({
        where: { id },
        data: updateData,
      });

      // 2. Si les règles ont changé, recalculer les pénalités
      let recalculationResult: { updatedPlayers: number; updatedTournaments: number } | null = null;

      if (rulesChanged) {
        const rules = parseRecavePenaltyRules(updatedSeason);
        recalculationResult = await recalculateSeasonPenalties(tx, id, rules);
        console.log(
          `[Season PATCH] Recalculated penalties for season ${id}: ${recalculationResult.updatedPlayers} players across ${recalculationResult.updatedTournaments} tournaments`
        );
      }

      return { season: updatedSeason, recalculation: recalculationResult };
    });

    return NextResponse.json({
      ...result.season,
      _recalculation: result.recalculation,
    });
  } catch (error) {
    // Si la transaction échoue (y compris le recalcul), tout est rollback
    console.error('[Season PATCH] Transaction failed (rollback):', error);

    // Message d'erreur explicite pour l'UI
    const errorMessage = rulesChanged
      ? 'Modification annulée: le recalcul des pénalités a échoué'
      : 'Échec de la mise à jour de la saison';

    return NextResponse.json(
      { error: errorMessage },
      { status: 409 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier les permissions - seuls les ADMIN peuvent supprimer des saisons
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer || !hasPermission(currentPlayer.role, PERMISSIONS.DELETE_SEASON)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer des saisons' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Archive instead of delete
    const season = await prisma.season.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json(season);
  } catch (error) {
    console.error('Error archiving season:', error);
    return NextResponse.json(
      { error: 'Failed to archive season' },
      { status: 500 }
    );
  }
}
