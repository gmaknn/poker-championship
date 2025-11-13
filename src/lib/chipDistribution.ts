/**
 * CHIP DISTRIBUTION - Version optimisée avec revalorisation
 *
 * Algorithme V2 avec rétrocompatibilité API V1
 * Priorise la couverture des blinds et optimise pour la durée cible
 */

// ============================================
// TYPES (Compatible avec l'ancienne version)
// ============================================

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
  purpose?: string; // Nouveau: "early-game" | "mid-game" | "late-game" | "change-making"
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
  // Nouveaux champs optionnels
  metrics?: {
    blindCoverageScore: number;
    playabilityScore: number;
    overallScore: number;
  };
  revaluationSuggestions?: RevaluationSuggestion[];
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
  duration: number;
  isBreak?: boolean;
};

export type TournamentStructure = {
  levels: BlindLevel[];
  totalDuration: number;
  averageStack: number;
  startingBlinds: { small: number; big: number };
};

export type RevaluationSuggestion = {
  originalValue: number;
  suggestedValue: number;
  color: string;
  reason: string;
  improvementScore: number;
};

// ============================================
// API PRINCIPALE (Rétrocompatible)
// ============================================

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

  return Array.from(aggregated.values()).sort((a, b) => b.value - a.value);
}

/**
 * Calcule la distribution optimale de jetons
 * Utilise le nouvel algorithme mais retourne le format compatible
 */
export function calculateOptimalDistribution(
  chipSets: ChipSet[],
  stackSize: number,
  playersCount: number,
  rebuysExpected: number = 0,
  targetDuration?: number, // Nouveau paramètre optionnel
  levelDuration: number = 15
): DistributionResult {
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

  // Utiliser le nouvel algorithme
  const structure = generateChipAwareStructure(
    stackSize,
    available.map(c => c.value),
    targetDuration || 180,
    levelDuration
  );

  const distribution = calculateWeightedDistribution(
    available,
    stackSize,
    structure,
    playersCount,
    rebuysExpected
  );

  if (!distribution) {
    // Fallback vers l'ancien algorithme greedy si échec
    return calculateOptimalDistributionLegacy(chipSets, stackSize, playersCount, rebuysExpected);
  }

  // Calculer les métriques
  const totalChipsPerPlayer = distribution.reduce((sum, d) => sum + d.count, 0);
  const totalValue = distribution.reduce((sum, d) => sum + d.total, 0);
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

  const actualRebuysSupported = Math.max(0, maxStacks - playersCount);

  // Calculer les jetons restants
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
  const warnings: string[] = [];

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

  // Calculer les recommandations de race-off
  const raceOffRecommendations = generateRaceOffRecommendations(
    distribution,
    structure.filter(l => !l.isBreak).map(l => ({
      level: l.level,
      smallBlind: l.smallBlind,
      bigBlind: l.bigBlind
    }))
  );

  // Calculer les métriques de qualité
  const blindCoverageScore = calculateBlindCoverageScore(distribution, structure);
  const playabilityScore = calculatePlayabilityScore(distribution, totalChipsPerPlayer);
  const overallScore = blindCoverageScore * 0.5 + playabilityScore * 0.3 + (status === 'sufficient' ? 20 : 0);

  // Analyser les opportunités de revalorisation
  const revaluationSuggestions = analyzeRevaluationOpportunities(
    available,
    structure,
    blindCoverageScore
  );

  return {
    playerDistribution: distribution,
    totalChipsPerPlayer,
    totalChipsNeeded: stackSize * (playersCount + rebuysExpected),
    totalChipsAvailable: totalAvailable,
    chipsRemaining,
    rebuysSupported: actualRebuysSupported,
    status,
    warnings,
    raceOffRecommendations,
    metrics: {
      blindCoverageScore,
      playabilityScore,
      overallScore
    },
    revaluationSuggestions: revaluationSuggestions.length > 0 ? revaluationSuggestions : undefined
  };
}

/**
 * Fallback vers l'ancien algorithme greedy (pour compatibilité)
 */
function calculateOptimalDistributionLegacy(
  chipSets: ChipSet[],
  stackSize: number,
  playersCount: number,
  rebuysExpected: number
): DistributionResult {
  const available = aggregateChipSets(chipSets);
  const distribution = greedyDistribution(available, stackSize);
  const totalAvailable = calculateTotalValue(available);

  const maxStacks = Math.floor(
    Math.min(
      ...distribution.map((d) => {
        const availableForValue = available.find((a) => a.value === d.value);
        return availableForValue ? Math.floor(availableForValue.quantity / d.count) : 0;
      })
    )
  );

  const actualRebuysSupported = Math.max(0, maxStacks - playersCount);

  const chipsRemaining = available.map((a) => {
    const used = distribution.find((d) => d.value === a.value);
    const usedCount = used ? used.count * playersCount : 0;
    return {
      value: a.value,
      quantity: a.quantity - usedCount,
      color: a.color,
    };
  });

  let status: 'sufficient' | 'tight' | 'insufficient';
  const warnings: string[] = [];

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

  return {
    playerDistribution: distribution,
    totalChipsPerPlayer: distribution.reduce((sum, d) => sum + d.count, 0),
    totalChipsNeeded: stackSize * (playersCount + rebuysExpected),
    totalChipsAvailable: totalAvailable,
    chipsRemaining,
    rebuysSupported: actualRebuysSupported,
    status,
    warnings,
    raceOffRecommendations: [],
  };
}

