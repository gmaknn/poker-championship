import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  calculateOptimalDistribution,
  generateRaceOffRecommendations,
  generateTournamentStructure,
  type ChipSet,
  type RaceOffRecommendation,
} from '@/lib/chipDistribution';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chipSetIds, stackSize, playersCount, rebuysExpected, tournamentId } = body;

    if (!chipSetIds || chipSetIds.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une mallette doit être sélectionnée' },
        { status: 400 }
      );
    }

    if (!stackSize || !playersCount) {
      return NextResponse.json(
        { error: 'Stack de départ et nombre de joueurs requis' },
        { status: 400 }
      );
    }

    // Récupérer les mallettes avec leurs dénominations
    const chipSets = await prisma.chipSet.findMany({
      where: {
        id: { in: chipSetIds },
        isActive: true,
      },
      include: {
        denominations: true,
      },
    });

    if (chipSets.length === 0) {
      return NextResponse.json(
        { error: 'Aucune mallette active trouvée' },
        { status: 404 }
      );
    }

    // Transformer pour l'algorithme
    const chipSetsData: ChipSet[] = chipSets.map((cs) => ({
      id: cs.id,
      name: cs.name,
      denominations: cs.denominations.map((d) => ({
        value: d.value,
        quantity: d.quantity,
        color: d.color,
      })),
    }));

    // Calculer la distribution optimale
    const distribution = calculateOptimalDistribution(
      chipSetsData,
      stackSize,
      playersCount,
      rebuysExpected || 0
    );

    // Générer une structure de tournoi recommandée
    const tournamentStructure = generateTournamentStructure(
      stackSize,
      playersCount
    );

    // Si un tournoi est spécifié, récupérer sa structure de blinds pour les recommandations de race-off
    let raceOffRecommendations: RaceOffRecommendation[] = [];
    if (tournamentId) {
      const blindLevels = await prisma.blindLevel.findMany({
        where: { tournamentId },
        orderBy: { level: 'asc' },
      });

      if (blindLevels.length > 0) {
        raceOffRecommendations = generateRaceOffRecommendations(
          distribution.playerDistribution,
          blindLevels.map((l) => ({
            level: l.level,
            smallBlind: l.smallBlind,
            bigBlind: l.bigBlind,
          }))
        );
      }
    } else {
      // Utiliser la structure générée pour les recommandations de race-off
      raceOffRecommendations = generateRaceOffRecommendations(
        distribution.playerDistribution,
        tournamentStructure.levels.map((l) => ({
          level: l.level,
          smallBlind: l.smallBlind,
          bigBlind: l.bigBlind,
        }))
      );
    }

    return NextResponse.json({
      ...distribution,
      raceOffRecommendations,
      tournamentStructure,
      chipSetsUsed: chipSets.map((cs) => ({
        id: cs.id,
        name: cs.name,
      })),
    });
  } catch (error) {
    console.error('Error calculating chip distribution:', error);
    return NextResponse.json(
      { error: 'Erreur lors du calcul de la distribution' },
      { status: 500 }
    );
  }
}
