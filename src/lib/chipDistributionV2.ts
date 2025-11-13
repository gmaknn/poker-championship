/**
 * CHIP DISTRIBUTION V2 - Prototype
 *
 * Nouvelle approche d'optimisation tri-dimensionnelle :
 * 1. Maximiser la couverture de tous les niveaux de blinds
 * 2. Optimiser pour atteindre une durée cible
 * 3. Distribution intelligente basée sur l'utilité des jetons
 */

// Types
export type ChipDenomination = {
  value: number;
  quantity: number;
  color: string;
};

export type ChipDistribution = {
  value: number;
  count: number;
  total: number;
  color: string;
  purpose: string; // "early-game" | "mid-game" | "late-game" | "change-making"
};

export type BlindLevel = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
  duration: number;
  isBreak?: boolean;
};

export type OptimizationResult = {
  stackSize: number;
  distribution: ChipDistribution[];
  structure: BlindLevel[];
  metrics: {
    totalChipsPerPlayer: number;
    blindCoverageScore: number; // 0-100
    playabilityScore: number; // 0-100
    durationMatch: number; // minutes de différence avec la cible
    utilizationRate: number; // % des jetons utilisés
    overallScore: number; // Score global 0-100
  };
  analysis: {
    coverageByLevel: { level: number; hasPerfectMatch: boolean; closestDenom: number }[];
    warnings: string[];
    recommendations: string[];
  };
};

export type OptimizationParams = {
  availableChips: ChipDenomination[];
  playersCount: number;
  rebuysExpected: number;
  targetDuration: number; // en minutes
  levelDuration?: number; // durée d'un niveau en minutes (défaut: 15)
};

/**
 * FONCTION PRINCIPALE : Optimisation complète
 */
export function optimizeChipSetup(params: OptimizationParams): OptimizationResult {
  const { availableChips, playersCount, rebuysExpected, targetDuration, levelDuration = 15 } = params;

  console.log('🎯 Starting optimization...');
  console.log('Available denominations:', availableChips.map(c => c.value).sort((a, b) => a - b));

  // Étape 1: Calculer les stacks candidats
  const totalValue = availableChips.reduce((sum, c) => sum + c.value * c.quantity, 0);
  const maxStackPerPlayer = Math.floor(totalValue / (playersCount + rebuysExpected));

  const stackCandidates = generateStackCandidates(maxStackPerPlayer);
  console.log('Stack candidates:', stackCandidates);

  // Étape 2: Pour chaque stack candidat, générer et scorer une configuration complète
  let bestConfig: OptimizationResult | null = null;
  let bestScore = -1;

  for (const stackSize of stackCandidates) {
    console.log(`\n--- Testing stack size: ${stackSize} ---`);

    // Générer structure adaptée aux jetons
    const structure = generateChipAwareStructure(
      stackSize,
      availableChips.map(c => c.value),
      targetDuration,
      levelDuration
    );

    // Calculer distribution optimale
    const distribution = calculateWeightedDistribution(
      availableChips,
      stackSize,
      structure,
      playersCount,
      rebuysExpected
    );

    if (!distribution) {
      console.log('❌ Cannot create valid distribution for this stack');
      continue;
    }

    // Calculer les métriques
    const metrics = calculateMetrics(distribution, structure, availableChips, playersCount, rebuysExpected, targetDuration);

    // Analyser la couverture
    const analysis = analyzeConfiguration(distribution, structure, availableChips, playersCount);

    const config: OptimizationResult = {
      stackSize,
      distribution,
      structure,
      metrics,
      analysis
    };

    console.log(`Score: ${metrics.overallScore.toFixed(1)} (Coverage: ${metrics.blindCoverageScore.toFixed(1)}, Playability: ${metrics.playabilityScore.toFixed(1)})`);

    if (metrics.overallScore > bestScore) {
      bestScore = metrics.overallScore;
      bestConfig = config;
    }
  }

  if (!bestConfig) {
    throw new Error('Impossible de générer une configuration valide avec les jetons disponibles');
  }

  console.log('\n✅ Best configuration found!');
  console.log('Stack:', bestConfig.stackSize);
  console.log('Overall score:', bestConfig.metrics.overallScore.toFixed(1));

  return bestConfig;
}

