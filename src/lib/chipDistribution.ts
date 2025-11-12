// Types
export type ChipDenomination = {
  value: number;
  quantity: number;
  color: string;
};

export type ChipSet = {
  id: string;
  name: string;
  denominations: ChipDenomination[];
};

export type ChipDistribution = {
  value: number;
  count: number;
  total: number;
  color: string;
};

export type DistributionResult = {
  playerDistribution: ChipDistribution[];
  totalChipsPerPlayer: number;
  totalChipsNeeded: number;
  totalChipsAvailable: number;
  chipsRemaining: ChipDenomination[];
  rebuysSupported: number;
  status: 'sufficient' | 'tight' | 'insufficient';
  warnings: string[];
  raceOffRecommendations: RaceOffRecommendation[];
};

export type RaceOffRecommendation = {
  value: number;
  level: number;
  blindLevel: { smallBlind: number; bigBlind: number };
  reason: string;
};

export type BlindLevel = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  duration: number; // en minutes
};

export type TournamentStructure = {
  levels: BlindLevel[];
  totalDuration: number; // en minutes
  averageStack: number;
  startingBlinds: { small: number; big: number };
};

/**
 * Agrège tous les jetons disponibles depuis plusieurs mallettes
 */
export function aggregateChipSets(chipSets: ChipSet[]): ChipDenomination[] {
  const aggregated = new Map<number, ChipDenomination>();

  chipSets.forEach((chipSet) => {
    chipSet.denominations.forEach((denom) => {
      const existing = aggregated.get(denom.value);
      if (existing) {
        existing.quantity += denom.quantity;
      } else {
        aggregated.set(denom.value, {
          value: denom.value,
          quantity: denom.quantity,
          color: denom.color,
        });
      }
    });
  });

  // Trier par valeur décroissante
  return Array.from(aggregated.values()).sort((a, b) => b.value - a.value);
}

/**
 * Calcule la distribution optimale de jetons
 */
export function calculateOptimalDistribution(
  chipSets: ChipSet[],
  stackSize: number,
  playersCount: number,
  rebuysExpected: number = 0
): DistributionResult {
  const warnings: string[] = [];

  // Agréger les jetons disponibles
  const available = aggregateChipSets(chipSets);

  if (available.length === 0) {
    return {
      playerDistribution: [],
      totalChipsPerPlayer: 0,
      totalChipsNeeded: stackSize * (playersCount + rebuysExpected),
      totalChipsAvailable: 0,
      chipsRemaining: [],
      rebuysSupported: 0,
      status: 'insufficient',
      warnings: ['Aucune mallette sélectionnée'],
      raceOffRecommendations: [],
    };
  }

  // Calculer la distribution optimale pour un joueur
  const distribution = greedyDistribution(available, stackSize);

  // Calculer le total de jetons disponibles par valeur
  const totalAvailable = calculateTotalValue(available);

  // Calculer combien de stacks complets on peut faire
  const maxStacks = Math.floor(
    Math.min(
      ...distribution.map((d) => {
        const availableForValue = available.find((a) => a.value === d.value);
        return availableForValue ? Math.floor(availableForValue.quantity / d.count) : 0;
      })
    )
  );

  const totalChipsNeeded = stackSize * (playersCount + rebuysExpected);
  const totalChipsForPlayers = stackSize * playersCount;
  const actualRebuysSupported = Math.max(0, maxStacks - playersCount);

  // Calculer les jetons restants après distribution
  const chipsRemaining = available.map((a) => {
    const used = distribution.find((d) => d.value === a.value);
    const usedCount = used ? used.count * playersCount : 0;
    return {
      value: a.value,
      quantity: a.quantity - usedCount,
      color: a.color,
    };
  });

  // Déterminer le statut
  let status: 'sufficient' | 'tight' | 'insufficient';
  if (maxStacks < playersCount) {
    status = 'insufficient';
    warnings.push(
      `Jetons insuffisants ! Vous pouvez distribuer seulement ${maxStacks} stacks sur ${playersCount} joueurs.`
    );
  } else if (actualRebuysSupported < rebuysExpected) {
    status = 'tight';
    warnings.push(
      `Jetons justes. Rebuys supportés: ${actualRebuysSupported} sur ${rebuysExpected} attendus.`
    );
  } else {
    status = 'sufficient';
  }

  // Vérifier les petites dénominations
  const smallestDenom = distribution[distribution.length - 1];
  if (smallestDenom && smallestDenom.value < stackSize / 200) {
    warnings.push(
      `La plus petite dénomination (${smallestDenom.value}) est très petite. Pensez à la retirer rapidement.`
    );
  }

  return {
    playerDistribution: distribution,
    totalChipsPerPlayer: distribution.reduce((sum, d) => sum + d.total, 0),
    totalChipsNeeded,
    totalChipsAvailable: totalAvailable,
    chipsRemaining,
    rebuysSupported: actualRebuysSupported,
    status,
    warnings,
    raceOffRecommendations: [], // Sera calculé avec la structure des blinds
  };
}

/**
 * Algorithme glouton pour trouver la meilleure distribution
 * Essaie de minimiser le nombre total de jetons par joueur
 */
