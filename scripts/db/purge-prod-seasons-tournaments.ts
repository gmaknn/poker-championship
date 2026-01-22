/**
 * PRODUCTION PURGE: Seasons & Tournaments
 *
 * KEEPS (NEVER TOUCHED):
 * - Player
 * - User
 * - Settings
 * - ChipSet + ChipSetDenomination
 * - ChipInventory
 * - TournamentTemplate
 * - ChipDenomination (isDefault=true)
 * - AccountActivationToken
 * - PlayerRoleAssignment
 *
 * DELETES:
 * - Season
 * - Tournament
 * - TournamentPlayer
 * - Elimination
 * - BustEvent
 * - BlindLevel
 * - TableAssignment
 * - TournamentChipConfig
 * - TournamentDirector
 * - ChipDenomination (tournament-specific only)
 *
 * SECURITY: Requires THREE conditions to execute:
 * 1. FLY_APP_NAME === "wpt-villelaure"
 * 2. ALLOW_PROD_RESET === "YES"
 * 3. PROD_RESET_TOKEN === expected token (passed as CLI arg)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Expected token (NEVER log this)
const EXPECTED_TOKEN = 'RESET_PROD_WPT_2026_!x7Kp9Qm2Vt8Rz4Lh6Nc1Df3';

// ============================================
// SECURITY CHECKS
// ============================================

function validateSecurityChecks(): void {
  console.log('\n========================================');
  console.log('  PRODUCTION PURGE - SECURITY CHECKS');
  console.log('========================================\n');

  // Check 1: FLY_APP_NAME must be "wpt-villelaure"
  const flyAppName = process.env.FLY_APP_NAME;
  if (flyAppName !== 'wpt-villelaure') {
    console.error('🚫 BLOCKED: FLY_APP_NAME is not "wpt-villelaure"');
    console.error(`   Current value: ${flyAppName || '(not set)'}`);
    process.exit(1);
  }
  console.log('[OK] FLY_APP_NAME === "wpt-villelaure"');

  // Check 2: ALLOW_PROD_RESET must be "YES"
  const allowReset = process.env.ALLOW_PROD_RESET;
  if (allowReset !== 'YES') {
    console.error('🚫 BLOCKED: ALLOW_PROD_RESET is not "YES"');
    console.error(`   Current value: ${allowReset || '(not set)'}`);
    process.exit(1);
  }
  console.log('[OK] ALLOW_PROD_RESET === "YES"');

  // Check 3: Token must be provided and match
  const providedToken = process.argv[2];
  if (!providedToken) {
    console.error('🚫 BLOCKED: No token provided');
    console.error('   Usage: npx tsx scripts/db/purge-prod-seasons-tournaments.ts <TOKEN>');
    process.exit(1);
  }
  if (providedToken !== EXPECTED_TOKEN) {
    console.error('🚫 BLOCKED: Token does not match');
    process.exit(1);
  }
  console.log('[OK] Token validated');

  console.log('\n✅ ALL SECURITY CHECKS PASSED\n');
}

// ============================================
// COUNT FUNCTIONS
// ============================================

interface PreserveCounts {
  players: number;
  users: number;
  settings: number;
  chipSets: number;
  chipSetDenominations: number;
  chipInventory: number;
  tournamentTemplates: number;
  accountActivationTokens: number;
  playerRoleAssignments: number;
}

interface PurgeCounts {
  seasons: number;
  tournaments: number;
  tournamentPlayers: number;
  eliminations: number;
  bustEvents: number;
  blindLevels: number;
  tableAssignments: number;
  tournamentChipConfigs: number;
  tournamentDirectors: number;
  chipDenominationsTournament: number;
}

async function getPreserveCounts(): Promise<PreserveCounts> {
  return {
    players: await prisma.player.count(),
    users: await prisma.user.count(),
    settings: await prisma.settings.count(),
    chipSets: await prisma.chipSet.count(),
    chipSetDenominations: await prisma.chipSetDenomination.count(),
    chipInventory: await prisma.chipInventory.count(),
    tournamentTemplates: await prisma.tournamentTemplate.count(),
    accountActivationTokens: await prisma.accountActivationToken.count(),
    playerRoleAssignments: await prisma.playerRoleAssignment.count(),
  };
}

async function getPurgeCounts(): Promise<PurgeCounts> {
  return {
    seasons: await prisma.season.count(),
    tournaments: await prisma.tournament.count(),
    tournamentPlayers: await prisma.tournamentPlayer.count(),
    eliminations: await prisma.elimination.count(),
    bustEvents: await prisma.bustEvent.count(),
    blindLevels: await prisma.blindLevel.count(),
    tableAssignments: await prisma.tableAssignment.count(),
    tournamentChipConfigs: await prisma.tournamentChipConfig.count(),
    tournamentDirectors: await prisma.tournamentDirector.count(),
    chipDenominationsTournament: await prisma.chipDenomination.count({
      where: { tournamentId: { not: null } }
    }),
  };
}

function logPreserveCounts(counts: PreserveCounts, label: string): void {
  console.log(`\n${label}:`);
  console.log(`   [KEEP] Player: ${counts.players}`);
  console.log(`   [KEEP] User: ${counts.users}`);
  console.log(`   [KEEP] Settings: ${counts.settings}`);
  console.log(`   [KEEP] ChipSet: ${counts.chipSets}`);
  console.log(`   [KEEP] ChipSetDenomination: ${counts.chipSetDenominations}`);
  console.log(`   [KEEP] ChipInventory: ${counts.chipInventory}`);
  console.log(`   [KEEP] TournamentTemplate: ${counts.tournamentTemplates}`);
  console.log(`   [KEEP] AccountActivationToken: ${counts.accountActivationTokens}`);
  console.log(`   [KEEP] PlayerRoleAssignment: ${counts.playerRoleAssignments}`);
}

function logPurgeCounts(counts: PurgeCounts, label: string): void {
  console.log(`\n${label}:`);
  console.log(`   [PURGE] Season: ${counts.seasons}`);
  console.log(`   [PURGE] Tournament: ${counts.tournaments}`);
  console.log(`   [PURGE] TournamentPlayer: ${counts.tournamentPlayers}`);
  console.log(`   [PURGE] Elimination: ${counts.eliminations}`);
  console.log(`   [PURGE] BustEvent: ${counts.bustEvents}`);
  console.log(`   [PURGE] BlindLevel: ${counts.blindLevels}`);
  console.log(`   [PURGE] TableAssignment: ${counts.tableAssignments}`);
  console.log(`   [PURGE] TournamentChipConfig: ${counts.tournamentChipConfigs}`);
  console.log(`   [PURGE] TournamentDirector: ${counts.tournamentDirectors}`);
  console.log(`   [PURGE] ChipDenomination (tournament): ${counts.chipDenominationsTournament}`);
}

// ============================================
// PURGE FUNCTION
// ============================================

async function purgeSeasonsTournaments(): Promise<void> {
  console.log('========================================');
  console.log('  EXECUTING PURGE');
  console.log('========================================\n');

  console.log('Deleting in FK dependency order (children first)...\n');

  // Delete in FK dependency order (children first)
  const result = await prisma.$transaction([
    // 1. BustEvent (depends on TournamentPlayer, Tournament)
    prisma.bustEvent.deleteMany({}),

    // 2. Elimination (depends on Tournament, Player)
    prisma.elimination.deleteMany({}),

    // 3. TableAssignment (depends on Tournament)
    prisma.tableAssignment.deleteMany({}),

    // 4. BlindLevel (depends on Tournament)
    prisma.blindLevel.deleteMany({}),

    // 5. TournamentChipConfig (depends on Tournament)
    prisma.tournamentChipConfig.deleteMany({}),

    // 6. ChipDenomination (depends on Tournament - only tournament-specific ones)
    prisma.chipDenomination.deleteMany({ where: { tournamentId: { not: null } } }),

    // 7. TournamentDirector (depends on Tournament, Player)
    prisma.tournamentDirector.deleteMany({}),

    // 8. TournamentPlayer (depends on Tournament, Player)
    prisma.tournamentPlayer.deleteMany({}),

    // 9. Tournament (depends on Season, Player)
    prisma.tournament.deleteMany({}),

    // 10. Season (root)
    prisma.season.deleteMany({}),
  ]);

  const [
    bustEvents,
    eliminations,
    tableAssignments,
    blindLevels,
    chipConfigs,
    chipDenominations,
    tournamentDirectors,
    tournamentPlayers,
    tournaments,
    seasons,
  ] = result;

  console.log('✅ DELETED:');
  console.log(`   - BustEvent: ${bustEvents.count}`);
  console.log(`   - Elimination: ${eliminations.count}`);
  console.log(`   - TableAssignment: ${tableAssignments.count}`);
  console.log(`   - BlindLevel: ${blindLevels.count}`);
  console.log(`   - TournamentChipConfig: ${chipConfigs.count}`);
  console.log(`   - ChipDenomination (tournament): ${chipDenominations.count}`);
  console.log(`   - TournamentDirector: ${tournamentDirectors.count}`);
  console.log(`   - TournamentPlayer: ${tournamentPlayers.count}`);
  console.log(`   - Tournament: ${tournaments.count}`);
  console.log(`   - Season: ${seasons.count}`);

  const totalDeleted = bustEvents.count + eliminations.count + tableAssignments.count +
    blindLevels.count + chipConfigs.count + chipDenominations.count +
    tournamentDirectors.count + tournamentPlayers.count + tournaments.count + seasons.count;

  console.log(`\n   TOTAL: ${totalDeleted} records deleted`);
}

// ============================================
// VERIFICATION
// ============================================

async function verifyIntegrity(beforeCounts: PreserveCounts): Promise<void> {
  console.log('\n========================================');
  console.log('  INTEGRITY VERIFICATION');
  console.log('========================================');

  const afterCounts = await getPreserveCounts();

  let integrityOk = true;

  // Verify each preserved model
  const checks = [
    { name: 'Player', before: beforeCounts.players, after: afterCounts.players },
    { name: 'User', before: beforeCounts.users, after: afterCounts.users },
    { name: 'Settings', before: beforeCounts.settings, after: afterCounts.settings },
    { name: 'ChipSet', before: beforeCounts.chipSets, after: afterCounts.chipSets },
    { name: 'ChipSetDenomination', before: beforeCounts.chipSetDenominations, after: afterCounts.chipSetDenominations },
    { name: 'ChipInventory', before: beforeCounts.chipInventory, after: afterCounts.chipInventory },
    { name: 'TournamentTemplate', before: beforeCounts.tournamentTemplates, after: afterCounts.tournamentTemplates },
    { name: 'AccountActivationToken', before: beforeCounts.accountActivationTokens, after: afterCounts.accountActivationTokens },
    { name: 'PlayerRoleAssignment', before: beforeCounts.playerRoleAssignments, after: afterCounts.playerRoleAssignments },
  ];

  console.log('\nPreserved data check:');
  for (const check of checks) {
    if (check.before !== check.after) {
      console.log(`   ❌ ${check.name}: ${check.before} -> ${check.after} (CHANGED!)`);
      integrityOk = false;
    } else {
      console.log(`   ✅ ${check.name}: ${check.after} (unchanged)`);
    }
  }

  // Verify purged data is zero
  const purgeCounts = await getPurgeCounts();
  const purgeChecks = [
    { name: 'Season', count: purgeCounts.seasons },
    { name: 'Tournament', count: purgeCounts.tournaments },
    { name: 'TournamentPlayer', count: purgeCounts.tournamentPlayers },
    { name: 'Elimination', count: purgeCounts.eliminations },
    { name: 'BustEvent', count: purgeCounts.bustEvents },
  ];

  console.log('\nPurged data check:');
  for (const check of purgeChecks) {
    if (check.count !== 0) {
      console.log(`   ❌ ${check.name}: ${check.count} remaining (SHOULD BE 0!)`);
      integrityOk = false;
    } else {
      console.log(`   ✅ ${check.name}: 0 (purged)`);
    }
  }

  if (!integrityOk) {
    console.error('\n❌ INTEGRITY CHECK FAILED');
    process.exit(1);
  }

  console.log('\n✅ INTEGRITY CHECK PASSED');
  console.log('\n========================================');
  console.log('  Players / Settings / ChipSets / Templates INTACTS');
  console.log('========================================\n');
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  try {
    // Security validation
    validateSecurityChecks();

    // Get counts BEFORE purge
    const preserveCountsBefore = await getPreserveCounts();
    const purgeCountsBefore = await getPurgeCounts();

    logPreserveCounts(preserveCountsBefore, '📊 BEFORE PURGE - Data to PRESERVE');
    logPurgeCounts(purgeCountsBefore, '📊 BEFORE PURGE - Data to DELETE');

    // Confirm what will happen
    console.log('\n========================================');
    console.log('  PURGE PLAN');
    console.log('========================================');
    console.log('\n❌ WILL DELETE:');
    console.log('   - Season');
    console.log('   - Tournament');
    console.log('   - TournamentPlayer');
    console.log('   - Elimination');
    console.log('   - BustEvent');
    console.log('   - BlindLevel');
    console.log('   - TableAssignment');
    console.log('   - TournamentChipConfig');
    console.log('   - TournamentDirector');
    console.log('   - ChipDenomination (tournament-specific)');
    console.log('\n✅ WILL PRESERVE:');
    console.log('   - Player');
    console.log('   - User');
    console.log('   - Settings');
    console.log('   - ChipSet');
    console.log('   - ChipInventory');
    console.log('   - TournamentTemplate');

    console.log('\n⏳ Executing in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Execute purge
    await purgeSeasonsTournaments();

    // Verify integrity
    await verifyIntegrity(preserveCountsBefore);

    console.log('========================================');
    console.log('  PURGE COMPLETE');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