/**
 * Génère une liste de stacks candidats basée sur la capacité totale
 */
function generateStackCandidates(maxStack: number): number[] {
  const candidates = [5000, 7500, 10000, 12500, 15000, 20000, 25000, 30000, 40000, 50000];
  return candidates.filter(s => s <= maxStack);
}

/**
 * PHASE 1: Génère une structure de blinds adaptée aux jetons disponibles
 *
 * Principe: Les blinds doivent correspondre aux dénominations disponibles
 * ou être des multiples simples (2x, 4x, 5x) d'une dénomination
 */
function generateChipAwareStructure(
  stackSize: number,
  availableDenoms: number[],
  targetDuration: number,
  levelDuration: number
): BlindLevel[] {
  const sortedDenoms = [...availableDenoms].sort((a, b) => a - b);
  const levels: BlindLevel[] = [];

  // Big blind initial: 1-2% du stack
  let targetBB = Math.max(stackSize * 0.01, 25);

  // Trouver le BB initial le plus proche dans les dénominations disponibles
  let currentBB = findClosestUsableDenomination(targetBB, sortedDenoms);

  const targetLevels = Math.floor(targetDuration / levelDuration);
  let level = 1;

  // Générer les niveaux jusqu'à atteindre ~10% du stack ou le nombre de niveaux cible
  while (currentBB < stackSize * 0.1 && level <= targetLevels + 5) {
    const currentSB = findSmallBlindForBigBlind(currentBB, sortedDenoms);

    // Ajouter des antes à partir du niveau 5
    const ante = level >= 5 ? findAnteForBigBlind(currentBB, sortedDenoms) : undefined;

    levels.push({
      level,
      smallBlind: currentSB,
      bigBlind: currentBB,
      ante,
      duration: levelDuration,
    });

    // Calculer le prochain BB avec progression adaptative
    const progressionRate = calculateProgressionRate(level, targetLevels, levels.length);
    let nextBB = currentBB * progressionRate;

    // Trouver le prochain BB utilisable
    nextBB = findNextUsableDenomination(nextBB, currentBB, sortedDenoms);

    currentBB = nextBB;
    level++;
  }

  // Ajouter des pauses toutes les 4 niveaux (sauf la dernière)
  const levelsWithBreaks = levels.map((lvl, index) => {
    const isBreakTime = (index + 1) % 4 === 0 && index < levels.length - 1;
    return isBreakTime ? { ...lvl, isBreak: false } : lvl; // On met false car on va insérer une vraie pause après
  });

  // Insérer les vraies pauses
  const finalLevels: BlindLevel[] = [];
  levelsWithBreaks.forEach((lvl, index) => {
    finalLevels.push(lvl);
    if ((index + 1) % 4 === 0 && index < levelsWithBreaks.length - 1) {
      finalLevels.push({
        level: lvl.level + 0.5, // Numérotation intermédiaire
        smallBlind: 0,
        bigBlind: 0,
        duration: 10,
        isBreak: true,
      });
    }
  });

  return finalLevels;
}

/**
 * Trouve la dénomination utilisable la plus proche
 * Une dénomination est "utilisable" si elle existe ou si c'est un multiple simple d'une dénomination
 */