// ============================================
// NOUVEL ALGORITHME
// ============================================

function generateChipAwareStructure(
  stackSize: number,
  availableDenoms: number[],
  targetDuration: number,
  levelDuration: number
): BlindLevel[] {
  const sortedDenoms = [...availableDenoms].sort((a, b) => a - b);
  const levels: BlindLevel[] = [];

  let targetBB = Math.max(stackSize * 0.01, 25);
  let currentBB = findClosestUsableDenomination(targetBB, sortedDenoms);

  const targetLevels = Math.floor(targetDuration / levelDuration);
  let level = 1;

  while (currentBB < stackSize * 0.1 && level <= targetLevels + 5) {
    const currentSB = findSmallBlindForBigBlind(currentBB, sortedDenoms);
    const ante = level >= 5 ? findAnteForBigBlind(currentBB, sortedDenoms) : undefined;

    levels.push({
      level,
      smallBlind: currentSB,
      bigBlind: currentBB,
      ante,
      duration: levelDuration,
    });

    const progressionRate = 1.35;
    let nextBB = currentBB * progressionRate;
    nextBB = findNextUsableDenomination(nextBB, currentBB, sortedDenoms);

    currentBB = nextBB;
    level++;
  }

  return levels;
}

function findClosestUsableDenomination(target: number, denoms: number[]): number {
  const usableValues = generateUsableValues(denoms);
  let closest = usableValues[0];
  let minDiff = Math.abs(target - closest);

  for (const value of usableValues) {
    const diff = Math.abs(target - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = value;
    }
  }

  return closest;
}

function generateUsableValues(denoms: number[]): number[] {
  const values = new Set<number>();

  for (const denom of denoms) {
    values.add(denom);
    values.add(denom * 2);
    values.add(denom * 4);
    values.add(denom * 5);
    values.add(denom * 10);
  }

  return Array.from(values).sort((a, b) => a - b);
}

function findSmallBlindForBigBlind(bigBlind: number, denoms: number[]): number {
  const targetSB = bigBlind / 2;
  return findClosestUsableDenomination(targetSB, denoms);
}

function findAnteForBigBlind(bigBlind: number, denoms: number[]): number {
  const targetAnte = Math.floor(bigBlind * 0.1);
  const usableValues = generateUsableValues(denoms);
  const candidates = usableValues.filter(v => v <= targetAnte);
  return candidates.length > 0 ? candidates[candidates.length - 1] : denoms[0];
}

function findNextUsableDenomination(target: number, currentBB: number, denoms: number[]): number {
  const usableValues = generateUsableValues(denoms);
  const candidates = usableValues.filter(v => v > target && v > currentBB);

  if (candidates.length === 0) {
    return Math.ceil(target / denoms[denoms.length - 1]) * denoms[denoms.length - 1];
  }

  return candidates[0];
}

