/**
 * Scoring utilities for poker championship
 * Centralized calculation functions for points, penalties, etc.
 */

// Types
export interface RecavePenaltyTier {
  fromRecaves: number;   // Minimum recaves to trigger this tier (inclusive)
  penaltyPoints: number; // Negative value (e.g., -50)
}

export interface RecavePenaltyRules {
  freeRebuysCount: number;
  tiers: RecavePenaltyTier[];
}

// Season type for parsing (matches Prisma model)
export interface SeasonWithPenaltyRules {
  freeRebuysCount: number;
  recavePenaltyTiers?: unknown;
  rebuyPenaltyTier1: number;
  rebuyPenaltyTier2: number;
  rebuyPenaltyTier3: number;
}

/**
 * Compute the recave penalty for a player based on their total rebuys.
 *
 * Logic (NON-CUMULATIVE):
 * 1. If totalRebuys <= freeRebuysCount, penalty = 0
 * 2. Otherwise, find the highest tier where totalRebuys >= tier.fromRecaves
 * 3. Return that tier's penaltyPoints (or 0 if no tier matches)
 *
 * @param totalRebuys - Total number of rebuys (standard only, not light)
 * @param rules - The season's rebuy penalty rules
 * @returns The penalty points (negative number or 0)
 */
export function computeRecavePenalty(
  totalRebuys: number,
  rules: RecavePenaltyRules
): number {
  // No penalty if within free rebuys
  if (totalRebuys <= rules.freeRebuysCount) {
    return 0;
  }

  // Handle empty tiers
  if (!rules.tiers || rules.tiers.length === 0) {
    return 0;
  }

  // Sort tiers by fromRecaves descending to find highest matching tier first
  const sortedTiers = [...rules.tiers].sort(
    (a, b) => b.fromRecaves - a.fromRecaves
  );

  // Find the highest tier that applies
  for (const tier of sortedTiers) {
    if (totalRebuys >= tier.fromRecaves) {
      return tier.penaltyPoints;
    }
  }

  return 0;
}

/**
 * Validate that a tier array is correctly structured
 */
function isValidTierArray(tiers: unknown): tiers is RecavePenaltyTier[] {
  if (!Array.isArray(tiers)) return false;

  return tiers.every(tier =>
    typeof tier === 'object' &&
    tier !== null &&
    typeof tier.fromRecaves === 'number' &&
    typeof tier.penaltyPoints === 'number' &&
    tier.fromRecaves >= 1 &&
    tier.penaltyPoints <= 0
  );
}

/**
 * Parse and validate recave penalty tiers from JSON storage.
 * Falls back to legacy tier fields if new format not available.
 *
 * @param season - Season object with penalty configuration
 * @returns Normalized RecavePenaltyRules
 */
export function parseRecavePenaltyRules(season: SeasonWithPenaltyRules): RecavePenaltyRules {
  // Try new format first
  if (season.recavePenaltyTiers && isValidTierArray(season.recavePenaltyTiers)) {
    return {
      freeRebuysCount: season.freeRebuysCount,
      tiers: season.recavePenaltyTiers,
    };
  }

  // Fall back to legacy format
  // Legacy tiers are based on total rebuys, not paid rebuys
  // With freeRebuysCount=2: tier1 at 3, tier2 at 4, tier3 at 5+
  const freeCount = season.freeRebuysCount;

  return {
    freeRebuysCount: freeCount,
    tiers: [
      { fromRecaves: freeCount + 1, penaltyPoints: season.rebuyPenaltyTier1 },
      { fromRecaves: freeCount + 2, penaltyPoints: season.rebuyPenaltyTier2 },
      { fromRecaves: freeCount + 3, penaltyPoints: season.rebuyPenaltyTier3 },
    ],
  };
}

/**
 * Convert RecavePenaltyRules back to JSON for storage
 */
export function serializeRecavePenaltyTiers(rules: RecavePenaltyRules): RecavePenaltyTier[] {
  // Sort by fromRecaves ascending for consistent storage
  return [...rules.tiers].sort((a, b) => a.fromRecaves - b.fromRecaves);
}

/**
 * Generate a preview of penalties for different rebuy counts.
 * Useful for UI display.
 *
 * @param rules - The penalty rules to preview
 * @param maxRebuys - Maximum rebuys to show (default 7)
 * @returns Array of { rebuys, penalty } for display
 */
