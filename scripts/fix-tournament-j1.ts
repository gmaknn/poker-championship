/**
 * Fix Tournament J1 - 16/01/2026
 *
 * CORRECTIONS A EFFECTUER:
 * 1. NicoFO (Nicolas FORTIN):
 *    - Supprimer le light rebuy (lightRebuyUsed = false)
 *    - 3 recaves standard + 1 rebuy volontaire = rebuysCount = 4
 *    - Score attendu: 350 pts
 *
 * 2. Grégory MAQUENHEN:
 *    - Supprimer le light rebuy fictif (lightRebuyUsed = false)
 *    - 2 recaves standard uniquement (rebuysCount = 2)
 *    - Score attendu: 875 pts
 *
 * 3. Recalculer les points de TOUS les joueurs selon les règles:
 *    - Bonus élim bust: 25 pts (pendant recaves)
 *    - Bonus élim finale: 50 pts (après recaves)
 *    - Light rebuy = 0.5 recave pour le malus
 *    - 1 recave gratuite
 *
 * SCORES ATTENDUS (référence):
 * 1. Christian PAUL : 1625
 * 2. Rémi BALAI : 1125
 * 3. Grégory MAQUENHEN : 875
 * 4. Karine VERRET : 575
 * 5. Nicolas FORTIN : 350
 * 6. Nicolas BEAUSSET : 300
 * 7. Christophe MATHIEU : 300
 * 8. Sylvain JOUQUES : 275
 * 9. Bruno PARACHOU : 230
 * 10. Mickaël MIKA : 210
 * 11. Pascal PROST : 190
 * 12. Téo ROCHE : 170
 * 13. Vincent TIERCELIN : 90
 * 14. Benjamin BENJI : 75
 * 15. Georges MANICKAROS : 30
 * 16. Nicolas JOUQUES : -30
 *
 * USAGE:
 *   npx tsx scripts/fix-tournament-j1.ts [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 */

import { PrismaClient } from '@prisma/client';
import {
  parseRecavePenaltyRules,
  computeRecavePenalty,
  RecavePenaltyRules,
} from '../src/lib/scoring';

const prisma = new PrismaClient();

// Scores attendus pour validation
const EXPECTED_SCORES: Record<string, number> = {
  'Christian PAUL': 1625,
  'Rémi BALAI': 1125,
  'Grégory MAQUENHEN': 875,
  'Karine VERRET': 575,
  'Nicolas FORTIN': 350,
  'Nicolas BEAUSSET': 300,
  'Christophe MATHIEU': 300,
  'Sylvain JOUQUES': 275,
  'Bruno PARACHOU': 230,
  'Mickaël MIKA': 210,
  'Pascal PROST': 190,
  'Téo ROCHE': 170,
  'Vincent TIERCELIN': 90,
  'Benjamin BENJI': 75,
  'Georges MANICKAROS': 30,
  'Nicolas JOUQUES': -30,
};

// Corrections spécifiques à appliquer AVANT le recalcul
interface SpecificCorrection {
  firstName: string;
  lastName: string;
  newRebuysCount: number;
  newLightRebuyUsed: boolean;
}

const SPECIFIC_CORRECTIONS: SpecificCorrection[] = [
  {
    firstName: 'Nicolas',
    lastName: 'FORTIN',
    newRebuysCount: 4, // 3 recaves standard + 1 rebuy volontaire
    newLightRebuyUsed: false,
  },
  {
    firstName: 'Grégory',
    lastName: 'MAQUENHEN',
    newRebuysCount: 2, // 2 recaves standard uniquement
    newLightRebuyUsed: false,
  },
];

// Types
interface TournamentPlayer {
  id: string;
  playerId: string;
  rebuysCount: number;
  lightRebuyUsed: boolean;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  eliminationsCount: number;
  bustEliminations: number;
  leaderKills: number;
  finalRank: number | null;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
  };
}

interface PlayerDiff {
  playerName: string;
  finalRank: number | null;
  before: {
    rebuysCount: number;
    lightRebuyUsed: boolean;
    rankPoints: number;
    eliminationPoints: number;
    bonusPoints: number;
    penaltyPoints: number;
    totalPoints: number;
  };
  after: {
    rebuysCount: number;
    lightRebuyUsed: boolean;
    rankPoints: number;
    eliminationPoints: number;
    bonusPoints: number;
    penaltyPoints: number;
    totalPoints: number;
  };
  expectedScore: number | null;
  isCorrect: boolean;
}

// Type for detailed points configuration
interface DetailedPointsConfig {
  type: 'DETAILED';
  byRank: Record<string, number>;
  rank19Plus: number;
}

