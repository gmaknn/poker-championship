/**
 * CHIP DISTRIBUTION V3 - Avec revalorisation des jetons
 *
 * Nouvelle fonctionnalité : Suggérer de changer la valeur nominale des jetons
 * pour une meilleure couverture des blinds
 *
 * Exemple : Jeton marqué "1000" peut être utilisé comme "500" si la couleur convient
 */

import {
  ChipDenomination,
  ChipDistribution,
  BlindLevel,
  OptimizationResult,
  OptimizationParams,
} from './chipDistributionV2';

export type RevaluationSuggestion = {
  originalValue: number;
  suggestedValue: number;
  color: string;
  reason: string;
  improvedCoverage: number; // % d'amélioration de la couverture
};

export type RevaluationResult = {
  suggestions: RevaluationSuggestion[];
  beforeOptimization: OptimizationResult | null;
  afterOptimization: OptimizationResult | null;
  worthIt: boolean;
  improvementScore: number;
};

/**
 * Analyse si une revalorisation des jetons améliorerait significativement le setup
 */
export function analyzeRevaluationOpportunity(
  params: OptimizationParams
): RevaluationResult {
  console.log('\n🔍 ANALYSE DE REVALORISATION');
  console.log('━'.repeat(60));

  // D'abord, essayer sans revalorisation
  const { optimizeChipSetup } = require('./chipDistributionV2');
  let beforeOptimization: OptimizationResult | null = null;

  try {
    beforeOptimization = optimizeChipSetup(params);
    console.log('✅ Configuration actuelle trouvée');
  } catch (error) {
    console.log('❌ Aucune configuration valide sans revalorisation');
  }

  // Générer des suggestions de revalorisation
  const suggestions = generateRevaluationSuggestions(
    params.availableChips,
    params.targetDuration,
    params.levelDuration || 15
  );

  if (suggestions.length === 0) {
    console.log('ℹ️  Aucune revalorisation recommandée');
    return {
      suggestions: [],
      beforeOptimization,
      afterOptimization: null,
      worthIt: false,
      improvementScore: 0,
    };
  }

  console.log(`\n💡 ${suggestions.length} suggestion(s) de revalorisation :`);
  suggestions.forEach((s, i) => {
    console.log(
      `  ${i + 1}. ${s.originalValue} → ${s.suggestedValue} (${s.color}): ${s.reason}`
    );
  });

  // Appliquer les suggestions et ré-optimiser
  const revaluedChips = applyRevaluations(params.availableChips, suggestions);
  const paramsWithRevaluation = { ...params, availableChips: revaluedChips };

  let afterOptimization: OptimizationResult | null = null;
  try {
    afterOptimization = optimizeChipSetup(paramsWithRevaluation);
    console.log('\n✅ Configuration avec revalorisation trouvée');
  } catch (error) {
    console.log('\n❌ Échec même avec revalorisation');
  }

  // Comparer les résultats
  const worthIt = isRevaluationWorthIt(beforeOptimization, afterOptimization);
  const improvementScore = calculateImprovementScore(
    beforeOptimization,
    afterOptimization
  );

  console.log('\n📊 COMPARAISON');
  console.log(
    `Score avant:  ${beforeOptimization?.metrics.overallScore.toFixed(1) || 'N/A'}`
  );
  console.log(
    `Score après:  ${afterOptimization?.metrics.overallScore.toFixed(1) || 'N/A'}`
  );
  console.log(
    `Amélioration: ${improvementScore > 0 ? '+' : ''}${improvementScore.toFixed(1)} points`
  );
  console.log(`Recommandation: ${worthIt ? '✅ REVALORISER' : '❌ PAS NÉCESSAIRE'}`);

  return {
    suggestions,
    beforeOptimization,
    afterOptimization,
    worthIt,
    improvementScore,
  };
}

/**
 * Génère des suggestions intelligentes de revalorisation
 */
