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
 * Logic (CUMULATIVE - Règle WPT Villelaure):
 * - Light rebuy compte comme 0.5 recave équivalente
 * - 1 recave gratuite (freeRebuysCount configurable dans la saison)
 * - Chaque recave payante au-delà de la gratuite : -50 pts
 *
 * Formule:
 * recavesEquivalentes = rebuysCount + (lightRebuyUsed ? 0.5 : 0)
 * recavesPayantes = max(0, recavesEquivalentes - freeRebuysCount)
 * penaltyPoints = round(recavesPayantes * -50)
 *
 * Exemple: Bruno avec 4 rebuys + 1 light (freeRebuysCount=1):
 * - Recaves équivalentes: 4 + 0.5 = 4.5
 * - Recaves payantes: max(0, 4.5 - 1) = 3.5
 * - Malus: round(3.5 × -50) = -175 pts
 *
 * @param totalRebuys - Total number of standard rebuys
 * @param rules - The season's rebuy penalty rules
 * @param lightRebuyUsed - Whether a light rebuy was used
 * @returns The penalty points (negative number or 0)
 */
export function computeRecavePenalty(
  totalRebuys: number,
  rules: RecavePenaltyRules,
  lightRebuyUsed: boolean = false
): number {
  // Light rebuy compte comme 0.5 recave équivalente
  const recavesEquivalentes = totalRebuys + (lightRebuyUsed ? 0.5 : 0);

  // Nombre de recaves payantes (au-delà des gratuites)
  const recavesPayantes = Math.max(0, recavesEquivalentes - rules.freeRebuysCount);

  // Si pas de recaves payantes, retourner 0 (évite -0)
  if (recavesPayantes === 0) {
    return 0;
  }

  // Malus par recave payante (utiliser le tier1 comme malus unitaire, ou -50 par défaut)
  const penaltyPerUnit = rules.tiers.length > 0 ? Math.abs(rules.tiers[0].penaltyPoints) : 50;

  // Total: arrondi pour éviter les problèmes de virgule flottante
  return Math.round(recavesPayantes * -penaltyPerUnit);
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