export function generatePenaltyPreview(
  rules: RecavePenaltyRules,
  maxRebuys: number = 7
): Array<{ rebuys: number; penalty: number }> {
  const preview: Array<{ rebuys: number; penalty: number }> = [];

  for (let i = 0; i <= maxRebuys; i++) {
    preview.push({
      rebuys: i,
      penalty: computeRecavePenalty(i, rules),
    });
  }

  return preview;
}

/**
 * Validate tier configuration
 * Returns error messages if invalid, empty array if valid
 */
export function validateTierConfiguration(
  freeRebuysCount: number,
  tiers: RecavePenaltyTier[]
): string[] {
  const errors: string[] = [];

  if (tiers.length === 0) {
    errors.push('Au moins un palier de malus est requis');
    return errors;
  }

  // Check each tier
  const seenFromRecaves = new Set<number>();

  for (const tier of tiers) {
    if (tier.fromRecaves < 1) {
      errors.push(`Le nombre de recaves doit être >= 1 (trouvé: ${tier.fromRecaves})`);
    }

    if (tier.fromRecaves <= freeRebuysCount) {
      errors.push(`Le palier ${tier.fromRecaves} recaves doit être > recaves gratuites (${freeRebuysCount})`);
    }

    if (tier.penaltyPoints > 0) {
      errors.push(`Le malus doit être <= 0 (trouvé: ${tier.penaltyPoints})`);
    }

    if (seenFromRecaves.has(tier.fromRecaves)) {
      errors.push(`Palier en double: ${tier.fromRecaves} recaves`);
    }
    seenFromRecaves.add(tier.fromRecaves);
  }

  return errors;
}

// ============================================================================
// Points Calculation System
// ============================================================================

// Type for detailed points configuration
export interface DetailedPointsConfig {
  type: 'DETAILED';
  byRank: Record<string, number>;
  rank19Plus: number;
}

// Season type for points calculation
export interface SeasonWithPointsConfig {
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
  eliminationPoints: number;
  leaderKillerBonus: number;
}

// TournamentPlayer type for points calculation
export interface TournamentPlayerForPoints {
  playerId: string;
  finalRank: number | null;
  eliminationsCount: number;
  leaderKills: number;
  penaltyPoints: number;
}

/**
 * Get rank points using detailed config if available, otherwise fall back to legacy fields
 */
export function getRankPointsForPosition(
  rank: number,
  season: SeasonWithPointsConfig
): number {
  // Check if detailed config exists and is valid
  const config = season.detailedPointsConfig as DetailedPointsConfig | null;
  if (config && config.type === 'DETAILED' && config.byRank) {
    // Use detailed config
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) {
      return pointsForRank;
    }
    // Rank not in byRank (19+), use rank19Plus
    return config.rank19Plus ?? 0;
  }

  // Fall back to legacy field-based system
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

  // Legacy: positions 1-10
  if (legacyPointsMap[rank] !== undefined) {
    return legacyPointsMap[rank];
  }

  // Legacy: positions 11-15
  if (rank >= 11 && rank <= 15) {
    return season.pointsEleventh;
  }

  // Legacy: positions 16+
  return season.pointsSixteenth;
}

/**
 * Calculate points for a single tournament player
 */
export function calculatePlayerPoints(
  player: TournamentPlayerForPoints,
  season: SeasonWithPointsConfig
): {
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
} {
  let rankPoints = 0;
  let eliminationPoints = 0;
  let bonusPoints = 0;

  if (player.finalRank !== null) {
    // Points de classement selon la position finale
    rankPoints = getRankPointsForPosition(player.finalRank, season);

    // Points d'élimination
    eliminationPoints = player.eliminationsCount * season.eliminationPoints;

    // Bonus Leader Killer
    bonusPoints = player.leaderKills * season.leaderKillerBonus;
  }

  // Calculer le total (penaltyPoints déjà stocké)
  const totalPoints = rankPoints + eliminationPoints + bonusPoints + player.penaltyPoints;

  return {
    rankPoints,
    eliminationPoints,
    bonusPoints,
    penaltyPoints: player.penaltyPoints,
    totalPoints,
  };
}