function generateRevaluationSuggestions(
  chips: ChipDenomination[],
  targetDuration: number,
  levelDuration: number
): RevaluationSuggestion[] {
  const suggestions: RevaluationSuggestion[] = [];

  // Calculer une structure "idéale" pour la durée cible
  const idealStructure = calculateIdealBlindStructure(
    targetDuration,
    levelDuration
  );
  const idealValues = extractIdealValues(idealStructure);

  console.log('\n🎯 Valeurs idéales pour la durée cible:', idealValues.slice(0, 10));

  // Analyser chaque jeton disponible
  for (const chip of chips) {
    // Chercher si cette couleur serait plus utile avec une autre valeur
    const bestMatch = findBestRevaluation(chip, idealValues, chips);

    if (bestMatch && bestMatch.value !== chip.value) {
      const improvementScore = calculateCoverageImprovement(
        chip.value,
        bestMatch.value,
        idealValues
      );

      if (improvementScore > 0) {
        suggestions.push({
          originalValue: chip.value,
          suggestedValue: bestMatch.value,
          color: chip.color,
          reason: bestMatch.reason,
          improvedCoverage: improvementScore,
        });
      }
    }
  }

  // Trier par amélioration décroissante
  suggestions.sort((a, b) => b.improvedCoverage - a.improvedCoverage);

  // Ne garder que les suggestions significatives (> 5% d'amélioration)
  return suggestions.filter((s) => s.improvedCoverage > 5);
}

/**
 * Calcule une structure de blinds "idéale" théorique
 */
function calculateIdealBlindStructure(
  targetDuration: number,
  levelDuration: number
): BlindLevel[] {
  const levels: BlindLevel[] = [];
  const targetLevels = Math.floor(targetDuration / levelDuration);

  // Commencer avec un BB arbitraire, on veut juste la séquence
  let currentBB = 50;
  let level = 1;

  while (level <= targetLevels) {
    levels.push({
      level,
      smallBlind: currentBB / 2,
      bigBlind: currentBB,
      ante: level >= 5 ? Math.floor(currentBB * 0.1) : undefined,
      duration: levelDuration,
    });

    // Progression standard 35-40%
    currentBB = Math.ceil(currentBB * 1.35);
    level++;
  }

  return levels;
}

/**
 * Extrait toutes les valeurs de blinds "idéales"
 */
function extractIdealValues(structure: BlindLevel[]): number[] {
  const values = new Set<number>();

  for (const level of structure) {
    if (level.isBreak) continue;

    values.add(level.smallBlind);
    values.add(level.bigBlind);
    if (level.ante) values.add(level.ante);
  }

  return Array.from(values).sort((a, b) => a - b);
}

/**
 * Trouve la meilleure revalorisation pour un jeton
 */
function findBestRevaluation(
  chip: ChipDenomination,
  idealValues: number[],
  allChips: ChipDenomination[]
): { value: number; reason: string } | null {
  // Vérifier si la valeur actuelle correspond déjà bien
  const currentMatch = idealValues.includes(chip.value);

  // Chercher parmi les valeurs idéales celle qui manque le plus
  const missingValues = idealValues.filter(
    (v) => !allChips.some((c) => c.value === v)
  );

  if (missingValues.length === 0) {
    return null; // Tout est déjà couvert
  }

  // Trouver la valeur manquante la plus proche de la valeur actuelle
  let bestValue = chip.value;
  let bestReason = '';
  let bestScore = 0;

  for (const missingValue of missingValues) {
    // Préférer les valeurs dans le même ordre de grandeur
    const ratio = missingValue / chip.value;

    if (ratio >= 0.5 && ratio <= 2.0) {
      // Même ordre de grandeur
      const score = 10 - Math.abs(Math.log10(ratio)) * 5;

      if (score > bestScore || !currentMatch) {
        bestScore = score;
        bestValue = missingValue;
        bestReason = `Comble un manque dans les blinds niveau ${findLevelForValue(missingValue, idealValues)}`;
      }
    }
  }

  if (bestValue === chip.value) {
    return null;
  }

  return { value: bestValue, reason: bestReason };
}

/**
 * Trouve le niveau approximatif où cette valeur serait utilisée
 */
function findLevelForValue(value: number, idealValues: number[]): number {
  const index = idealValues.indexOf(value);
  if (index === -1) return 0;

  // Approximation: environ 3 valeurs par niveau (SB, BB, ante)
  return Math.floor(index / 3) + 1;
}

/**
 * Calcule l'amélioration de couverture (en %)
 */
function calculateCoverageImprovement(
  oldValue: number,
  newValue: number,
  idealValues: number[]
): number {
  const oldMatches = idealValues.filter(
    (v) => v === oldValue || v === oldValue * 2 || v === oldValue * 4
  ).length;

  const newMatches = idealValues.filter(
    (v) => v === newValue || v === newValue * 2 || v === newValue * 4
  ).length;

  const improvement = ((newMatches - oldMatches) / idealValues.length) * 100;
  return Math.max(0, improvement);
}