function calculateWeightedDistribution(
  availableChips: ChipDenomination[],
  stackSize: number,
  structure: BlindLevel[],
  playersCount: number,
  rebuysExpected: number
): ChipDistribution[] | null {
  const denoms = [...availableChips].sort((a, b) => b.value - a.value);

  const importance = denoms.map(denom => ({
    ...denom,
    score: calculateDenominationImportance(denom.value, stackSize, structure)
  }));

  importance.sort((a, b) => b.score - a.score);

  const distribution: ChipDistribution[] = [];
  let remaining = stackSize;

  // Passe 1: Petites dénominations
  const smallDenoms = importance.filter(d => d.value < stackSize * 0.05);
  for (const denom of smallDenoms) {
    if (remaining <= 0) break;

    const optimalCount = Math.min(6, Math.ceil(stackSize * 0.005 / denom.value));
    const count = Math.min(optimalCount, Math.floor(denom.quantity / (playersCount + rebuysExpected)));

    if (count > 0) {
      distribution.push({
        value: denom.value,
        count,
        total: count * denom.value,
        color: denom.color,
        purpose: 'change-making'
      });
      remaining -= count * denom.value;
    }
  }

  // Passe 2: Dénominations moyennes
  const mediumDenoms = importance.filter(d => d.value >= stackSize * 0.05 && d.value < stackSize * 0.2);
  for (const denom of mediumDenoms) {
    if (remaining <= 0) break;

    const optimalCount = Math.min(8, Math.ceil(stackSize * 0.10 / denom.value));
    const count = Math.min(optimalCount, Math.floor(denom.quantity / (playersCount + rebuysExpected)));

    if (count > 0) {
      distribution.push({
        value: denom.value,
        count,
        total: count * denom.value,
        color: denom.color,
        purpose: 'mid-game'
      });
      remaining -= count * denom.value;
    }
  }

  // Passe 3: Grandes dénominations
  const largeDenoms = importance.filter(d => d.value >= stackSize * 0.2);
  largeDenoms.sort((a, b) => b.value - a.value);

  for (const denom of largeDenoms) {
    if (remaining <= 0) break;

    const maxPossible = Math.floor(denom.quantity / (playersCount + rebuysExpected));
    const idealCount = Math.floor(remaining / denom.value);
    const count = Math.min(idealCount, maxPossible);

    if (count > 0) {
      distribution.push({
        value: denom.value,
        count,
        total: count * denom.value,
        color: denom.color,
        purpose: 'late-game'
      });
      remaining -= count * denom.value;
    }
  }

  // Compléter si nécessaire
  if (remaining > 0) {
    const allDenoms = [...importance].sort((a, b) => b.value - a.value);
    for (const denom of allDenoms) {
      if (remaining <= 0) break;

      const existing = distribution.find(d => d.value === denom.value);
      const alreadyUsed = existing ? existing.count : 0;
      const maxPossible = Math.floor(denom.quantity / (playersCount + rebuysExpected));
      const additionalCount = Math.min(
        Math.floor(remaining / denom.value),
        maxPossible - alreadyUsed
      );

      if (additionalCount > 0) {
        if (existing) {
          existing.count += additionalCount;
          existing.total += additionalCount * denom.value;
        } else {
          distribution.push({
            value: denom.value,
            count: additionalCount,
            total: additionalCount * denom.value,
            color: denom.color,
            purpose: 'fill'
          });
        }
        remaining -= additionalCount * denom.value;
      }
    }
  }

  const totalValue = distribution.reduce((sum, d) => sum + d.total, 0);
  const isValid = totalValue >= stackSize * 0.90;

  if (!isValid) {
    return null;
  }

  return distribution.sort((a, b) => b.value - a.value);
}

function calculateDenominationImportance(
  denomValue: number,
  stackSize: number,
  structure: BlindLevel[]
): number {
  let score = 0;

  const blindValues = structure
    .filter(l => !l.isBreak)
    .flatMap(l => [l.smallBlind, l.bigBlind, l.ante].filter(Boolean) as number[]);

  for (const blind of blindValues) {
    if (blind === denomValue) {
      score += 10;
    } else if (blind === denomValue * 2 || blind === denomValue * 4 || blind === denomValue * 5) {
      score += 5;
    } else if (blind / 10 <= denomValue && denomValue <= blind * 10) {
      score += 1;
    }
  }

  const relativeSize = denomValue / stackSize;
  if (relativeSize >= 0.03 && relativeSize <= 0.15) {
    score += 5;
  }

  return score;
}

function calculateBlindCoverageScore(
  distribution: ChipDistribution[],
  structure: BlindLevel[]
): number {
  const denomValues = distribution.map(d => d.value);
  const usableValues = generateUsableValues(denomValues);

  let totalBlinds = 0;
  let perfectMatches = 0;
  let goodMatches = 0;

  for (const level of structure) {
    if (level.isBreak) continue;

    const blinds = [level.smallBlind, level.bigBlind];
    if (level.ante) blinds.push(level.ante);

    for (const blind of blinds) {
      totalBlinds++;

      if (usableValues.includes(blind)) {
        perfectMatches++;
      } else {
        const hasGoodMatch = denomValues.some(denom =>
          blind % denom === 0 && blind / denom <= 10
        );
        if (hasGoodMatch) {
          goodMatches++;
        }
      }
    }
  }

  const score = ((perfectMatches * 1.0 + goodMatches * 0.5) / totalBlinds) * 100;
  return Math.min(score, 100);
}

function calculatePlayabilityScore(distribution: ChipDistribution[], totalChips: number): number {
  let score = 100;

  if (totalChips > 30) {
    score -= (totalChips - 30) * 2;
  }

  if (totalChips < 12) {
    score -= (12 - totalChips) * 5;
  }

  if (distribution.length >= 4) {
    score += 10;
  }

  return Math.max(0, Math.min(score, 100));
}