function greedyDistribution(
  available: ChipDenomination[],
  stackSize: number
): ChipDistribution[] {
  const distribution: ChipDistribution[] = [];
  let remaining = stackSize;

  // Trier par valeur décroissante
  const sorted = [...available].sort((a, b) => b.value - a.value);

  for (const denom of sorted) {
    if (remaining === 0) break;

    // Calculer combien de jetons de cette valeur on peut utiliser
    const maxCount = Math.floor(remaining / denom.value);

    if (maxCount > 0) {
      // Limiter à un nombre raisonnable de jetons (éviter 100× jetons de 25 par exemple)
      const count = Math.min(maxCount, 20);

      distribution.push({
        value: denom.value,
        count,
        total: count * denom.value,
        color: denom.color,
      });

      remaining -= count * denom.value;
    }
  }

  // Si reste encore de la valeur, essayer de l'atteindre avec de plus petites dénominations
  if (remaining > 0 && sorted.length > 0) {
    const smallest = sorted[sorted.length - 1];
    const additionalCount = Math.floor(remaining / smallest.value);

    if (additionalCount > 0) {
      const existing = distribution.find((d) => d.value === smallest.value);
      if (existing) {
        existing.count += additionalCount;
        existing.total += additionalCount * smallest.value;
      } else {
        distribution.push({
          value: smallest.value,
          count: additionalCount,
          total: additionalCount * smallest.value,
          color: smallest.color,
        });
      }
    }
  }

  return distribution.sort((a, b) => b.value - a.value);
}

/**
 * Calcule la valeur totale de jetons disponibles
 */
function calculateTotalValue(denominations: ChipDenomination[]): number {
  return denominations.reduce((sum, d) => sum + d.value * d.quantity, 0);
}

/**
 * Génère des recommandations de race-off basées sur la structure des blinds
 */
export function generateRaceOffRecommendations(
  distribution: ChipDistribution[],
  blindLevels: { level: number; smallBlind: number; bigBlind: number }[]
): RaceOffRecommendation[] {
  const recommendations: RaceOffRecommendation[] = [];

  // Trier la distribution par valeur croissante
  const sorted = [...distribution].sort((a, b) => a.value - b.value);

  for (const chip of sorted) {
    // Trouver le niveau où ce jeton devient moins de 1% du big blind
    const level = blindLevels.find((l) => chip.value < l.bigBlind / 100);

    if (level) {
      recommendations.push({
        value: chip.value,
        level: level.level,
        blindLevel: {
          smallBlind: level.smallBlind,
          bigBlind: level.bigBlind,
        },
        reason: `Les jetons de ${chip.value} représentent moins de 1% du big blind (${level.bigBlind})`,
      });
    }
  }

  return recommendations;
}

/**
 * Formate une distribution pour l'affichage
 */
export function formatDistribution(distribution: ChipDistribution[]): string {
  return distribution
    .map((d) => `${d.count} × ${d.value} = ${d.total}`)
    .join('\n');
}

/**
 * Valide qu'une distribution est réalisable avec les jetons disponibles
 */
export function validateDistribution(
  distribution: ChipDistribution[],
  available: ChipDenomination[],
  playersCount: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const dist of distribution) {
    const avail = available.find((a) => a.value === dist.value);

    if (!avail) {
      errors.push(`Dénomination ${dist.value} non disponible`);
      continue;
    }

    const needed = dist.count * playersCount;
    if (needed > avail.quantity) {
      errors.push(
        `Dénomination ${dist.value}: besoin de ${needed} jetons, mais seulement ${avail.quantity} disponibles`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Génère une structure de tournoi recommandée basée sur le stack de départ
 */
export function generateTournamentStructure(
  stackSize: number,
  playersCount: number,
  levelDuration: number = 20 // durée par niveau en minutes
): TournamentStructure {
  const levels: BlindLevel[] = [];

  // Calculer les blinds de départ (environ 1% du stack pour le big blind)
  const startingBigBlind = Math.max(
    findNearestChipValue(stackSize / 100),
    25
  );
  const startingSmallBlind = Math.max(
    findNearestChipValue(startingBigBlind / 2),
    Math.floor(startingBigBlind / 2)
  );

  // Générer les niveaux avec une progression d'environ 30-50% par niveau
  let currentSmallBlind = startingSmallBlind;
  let currentBigBlind = startingBigBlind;
  let level = 1;

  // Continuer jusqu'à ce que les blinds atteignent environ 10% du stack
  while (currentBigBlind < stackSize / 10 && level <= 20) {
    // Ajouter des antes à partir du niveau 5 (environ 10% du BB)
    const ante = level >= 5 ? Math.floor(currentBigBlind / 10) : undefined;

    levels.push({
      level,
      smallBlind: currentSmallBlind,
      bigBlind: currentBigBlind,
      ante,
      duration: levelDuration,
    });

    // Progression: augmenter d'environ 30-50%
    const nextBigBlind = findNearestChipValue(currentBigBlind * 1.4);
    const nextSmallBlind = findNearestChipValue(nextBigBlind / 2);

    currentSmallBlind = nextSmallBlind;
    currentBigBlind = nextBigBlind;
    level++;
  }

  // Ajouter une pause toutes les 4 niveaux
  const levelsWithBreaks = levels.map((lvl, index) => ({
    ...lvl,
    isBreak: (index + 1) % 4 === 0 && index < levels.length - 1,
  }));

  const totalDuration = levels.length * levelDuration;

  return {
    levels: levelsWithBreaks,
    totalDuration,
    averageStack: stackSize,
    startingBlinds: {
      small: startingSmallBlind,
      big: startingBigBlind,
    },
  };
}

/**
 * Trouve la valeur de jeton la plus proche pour des blinds "propres"
 */
function findNearestChipValue(value: number): number {
  const commonValues = [
    25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500,
    2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000,
  ];

  // Trouver la valeur la plus proche
  let closest = commonValues[0];
  let minDiff = Math.abs(value - closest);

  for (const chipValue of commonValues) {
    const diff = Math.abs(value - chipValue);
    if (diff < minDiff) {
      minDiff = diff;
      closest = chipValue;
    }
  }

  return closest;
}
