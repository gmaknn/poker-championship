import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
  computeRecavePenalty,
  parseRecavePenaltyRules,
  RecavePenaltyTier,
  RecavePenaltyRules,
} from '@/lib/scoring';

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
 */
function isValidTierArray(arr: unknown): arr is RecavePenaltyTier[] {
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
 */
function haveRecaveRulesChanged(
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
 */
async function recalculateSeasonPenalties(
  seasonId: string,
  rules: RecavePenaltyRules
): Promise<{ updatedPlayers: number; updatedTournaments: number }> {
  // Charger tous les tournois FINISHED de la saison avec leurs joueurs
  const tournaments = await prisma.tournament.findMany({
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

  // Préparer toutes les mises à jour
  const updates: Array<{
    id: string;
    penaltyPoints: number;
    totalPoints: number;
  }> = [];

  for (const tournament of tournaments) {
    for (const tp of tournament.tournamentPlayers) {
      const newPenalty = computeRecavePenalty(tp.rebuysCount, rules);

      // Recalculer totalPoints
      const newTotal = tp.rankPoints + tp.eliminationPoints + tp.bonusPoints + newPenalty;

      // Seulement si changement
      if (tp.penaltyPoints !== newPenalty || tp.totalPoints !== newTotal) {
        updates.push({
          id: tp.id,
          penaltyPoints: newPenalty,
          totalPoints: newTotal,
        });
      }
    }
  }

  // Exécuter les mises à jour en transaction
  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.tournamentPlayer.update({
          where: { id: u.id },
          data: {
            penaltyPoints: u.penaltyPoints,
            totalPoints: u.totalPoints,
          },
        })
      )
    );
    updatedPlayers = updates.length;
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
  try {
    // Vérifier les permissions - seuls les ADMIN peuvent modifier des saisons
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer || !hasPermission(currentPlayer.role, PERMISSIONS.EDIT_SEASON)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier des saisons' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

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

    // Mettre à jour la saison
    const season = await prisma.season.update({
      where: { id },
      data: {
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
        recavePenaltyTiers: validatedData.recavePenaltyTiers ?? undefined,

        totalTournamentsCount: validatedData.totalTournamentsCount,
        bestTournamentsCount: validatedData.bestTournamentsCount,
      },
    });

    // Si les règles ont changé, recalculer les points de la saison
    let recalculationResult: { updatedPlayers: number; updatedTournaments: number } | null = null;

    if (rulesChanged) {
      try {
        const rules = parseRecavePenaltyRules(season);
        recalculationResult = await recalculateSeasonPenalties(id, rules);
        console.log(
          `[Season PATCH] Recalculated penalties for season ${id}: ${recalculationResult.updatedPlayers} players across ${recalculationResult.updatedTournaments} tournaments`
        );
      } catch (recalcError) {
        console.error('[Season PATCH] Recalculation failed:', recalcError);
        // Ne pas bloquer la sauvegarde si le recalcul échoue
        // La saison a déjà été mise à jour
      }
    }

    return NextResponse.json({
      ...season,
      _recalculation: recalculationResult,
    });
  } catch (error) {
    console.error('Error updating season:', error);
    return NextResponse.json(
      { error: 'Failed to update season' },
      { status: 500 }
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