// ========================================
// SAFETY CHECKS
// ========================================

function validateEnvironment(): void {
  const nodeEnv = process.env.NODE_ENV;
  const dbUrl = process.env.DATABASE_URL || '';

  console.log('\n--- Environment Validation ---');
  console.log(`NODE_ENV: ${nodeEnv}`);
  console.log(`DATABASE_URL: ${dbUrl.substring(0, 30)}...`);

  // Block production execution
  if (nodeEnv === 'production') {
    console.error('\n❌ BLOCKED: Cannot run in production environment');
    process.exit(1);
  }

  console.log('✅ Environment check passed\n');
}

// ========================================
// FIND TOURNAMENT
// ========================================

async function findTournamentJ1() {
  const startDate = new Date('2026-01-16T00:00:00Z');
  const endDate = new Date('2026-01-17T00:00:00Z');

  console.log(`Searching for tournament between ${startDate.toISOString()} and ${endDate.toISOString()}...`);

  const tournament = await prisma.tournament.findFirst({
    where: {
      date: {
        gte: startDate,
        lt: endDate,
      },
    },
    include: {
      season: true,
      tournamentPlayers: {
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
        },
      },
    },
  });

  if (!tournament) {
    throw new Error('❌ Tournament du 16/01/2026 introuvable.');
  }

  if (!tournament.season) {
    throw new Error('❌ Le tournoi n\'a pas de saison associée.');
  }

  console.log(`✅ Tournoi trouvé: ${tournament.name || 'J1'}`);
  console.log(`   ID: ${tournament.id}`);
  console.log(`   Date: ${tournament.date}`);
  console.log(`   Status: ${tournament.status}`);
  console.log(`   Saison: ${tournament.season.name}`);
  console.log(`   Joueurs: ${tournament.tournamentPlayers.length}`);

  return tournament;
}

// ========================================
// GET RANK POINTS
// ========================================

function getRankPointsForPosition(
  rank: number,
  season: {
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
  }
): number {
  const config = season.detailedPointsConfig as DetailedPointsConfig | null;
  if (config && config.type === 'DETAILED' && config.byRank) {
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) {
      return pointsForRank;
    }
    return config.rank19Plus ?? 0;
  }

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

  if (legacyPointsMap[rank] !== undefined) {
    return legacyPointsMap[rank];
  }

  if (rank >= 11 && rank <= 15) {
    return season.pointsEleventh;
  }

  return season.pointsSixteenth;
}

// ========================================
// CALCULATE ALL PLAYERS
// ========================================

function calculateAllPlayers(
  tournament: Awaited<ReturnType<typeof findTournamentJ1>>
): PlayerDiff[] {
  const players = tournament.tournamentPlayers as TournamentPlayer[];
  const season = tournament.season!;
  const rules = parseRecavePenaltyRules(season);

  console.log('\n--- Règles de la saison ---');
  console.log(`   Recaves gratuites: ${rules.freeRebuysCount}`);
  console.log(`   Tiers: ${JSON.stringify(rules.tiers)}`);
  console.log(`   Bonus élim finale: ${season.eliminationPoints} pts`);
  console.log(`   Bonus élim bust: ${season.bustEliminationBonus} pts`);
  console.log(`   Bonus leader kill: ${season.leaderKillerBonus} pts`);

  const diffs: PlayerDiff[] = [];

  for (const tp of players) {
    const playerFullName = `${tp.player.firstName} ${tp.player.lastName}`;

    // Valeurs avant correction
    const before = {
      rebuysCount: tp.rebuysCount,
      lightRebuyUsed: tp.lightRebuyUsed,
      rankPoints: tp.rankPoints,
      eliminationPoints: tp.eliminationPoints,
      bonusPoints: tp.bonusPoints,
      penaltyPoints: tp.penaltyPoints,
      totalPoints: tp.totalPoints,
    };

    // Chercher si ce joueur a une correction spécifique
    const specificCorrection = SPECIFIC_CORRECTIONS.find(
      (c) =>
        c.firstName.toLowerCase() === tp.player.firstName.toLowerCase() &&
        c.lastName.toLowerCase() === tp.player.lastName.toLowerCase()
    );

    // Nouvelles valeurs de rebuys
    let newRebuysCount = tp.rebuysCount;
    let newLightRebuyUsed = tp.lightRebuyUsed;

    if (specificCorrection) {
      newRebuysCount = specificCorrection.newRebuysCount;
      newLightRebuyUsed = specificCorrection.newLightRebuyUsed;
    }

    // Calculer les nouveaux points
    const newRankPoints = tp.finalRank !== null
      ? getRankPointsForPosition(tp.finalRank, season)
      : 0;

    // Points d'élimination:
    // - éliminations finales (après recaves) = eliminationPoints (50 pts)
    // - éliminations bust (pendant recaves) = bustEliminationBonus (25 pts)
    const finalElimPoints = tp.eliminationsCount * season.eliminationPoints;
    const bustElimPoints = tp.bustEliminations * season.bustEliminationBonus;
    const newEliminationPoints = finalElimPoints + bustElimPoints;

    // Bonus leader kill
    const newBonusPoints = tp.leaderKills * season.leaderKillerBonus;

    // Malus recaves
    const newPenaltyPoints = computeRecavePenalty(newRebuysCount, rules, newLightRebuyUsed);

    // Total
    const newTotalPoints = newRankPoints + newEliminationPoints + newBonusPoints + newPenaltyPoints;

    // Score attendu
    const expectedScore = EXPECTED_SCORES[playerFullName] ?? null;
    const isCorrect = expectedScore === null || newTotalPoints === expectedScore;

    diffs.push({
      playerName: playerFullName,
      finalRank: tp.finalRank,
      before,
      after: {
        rebuysCount: newRebuysCount,
        lightRebuyUsed: newLightRebuyUsed,
        rankPoints: newRankPoints,
        eliminationPoints: newEliminationPoints,
        bonusPoints: newBonusPoints,
        penaltyPoints: newPenaltyPoints,
        totalPoints: newTotalPoints,
      },
      expectedScore,
      isCorrect,
    });
  }

  // Trier par rang final
  diffs.sort((a, b) => {
    if (a.finalRank === null) return 1;
    if (b.finalRank === null) return -1;
    return a.finalRank - b.finalRank;
  });

  return diffs;
}