function findClosestUsableDenomination(target: number, denoms: number[]): number {
  // Chercher une correspondance exacte ou un multiple simple
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

/**
 * Génère toutes les valeurs "utilisables" à partir des dénominations
 * Inclut: les dénominations elles-mêmes + multiples simples (2x, 4x, 5x)
 */
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

/**
 * Trouve le small blind optimal pour un big blind donné
 */
function findSmallBlindForBigBlind(bigBlind: number, denoms: number[]): number {
  const targetSB = bigBlind / 2;
  return findClosestUsableDenomination(targetSB, denoms);
}

/**
 * Trouve l'ante optimal pour un big blind donné (environ 10% du BB)
 */
function findAnteForBigBlind(bigBlind: number, denoms: number[]): number {
  const targetAnte = Math.floor(bigBlind * 0.1);
  const usableValues = generateUsableValues(denoms);

  // Trouver la plus proche valeur inférieure ou égale
  const candidates = usableValues.filter(v => v <= targetAnte);
  return candidates.length > 0 ? candidates[candidates.length - 1] : denoms[0];
}

/**
 * Trouve la prochaine dénomination utilisable supérieure à target
 */
function findNextUsableDenomination(target: number, currentBB: number, denoms: number[]): number {
  const usableValues = generateUsableValues(denoms);

  // Trouver la première valeur strictement supérieure à target
  const candidates = usableValues.filter(v => v > target && v > currentBB);

  if (candidates.length === 0) {
    // Si aucune valeur trouvée, utiliser un multiple du plus grand jeton
    return Math.ceil(target / denoms[denoms.length - 1]) * denoms[denoms.length - 1];
  }

  return candidates[0];
}

/**
 * Calcule le taux de progression adaptatif
 * Plus lent au début, plus rapide vers la fin
 */
function calculateProgressionRate(currentLevel: number, targetLevels: number, actualLevels: number): number {
  // Si on a déjà trop de niveaux, accélérer
  if (actualLevels > targetLevels * 0.8) {
    return 1.5; // Progression rapide
  }

  // Progression normale: 1.3 à 1.4
  return 1.35;
}

/**
 * PHASE 2: Calcule une distribution pondérée basée sur l'utilité des jetons
 */
function calculateWeightedDistribution(
  availableChips: ChipDenomination[],
  stackSize: number,
  structure: BlindLevel[],
  playersCount: number,
  rebuysExpected: number
): ChipDistribution[] | null {
  const denoms = [...availableChips].sort((a, b) => b.value - a.value);

  // Calculer l'importance de chaque dénomination
  const importance = denoms.map(denom => ({
    ...denom,
    score: calculateDenominationImportance(denom.value, stackSize, structure)
  }));

  // Trier par importance
  importance.sort((a, b) => b.score - a.score);

  console.log('Denomination importance:');
  importance.forEach(d => console.log(`  ${d.value}: ${d.score.toFixed(2)}`));

  // Distribution en 3 passes
  const distribution: ChipDistribution[] = [];
  let remaining = stackSize;

  // Passe 1: Petites dénominations (change-making) - Quantité limitée
  const smallDenoms = importance.filter(d => d.value < stackSize * 0.05);
  for (const denom of smallDenoms) {
    if (remaining <= 0) break;

    // 4-8 jetons pour faire la monnaie (réduit pour laisser de la place aux gros jetons)
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

  // Passe 2: Dénominations moyennes (early-mid game) - Quantité modérée
  const mediumDenoms = importance.filter(d => d.value >= stackSize * 0.05 && d.value < stackSize * 0.2);
  for (const denom of mediumDenoms) {
    if (remaining <= 0) break;

    // 6-10 jetons pour le mid-game (réduit aussi)
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

  // Passe 3: Grandes dénominations (late game) - Distribution agressive
  const largeDenoms = importance.filter(d => d.value >= stackSize * 0.2);

  // Trier par valeur décroissante pour utiliser les plus gros jetons en premier
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

  // Si encore du reste, compléter avec les denoms moyennes/petites
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

  // Vérifier qu'on a une distribution valide
  const totalValue = distribution.reduce((sum, d) => sum + d.total, 0);
  const isValid = totalValue >= stackSize * 0.90; // Au moins 90% du stack (assoupli)

  if (!isValid) {
    console.log('❌ Invalid distribution: only', totalValue, 'of', stackSize);
    return null;
  }

  console.log(`✅ Valid distribution: ${totalValue} of ${stackSize} (${((totalValue/stackSize)*100).toFixed(1)}%)`)

  return distribution.sort((a, b) => b.value - a.value);
}

/**
 * Calcule l'importance d'une dénomination basée sur son utilité dans la structure
 */
function calculateDenominationImportance(
  denomValue: number,
  stackSize: number,
  structure: BlindLevel[]
): number {
  let score = 0;

  // Score basé sur la couverture des blinds
  const blindValues = structure
    .filter(l => !l.isBreak)
    .flatMap(l => [l.smallBlind, l.bigBlind, l.ante].filter(Boolean) as number[]);

  for (const blind of blindValues) {
    // Match exact
    if (blind === denomValue) {
      score += 10;
    }
    // Multiple simple (2x, 4x, 5x)
    else if (blind === denomValue * 2 || blind === denomValue * 4 || blind === denomValue * 5) {
      score += 5;
    }
    // Dans la même "zone" (facteur 10)
    else if (blind / 10 <= denomValue && denomValue <= blind * 10) {
      score += 1;
    }
  }

  // Bonus pour les dénominations intermédiaires (jouabilité)
  const relativeSize = denomValue / stackSize;
  if (relativeSize >= 0.03 && relativeSize <= 0.15) {
    score += 5; // Taille idéale pour faire de la monnaie
  }

  return score;
}

/**
 * PHASE 3: Calcule toutes les métriques de qualité
 */
function calculateMetrics(
  distribution: ChipDistribution[],
  structure: BlindLevel[],
  availableChips: ChipDenomination[],
  playersCount: number,
  rebuysExpected: number,
  targetDuration: number
): OptimizationResult['metrics'] {
  const totalChipsPerPlayer = distribution.reduce((sum, d) => sum + d.count, 0);

  // Métrique 1: Couverture des blinds (priorité #1)
  const blindCoverageScore = calculateBlindCoverageScore(distribution, structure);

  // Métrique 2: Jouabilité
  const playabilityScore = calculatePlayabilityScore(distribution, totalChipsPerPlayer);

  // Métrique 3: Match de durée
  const actualDuration = structure
    .filter(l => !l.isBreak)
    .reduce((sum, l) => sum + l.duration, 0);
  const durationMatch = Math.abs(targetDuration - actualDuration);

  // Métrique 4: Taux d'utilisation
  const totalValue = distribution.reduce((sum, d) => sum + d.total, 0);
  const totalUsed = totalValue * (playersCount + rebuysExpected);
  const totalAvailable = availableChips.reduce((sum, c) => sum + c.value * c.quantity, 0);
  const utilizationRate = (totalUsed / totalAvailable) * 100;

  // Score global (pondéré selon les priorités)
  const durationScore = Math.max(0, 100 - (durationMatch / targetDuration) * 100);
  const utilizationScore = Math.min(utilizationRate, 100);

  const overallScore =
    blindCoverageScore * 0.50 +  // 50% - Priorité maximale
    playabilityScore * 0.20 +     // 20%
    durationScore * 0.20 +         // 20%
    utilizationScore * 0.10;       // 10%

  return {
    totalChipsPerPlayer,
    blindCoverageScore,
    playabilityScore,
    durationMatch,
    utilizationRate,
    overallScore
  };
}

/**
 * Calcule le score de couverture des blinds (0-100)
 * 100 = Tous les blinds ont une correspondance parfaite
 */
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
        // Vérifier si c'est un multiple simple d'une dénomination disponible
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

/**
 * Calcule le score de jouabilité (0-100)
 */
function calculatePlayabilityScore(distribution: ChipDistribution[], totalChips: number): number {
  let score = 100;

  // Pénalité si trop de jetons
  if (totalChips > 30) {
    score -= (totalChips - 30) * 2; // -2 points par jeton au-dessus de 30
  }

  // Pénalité si pas assez de jetons
  if (totalChips < 12) {
    score -= (12 - totalChips) * 5; // -5 points par jeton manquant
  }

  // Bonus si on a des dénominations variées
  if (distribution.length >= 4) {
    score += 10;
  }

  return Math.max(0, Math.min(score, 100));
}

/**
 * Analyse détaillée de la configuration
 */
function analyzeConfiguration(
  distribution: ChipDistribution[],
  structure: BlindLevel[],
  availableChips: ChipDenomination[],
  playersCount: number
): OptimizationResult['analysis'] {
  const denomValues = distribution.map(d => d.value);
  const usableValues = generateUsableValues(denomValues);

  const coverageByLevel = structure
    .filter(l => !l.isBreak)
    .map(level => {
      const hasPerfectMatch = usableValues.includes(level.bigBlind);
      const closestDenom = findClosestUsableDenomination(level.bigBlind, denomValues);

      return {
        level: level.level,
        hasPerfectMatch,
        closestDenom
      };
    });

  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Vérifier la couverture globale
  const perfectMatchCount = coverageByLevel.filter(c => c.hasPerfectMatch).length;
  const coverageRate = (perfectMatchCount / coverageByLevel.length) * 100;

  if (coverageRate < 60) {
    warnings.push(`Seulement ${perfectMatchCount}/${coverageByLevel.length} niveaux ont une correspondance parfaite`);
  }

  // Vérifier le nombre de jetons
  const totalChips = distribution.reduce((sum, d) => sum + d.count, 0);
  if (totalChips < 12) {
    warnings.push(`Peu de jetons par joueur (${totalChips}), risque de manquer de flexibilité`);
  } else if (totalChips > 25) {
    recommendations.push(`Beaucoup de jetons (${totalChips}), envisager de simplifier`);
  }

  // Vérifier la disponibilité
  for (const dist of distribution) {
    const available = availableChips.find(c => c.value === dist.value);
    if (available) {
      const needed = dist.count * playersCount;
      if (needed > available.quantity * 0.9) {
        warnings.push(`Utilisation élevée des jetons ${dist.value} (${needed}/${available.quantity})`);
      }
    }
  }

  return {
    coverageByLevel,
    warnings,
    recommendations
  };
}

/**
 * Fonction utilitaire pour afficher les résultats de manière lisible
 */
export function displayResults(result: OptimizationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('RÉSULTATS DE L\'OPTIMISATION');
  console.log('='.repeat(60));

  console.log('\n📊 CONFIGURATION');
  console.log(`Stack de départ: ${result.stackSize.toLocaleString()}`);
  console.log(`Score global: ${result.metrics.overallScore.toFixed(1)}/100`);

  console.log('\n🎰 DISTRIBUTION DES JETONS');
  result.distribution.forEach(d => {
    console.log(`  ${d.count} × ${d.value.toLocaleString()} = ${d.total.toLocaleString()} [${d.purpose}]`);
  });
  console.log(`  Total: ${result.metrics.totalChipsPerPlayer} jetons`);

  console.log('\n🎯 STRUCTURE DES BLINDS');
  const realLevels = result.structure.filter(l => !l.isBreak);
  console.log(`Niveaux: ${realLevels.length}`);
  console.log(`Durée estimée: ${realLevels.reduce((s, l) => s + l.duration, 0)} min`);

  // Afficher les premiers niveaux
  console.log('\nPremiers niveaux:');
  realLevels.slice(0, 8).forEach(level => {
    const ante = level.ante ? ` / Ante ${level.ante}` : '';
    console.log(`  Niveau ${level.level}: ${level.smallBlind}/${level.bigBlind}${ante}`);
  });

  console.log('\n📈 MÉTRIQUES');
  console.log(`Couverture des blinds: ${result.metrics.blindCoverageScore.toFixed(1)}/100`);
  console.log(`Jouabilité: ${result.metrics.playabilityScore.toFixed(1)}/100`);
  console.log(`Différence de durée: ${result.metrics.durationMatch} min`);
  console.log(`Taux d'utilisation: ${result.metrics.utilizationRate.toFixed(1)}%`);

  if (result.analysis.warnings.length > 0) {
    console.log('\n⚠️  AVERTISSEMENTS');
    result.analysis.warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (result.analysis.recommendations.length > 0) {
    console.log('\n💡 RECOMMANDATIONS');
    result.analysis.recommendations.forEach(r => console.log(`  - ${r}`));
  }

  console.log('\n' + '='.repeat(60));
}