function analyzeRevaluationOpportunities(
  chips: ChipDenomination[],
  structure: BlindLevel[],
  currentCoverage: number
): RevaluationSuggestion[] {
  // Ne suggérer que si la couverture est insuffisante
  if (currentCoverage >= 80) {
    return [];
  }

  const suggestions: RevaluationSuggestion[] = [];
  const blindValues = structure
    .filter(l => !l.isBreak)
    .flatMap(l => [l.smallBlind, l.bigBlind].filter(Boolean) as number[]);

  const uniqueBlinds = [...new Set(blindValues)].sort((a, b) => a - b);
  const standardValues = [25, 50, 100, 250, 500, 1000, 2500, 5000];

  // Pour chaque jeton, voir s'il serait plus utile avec une valeur standard proche
  for (const chip of chips) {
    const closestStandard = standardValues.reduce((prev, curr) =>
      Math.abs(curr - chip.value) < Math.abs(prev - chip.value) ? curr : prev
    );

    if (closestStandard !== chip.value) {
      // Calculer si cela améliorerait la couverture
      const currentMatches = uniqueBlinds.filter(b =>
        b === chip.value || b === chip.value * 2 || b === chip.value * 4
      ).length;

      const newMatches = uniqueBlinds.filter(b =>
        b === closestStandard || b === closestStandard * 2 || b === closestStandard * 4
      ).length;

      if (newMatches > currentMatches) {
        suggestions.push({
          originalValue: chip.value,
          suggestedValue: closestStandard,
          color: chip.color,
          reason: `Améliore la couverture des blinds (${newMatches} niveaux vs ${currentMatches})`,
          improvementScore: ((newMatches - currentMatches) / uniqueBlinds.length) * 100
        });
      }
    }
  }

  return suggestions.filter(s => s.improvementScore > 10).slice(0, 3);
}

// ============================================
// ALGORITHME GREEDY LEGACY (Fallback)
// ============================================

function greedyDistribution(
  available: ChipDenomination[],
  stackSize: number
): ChipDistribution[] {
  const distribution: ChipDistribution[] = [];
  let remaining = stackSize;

  const sorted = [...available].sort((a, b) => b.value - a.value);

  for (const denom of sorted) {
    if (remaining === 0) break;

    const maxCount = Math.floor(remaining / denom.value);

    if (maxCount > 0) {
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

// ============================================
// UTILITAIRES
// ============================================

function calculateTotalValue(denominations: ChipDenomination[]): number {
  return denominations.reduce((sum, d) => sum + d.value * d.quantity, 0);
}

export function generateRaceOffRecommendations(
  distribution: ChipDistribution[],
  blindLevels: { level: number; smallBlind: number; bigBlind: number }[]
): RaceOffRecommendation[] {
  const recommendations: RaceOffRecommendation[] = [];
  const sorted = [...distribution].sort((a, b) => a.value - b.value);

  for (const chip of sorted) {
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

export function formatDistribution(distribution: ChipDistribution[]): string {
  return distribution
    .map((d) => `${d.count} × ${d.value} = ${d.total}`)
    .join('\n');
}

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

export function generateTournamentStructure(
  stackSize: number,
  playersCount: number,
  levelDuration: number = 20,
  availableDenoms?: number[]
): TournamentStructure {
  // Utiliser la génération adaptée aux jetons si disponibles
  const levels = availableDenoms
    ? generateChipAwareStructure(stackSize, availableDenoms, 180, levelDuration)
    : generateTournamentStructureLegacy(stackSize, levelDuration);

  const totalDuration = levels.filter(l => !l.isBreak).reduce((sum, l) => sum + l.duration, 0);

  return {
    levels,
    totalDuration,
    averageStack: stackSize,
    startingBlinds: {
      small: levels[0].smallBlind,
      big: levels[0].bigBlind,
    },
  };
}

function generateTournamentStructureLegacy(
  stackSize: number,
  levelDuration: number
): BlindLevel[] {
  const levels: BlindLevel[] = [];

  const startingBigBlind = Math.max(findNearestChipValue(stackSize / 100), 25);
  const startingSmallBlind = Math.max(
    findNearestChipValue(startingBigBlind / 2),
    Math.floor(startingBigBlind / 2)
  );

  let currentSmallBlind = startingSmallBlind;
  let currentBigBlind = startingBigBlind;
  let level = 1;

  while (currentBigBlind < stackSize / 10 && level <= 20) {
    const ante = level >= 5 ? Math.floor(currentBigBlind / 10) : undefined;

    levels.push({
      level,
      smallBlind: currentSmallBlind,
      bigBlind: currentBigBlind,
      ante,
      duration: levelDuration,
    });

    const nextBigBlind = findNearestChipValue(currentBigBlind * 1.4);
    const nextSmallBlind = findNearestChipValue(nextBigBlind / 2);

    currentSmallBlind = nextSmallBlind;
    currentBigBlind = nextBigBlind;
    level++;
  }

  return levels;
}

function findNearestChipValue(value: number): number {
  const commonValues = [
    25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500,
    2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000,
  ];

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
