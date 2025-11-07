/**
 * Générateur automatique de structures de blinds pour tournois de poker
 */

export type BlindLevel = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
};

export type BlindGeneratorConfig = {
  startingChips: number;
  targetDuration: number; // en minutes
  levelDuration: number; // en minutes
  startingBB?: number; // Big blind de départ (optionnel, calculé automatiquement si non fourni)
  anteStartLevel?: number; // Niveau où les antes commencent (défaut: niveau 5)
};

/**
 * Génère une structure de blinds automatiquement
 */
export function generateBlindStructure(config: BlindGeneratorConfig): BlindLevel[] {
  const {
    startingChips,
    targetDuration,
    levelDuration,
    startingBB = Math.floor(startingChips / 250), // Par défaut: startingChips / 250
    anteStartLevel = 5,
  } = config;

  const totalLevels = Math.ceil(targetDuration / levelDuration);
  const levels: BlindLevel[] = [];

  // Calculer la progression (environ 40-50% par niveau)
  const progressionFactor = 1.4;

  let currentBB = startingBB;

  for (let i = 1; i <= totalLevels; i++) {
    const smallBlind = Math.round(currentBB / 2);
    const bigBlind = Math.round(currentBB);

    // Commencer les antes après un certain niveau
    const ante = i >= anteStartLevel ? Math.round(bigBlind * 0.1) : 0;

    levels.push({
      level: i,
      smallBlind,
      bigBlind,
      ante,
      duration: levelDuration,
    });

    // Augmenter le BB pour le prochain niveau
    currentBB = Math.round(currentBB * progressionFactor);

    // Arrondir à des valeurs "agréables"
    currentBB = roundToNiceValue(currentBB);
  }

  return levels;
}

/**
 * Arrondit une valeur à un nombre "agréable" pour les blinds
 * Ex: 127 -> 125, 234 -> 250, 1234 -> 1250
 */
function roundToNiceValue(value: number): number {
  if (value < 10) return value;
  if (value < 100) {
    // Arrondir à la dizaine ou au 25/50/75
    const nearestTen = Math.round(value / 10) * 10;
    const nearest25 = Math.round(value / 25) * 25;
    return Math.abs(value - nearest25) < Math.abs(value - nearestTen) ? nearest25 : nearestTen;
  }
  if (value < 1000) {
    // Arrondir au 50 ou 100
    return Math.round(value / 50) * 50;
  }
  if (value < 10000) {
    // Arrondir au 250 ou 500
    return Math.round(value / 250) * 250;
  }
  // Pour les grandes valeurs, arrondir au millier
  return Math.round(value / 1000) * 1000;
}

/**
 * Génère des structures prédéfinies populaires
 */
export const PRESET_STRUCTURES = {
  turbo: (startingChips: number): BlindLevel[] =>
    generateBlindStructure({
      startingChips,
      targetDuration: 120, // 2h
      levelDuration: 8,
      anteStartLevel: 4,
    }),

  standard: (startingChips: number): BlindLevel[] =>
    generateBlindStructure({
      startingChips,
      targetDuration: 180, // 3h
      levelDuration: 12,
      anteStartLevel: 5,
    }),

  deep: (startingChips: number): BlindLevel[] =>
    generateBlindStructure({
      startingChips,
      targetDuration: 240, // 4h
      levelDuration: 15,
      anteStartLevel: 6,
    }),
};

/**
 * Calcule des statistiques sur une structure de blinds
 */
export function calculateBlindStats(levels: BlindLevel[], startingChips: number) {
  const totalDuration = levels.reduce((sum, level) => sum + level.duration, 0);
  const firstLevel = levels[0];
  const lastLevel = levels[levels.length - 1];

  return {
    totalLevels: levels.length,
    totalDuration,
    startingBB: firstLevel.bigBlind,
    endingBB: lastLevel.bigBlind,
    startingStackBB: Math.floor(startingChips / firstLevel.bigBlind),
    anteStartLevel: levels.findIndex((l) => l.ante > 0) + 1 || 0,
  };
}

/**
 * Valide qu'une structure de blinds est cohérente
 */
export function validateBlindStructure(levels: BlindLevel[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (levels.length === 0) {
    errors.push('La structure doit contenir au moins un niveau');
  }

  // Vérifier que les niveaux sont séquentiels
  for (let i = 0; i < levels.length; i++) {
    if (levels[i].level !== i + 1) {
      errors.push(`Le niveau ${i + 1} a un numéro incorrect: ${levels[i].level}`);
    }
  }

  // Vérifier que les blinds augmentent
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].bigBlind <= levels[i - 1].bigBlind) {
      errors.push(`Le niveau ${i + 1} n'augmente pas les blinds`);
    }
  }

  // Vérifier que SB = BB / 2 (environ)
  for (let i = 0; i < levels.length; i++) {
    const expectedSB = Math.floor(levels[i].bigBlind / 2);
    if (levels[i].smallBlind < expectedSB * 0.9 || levels[i].smallBlind > expectedSB * 1.1) {
      errors.push(`Le niveau ${i + 1} a une SB qui n'est pas BB/2`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