// ========================================
// DISPLAY DIFF
// ========================================

function displayDiff(diffs: PlayerDiff[]): void {
  console.log('\n========================================');
  console.log('  DIFF AVANT/APRES POUR CHAQUE JOUEUR');
  console.log('========================================\n');

  for (const diff of diffs) {
    const hasChanges =
      diff.before.rebuysCount !== diff.after.rebuysCount ||
      diff.before.lightRebuyUsed !== diff.after.lightRebuyUsed ||
      diff.before.rankPoints !== diff.after.rankPoints ||
      diff.before.eliminationPoints !== diff.after.eliminationPoints ||
      diff.before.bonusPoints !== diff.after.bonusPoints ||
      diff.before.penaltyPoints !== diff.after.penaltyPoints ||
      diff.before.totalPoints !== diff.after.totalPoints;

    const statusIcon = !diff.isCorrect ? '❌' : hasChanges ? '📝' : '✅';
    const rankStr = diff.finalRank !== null ? `#${diff.finalRank}` : '-';

    console.log(`${statusIcon} ${rankStr.padEnd(4)} ${diff.playerName}`);

    if (hasChanges || !diff.isCorrect) {
      if (diff.before.rebuysCount !== diff.after.rebuysCount) {
        console.log(`     rebuysCount: ${diff.before.rebuysCount} -> ${diff.after.rebuysCount}`);
      }
      if (diff.before.lightRebuyUsed !== diff.after.lightRebuyUsed) {
        console.log(`     lightRebuyUsed: ${diff.before.lightRebuyUsed} -> ${diff.after.lightRebuyUsed}`);
      }
      if (diff.before.rankPoints !== diff.after.rankPoints) {
        console.log(`     rankPoints: ${diff.before.rankPoints} -> ${diff.after.rankPoints}`);
      }
      if (diff.before.eliminationPoints !== diff.after.eliminationPoints) {
        console.log(`     eliminationPoints: ${diff.before.eliminationPoints} -> ${diff.after.eliminationPoints}`);
      }
      if (diff.before.bonusPoints !== diff.after.bonusPoints) {
        console.log(`     bonusPoints: ${diff.before.bonusPoints} -> ${diff.after.bonusPoints}`);
      }
      if (diff.before.penaltyPoints !== diff.after.penaltyPoints) {
        console.log(`     penaltyPoints: ${diff.before.penaltyPoints} -> ${diff.after.penaltyPoints}`);
      }
      if (diff.before.totalPoints !== diff.after.totalPoints) {
        console.log(`     totalPoints: ${diff.before.totalPoints} -> ${diff.after.totalPoints}`);
      }

      if (diff.expectedScore !== null) {
        const matchStr = diff.isCorrect ? '✓' : `ATTENDU: ${diff.expectedScore}`;
        console.log(`     Score calculé: ${diff.after.totalPoints} ${matchStr}`);
      }
    }
    console.log('');
  }

  // Résumé des erreurs
  const errors = diffs.filter((d) => !d.isCorrect);
  if (errors.length > 0) {
    console.log('\n⚠️  ERREURS DE CALCUL:');
    for (const err of errors) {
      console.log(`   - ${err.playerName}: calculé=${err.after.totalPoints}, attendu=${err.expectedScore}`);
    }
  } else {
    console.log('\n✅ Tous les scores correspondent aux valeurs attendues!');
  }
}