/**
 * Applique les revaluations aux jetons
 */
function applyRevaluations(
  chips: ChipDenomination[],
  suggestions: RevaluationSuggestion[]
): ChipDenomination[] {
  return chips.map((chip) => {
    const suggestion = suggestions.find((s) => s.originalValue === chip.value);
    if (suggestion) {
      return {
        ...chip,
        value: suggestion.suggestedValue,
      };
    }
    return chip;
  });
}

/**
 * Détermine si la revalorisation vaut la peine
 */
function isRevaluationWorthIt(
  before: OptimizationResult | null,
  after: OptimizationResult | null
): boolean {
  if (!before && after) {
    return true; // Permet une solution qui n'existait pas
  }

  if (!after) {
    return false; // Ne permet pas de solution
  }

  if (!before) {
    return true; // Permet une solution
  }

  // Amélioration significative (> 5 points)
  const improvement = after.metrics.overallScore - before.metrics.overallScore;
  return improvement > 5;
}

/**
 * Calcule le score d'amélioration
 */
function calculateImprovementScore(
  before: OptimizationResult | null,
  after: OptimizationResult | null
): number {
  if (!before && !after) return 0;
  if (!before && after) return 100; // Solution trouvée !
  if (before && !after) return -100; // Pire qu'avant
  if (before && after) {
    return after.metrics.overallScore - before.metrics.overallScore;
  }
  return 0;
}

/**
 * Affiche les résultats de l'analyse de revalorisation
 */
export function displayRevaluationResults(result: RevaluationResult): void {
  console.log('\n' + '═'.repeat(60));
  console.log('RÉSULTATS DE L\'ANALYSE DE REVALORISATION');
  console.log('═'.repeat(60));

  if (result.suggestions.length === 0) {
    console.log('\nℹ️  Aucune revalorisation nécessaire');
    console.log('La configuration actuelle est déjà optimale');
    return;
  }

  console.log('\n💡 SUGGESTIONS DE REVALORISATION\n');
  result.suggestions.forEach((s, i) => {
    console.log(`${i + 1}. Jeton de couleur ${s.color}`);
    console.log(`   Valeur actuelle: ${s.originalValue}`);
    console.log(`   ➜ Valeur suggérée: ${s.suggestedValue}`);
    console.log(`   Raison: ${s.reason}`);
    console.log(`   Amélioration: +${s.improvedCoverage.toFixed(1)}%\n`);
  });

  console.log('📊 COMPARAISON DES CONFIGURATIONS\n');

  if (result.beforeOptimization) {
    console.log('AVANT (valeurs nominales):');
    console.log(`  Score: ${result.beforeOptimization.metrics.overallScore.toFixed(1)}/100`);
    console.log(
      `  Couverture: ${result.beforeOptimization.metrics.blindCoverageScore.toFixed(1)}%`
    );
    console.log(`  Jetons: ${result.beforeOptimization.metrics.totalChipsPerPlayer}`);
  } else {
    console.log('AVANT: ❌ Aucune configuration valide');
  }

  console.log('');

  if (result.afterOptimization) {
    console.log('APRÈS (avec revalorisation):');
    console.log(`  Score: ${result.afterOptimization.metrics.overallScore.toFixed(1)}/100`);
    console.log(
      `  Couverture: ${result.afterOptimization.metrics.blindCoverageScore.toFixed(1)}%`
    );
    console.log(`  Jetons: ${result.afterOptimization.metrics.totalChipsPerPlayer}`);
  } else {
    console.log('APRÈS: ❌ Échec même avec revalorisation');
  }

  console.log('');
  console.log(
    `Amélioration: ${result.improvementScore > 0 ? '+' : ''}${result.improvementScore.toFixed(1)} points`
  );

  console.log('\n🎯 RECOMMANDATION\n');
  if (result.worthIt) {
    console.log('✅ LA REVALORISATION EST RECOMMANDÉE');
    console.log('\nPour appliquer:');
    result.suggestions.forEach((s, i) => {
      console.log(
        `  ${i + 1}. Utilisez les jetons ${s.color} comme valeur ${s.suggestedValue}`
      );
    });
  } else {
    console.log('❌ La revalorisation n\'apporte pas d\'amélioration significative');
    console.log('Conservez les valeurs nominales des jetons');
  }

  console.log('\n' + '═'.repeat(60));
}