// ========================================
// APPLY CORRECTIONS
// ========================================

async function applyCorrections(
  tournamentId: string,
  diffs: PlayerDiff[],
  players: TournamentPlayer[],
  isDryRun: boolean
): Promise<void> {
  if (isDryRun) {
    console.log('\n--- DRY RUN MODE ---');
    console.log('Aucune modification appliquée (--dry-run actif)\n');
    return;
  }

  console.log('\n--- Application des corrections ---');

  await prisma.$transaction(async (tx) => {
    for (const diff of diffs) {
      const tp = players.find(
        (p) => `${p.player.firstName} ${p.player.lastName}` === diff.playerName
      );

      if (!tp) continue;

      await tx.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: tp.playerId,
          },
        },
        data: {
          rebuysCount: diff.after.rebuysCount,
          lightRebuyUsed: diff.after.lightRebuyUsed,
          rankPoints: diff.after.rankPoints,
          eliminationPoints: diff.after.eliminationPoints,
          bonusPoints: diff.after.bonusPoints,
          penaltyPoints: diff.after.penaltyPoints,
          totalPoints: diff.after.totalPoints,
        },
      });

      console.log(`✅ Mis à jour: ${diff.playerName}`);
    }
  });

  console.log('\n✅ Toutes les corrections ont été appliquées avec succès');
}

// ========================================
// DISPLAY FINAL STANDINGS
// ========================================

async function displayFinalStandings(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentPlayers: {
        include: {
          player: {
            select: {
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
        },
        orderBy: [{ finalRank: 'asc' }],
      },
    },
  });

  if (!tournament) return;

  console.log('\n========================================');
  console.log('  CLASSEMENT FINAL APRES CORRECTION');
  console.log('========================================\n');

  console.log(
    '#'.padEnd(4) +
      'Joueur'.padEnd(25) +
      'Rank'.padEnd(8) +
      'Elim'.padEnd(8) +
      'Bonus'.padEnd(8) +
      'Malus'.padEnd(8) +
      'TOTAL'.padEnd(8) +
      'Attendu'.padEnd(8)
  );
  console.log('-'.repeat(85));

  for (const tp of tournament.tournamentPlayers) {
    const rank = tp.finalRank?.toString() || '-';
    const name = `${tp.player.firstName} ${tp.player.lastName}`;
    const expectedScore = EXPECTED_SCORES[name];
    const expectedStr = expectedScore !== undefined ? expectedScore.toString() : '-';
    const match = expectedScore !== undefined && tp.totalPoints === expectedScore ? '✓' : '❌';

    console.log(
      rank.padEnd(4) +
        name.substring(0, 23).padEnd(25) +
        tp.rankPoints.toString().padEnd(8) +
        tp.eliminationPoints.toString().padEnd(8) +
        tp.bonusPoints.toString().padEnd(8) +
        tp.penaltyPoints.toString().padEnd(8) +
        tp.totalPoints.toString().padEnd(8) +
        `${expectedStr} ${match}`
    );
  }
}

// ========================================
// MAIN
// ========================================

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');

  try {
    console.log('\n========================================');
    console.log('  FIX TOURNAMENT J1 - 16/01/2026');
    console.log('========================================');

    if (isDryRun) {
      console.log('\n⚠️  MODE DRY-RUN: Aucune modification ne sera appliquée');
    }

    // 1. Validation de l'environnement
    validateEnvironment();

    // 2. Trouver le tournoi
    const tournament = await findTournamentJ1();

    // 3. Calculer les corrections pour TOUS les joueurs
    const diffs = calculateAllPlayers(tournament);

    // 4. Afficher le diff avant/après
    displayDiff(diffs);

    // 5. Appliquer les corrections
    await applyCorrections(
      tournament.id,
      diffs,
      tournament.tournamentPlayers as TournamentPlayer[],
      isDryRun
    );

    // 6. Afficher le classement final
    if (!isDryRun) {
      await displayFinalStandings(tournament.id);
    }

    console.log('\n========================================');
    console.log('  ✅ SCRIPT TERMINE');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n❌ ERREUR FATALE:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
