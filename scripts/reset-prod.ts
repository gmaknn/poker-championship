/**
 * SAFE PRODUCTION RESET SCRIPT
 *
 * Purges all championship data while preserving:
 * - User accounts (admin auth)
 * - Settings (global configuration)
 * - ChipSet + ChipSetDenomination (mallettes)
 * - ChipInventory (global chip inventory)
 * - TournamentTemplate (templates)
 * - ChipDenomination where isDefault=true (default config)
 *
 * SECURITY: Requires TWO environment variables to execute:
 * 1. ALLOW_PROD_RESET=YES
 * 2. PROD_RESET_TOKEN must match PROD_RESET_TOKEN_EXPECTED
 *
 * Usage (Fly.io):
 *   flyctl ssh console --app wpt-villelaure
 *   ALLOW_PROD_RESET=YES PROD_RESET_TOKEN=<token> npm run reset:prod
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// SECURITY CHECKS
// ============================================

function validateSecurityChecks(): void {
  console.log('\n========================================');
  console.log('  SAFE PRODUCTION RESET - SECURITY CHECK');
  console.log('========================================\n');

  // Check 1: ALLOW_PROD_RESET must be "YES"
  const allowReset = process.env.ALLOW_PROD_RESET;
  if (allowReset !== 'YES') {
    console.error('BLOCKED: ALLOW_PROD_RESET is not set to "YES"');
    console.error('Current value:', allowReset || '(not set)');
    console.error('\nTo enable reset, set: ALLOW_PROD_RESET=YES');
    process.exit(1);
  }
  console.log('[OK] ALLOW_PROD_RESET=YES');

  // Check 2: PROD_RESET_TOKEN must match expected
  const token = process.env.PROD_RESET_TOKEN;
  const expectedToken = process.env.PROD_RESET_TOKEN_EXPECTED;

  if (!expectedToken) {
    console.error('BLOCKED: PROD_RESET_TOKEN_EXPECTED is not configured');
    console.error('Set this secret in Fly.io: flyctl secrets set PROD_RESET_TOKEN_EXPECTED=<your-secret-token>');
    process.exit(1);
  }

  if (!token) {
    console.error('BLOCKED: PROD_RESET_TOKEN is not provided');
    console.error('Provide the token: PROD_RESET_TOKEN=<token> npm run reset:prod');
    process.exit(1);
  }

  if (token !== expectedToken) {
    console.error('BLOCKED: PROD_RESET_TOKEN does not match expected value');
    console.error('Check your token and try again');
    process.exit(1);
  }
  console.log('[OK] PROD_RESET_TOKEN validated');

  console.log('\n[SECURITY CHECKS PASSED]\n');
}

// ============================================
// PURGE FUNCTIONS
// ============================================

interface PurgeResult {
  model: string;
  count: number;
}

async function purgeChampionshipData(): Promise<PurgeResult[]> {
  const results: PurgeResult[] = [];

  console.log('========================================');
  console.log('  PURGING CHAMPIONSHIP DATA');
  console.log('========================================\n');

  // Order matters due to foreign key constraints
  // Even with onDelete: Cascade, explicit order is safer

  // 1. BustEvent (depends on TournamentPlayer)
  console.log('Purging BustEvent...');
  const bustEvents = await prisma.bustEvent.deleteMany({});
  results.push({ model: 'BustEvent', count: bustEvents.count });
  console.log(`  Deleted: ${bustEvents.count}`);

  // 2. Elimination (depends on Tournament, Player)
  console.log('Purging Elimination...');
  const eliminations = await prisma.elimination.deleteMany({});
  results.push({ model: 'Elimination', count: eliminations.count });
  console.log(`  Deleted: ${eliminations.count}`);

  // 3. TableAssignment (depends on Tournament)
  console.log('Purging TableAssignment...');
  const tableAssignments = await prisma.tableAssignment.deleteMany({});
  results.push({ model: 'TableAssignment', count: tableAssignments.count });
  console.log(`  Deleted: ${tableAssignments.count}`);

  // 4. BlindLevel (depends on Tournament)
  console.log('Purging BlindLevel...');
  const blindLevels = await prisma.blindLevel.deleteMany({});
  results.push({ model: 'BlindLevel', count: blindLevels.count });
  console.log(`  Deleted: ${blindLevels.count}`);

  // 5. TournamentChipConfig (depends on Tournament)
  console.log('Purging TournamentChipConfig...');
  const chipConfigs = await prisma.tournamentChipConfig.deleteMany({});
  results.push({ model: 'TournamentChipConfig', count: chipConfigs.count });
  console.log(`  Deleted: ${chipConfigs.count}`);

  // 6. ChipDenomination (only tournament-specific, keep isDefault=true)
  console.log('Purging ChipDenomination (tournament-specific only)...');
  const chipDenoms = await prisma.chipDenomination.deleteMany({
    where: {
      OR: [
        { tournamentId: { not: null } },
        { isDefault: false }
      ]
    }
  });
  results.push({ model: 'ChipDenomination (non-default)', count: chipDenoms.count });
  console.log(`  Deleted: ${chipDenoms.count}`);

  // 7. TournamentDirector (depends on Tournament, Player)
  console.log('Purging TournamentDirector...');
  const directors = await prisma.tournamentDirector.deleteMany({});
  results.push({ model: 'TournamentDirector', count: directors.count });
  console.log(`  Deleted: ${directors.count}`);

  // 8. TournamentPlayer (depends on Tournament, Player)
  console.log('Purging TournamentPlayer...');
  const tournamentPlayers = await prisma.tournamentPlayer.deleteMany({});
  results.push({ model: 'TournamentPlayer', count: tournamentPlayers.count });
  console.log(`  Deleted: ${tournamentPlayers.count}`);

  // 9. Tournament (depends on Season)
  console.log('Purging Tournament...');
  const tournaments = await prisma.tournament.deleteMany({});
  results.push({ model: 'Tournament', count: tournaments.count });
  console.log(`  Deleted: ${tournaments.count}`);

  // 10. Season (root)
  console.log('Purging Season...');
  const seasons = await prisma.season.deleteMany({});
  results.push({ model: 'Season', count: seasons.count });
  console.log(`  Deleted: ${seasons.count}`);

  // 11. AccountActivationToken (depends on Player)
  console.log('Purging AccountActivationToken...');
  const tokens = await prisma.accountActivationToken.deleteMany({});
  results.push({ model: 'AccountActivationToken', count: tokens.count });
  console.log(`  Deleted: ${tokens.count}`);

  // 12. PlayerRoleAssignment (depends on Player)
  console.log('Purging PlayerRoleAssignment...');
  const roleAssignments = await prisma.playerRoleAssignment.deleteMany({});
  results.push({ model: 'PlayerRoleAssignment', count: roleAssignments.count });
  console.log(`  Deleted: ${roleAssignments.count}`);

  // 13. Player (root - all players are purged)
  console.log('Purging Player...');
  const players = await prisma.player.deleteMany({});
  results.push({ model: 'Player', count: players.count });
  console.log(`  Deleted: ${players.count}`);

  return results;
}

async function verifyPreservedData(): Promise<void> {
  console.log('\n========================================');
  console.log('  VERIFYING PRESERVED DATA');
  console.log('========================================\n');

  // Users (admin auth)
  const usersCount = await prisma.user.count();
  console.log(`[KEEP] User: ${usersCount} record(s)`);

  // Settings
  const settingsCount = await prisma.settings.count();
  console.log(`[KEEP] Settings: ${settingsCount} record(s)`);

  // ChipSet (mallettes)
  const chipSetsCount = await prisma.chipSet.count();
  console.log(`[KEEP] ChipSet (mallettes): ${chipSetsCount} record(s)`);

  // ChipSetDenomination
  const chipSetDenomsCount = await prisma.chipSetDenomination.count();
  console.log(`[KEEP] ChipSetDenomination: ${chipSetDenomsCount} record(s)`);

  // ChipInventory
  const inventoryCount = await prisma.chipInventory.count();
  console.log(`[KEEP] ChipInventory: ${inventoryCount} record(s)`);

  // TournamentTemplate
  const templatesCount = await prisma.tournamentTemplate.count();
  console.log(`[KEEP] TournamentTemplate: ${templatesCount} record(s)`);

  // ChipDenomination (default only)
  const defaultDenomsCount = await prisma.chipDenomination.count({
    where: { isDefault: true }
  });
  console.log(`[KEEP] ChipDenomination (default): ${defaultDenomsCount} record(s)`);
}

async function verifyPurgedData(): Promise<void> {
  console.log('\n========================================');
  console.log('  VERIFYING PURGED DATA');
  console.log('========================================\n');

  const checks = [
    { name: 'Season', count: await prisma.season.count() },
    { name: 'Tournament', count: await prisma.tournament.count() },
    { name: 'TournamentPlayer', count: await prisma.tournamentPlayer.count() },
    { name: 'Player', count: await prisma.player.count() },
    { name: 'Elimination', count: await prisma.elimination.count() },
    { name: 'BustEvent', count: await prisma.bustEvent.count() },
    { name: 'BlindLevel', count: await prisma.blindLevel.count() },
    { name: 'TableAssignment', count: await prisma.tableAssignment.count() },
    { name: 'TournamentChipConfig', count: await prisma.tournamentChipConfig.count() },
    { name: 'TournamentDirector', count: await prisma.tournamentDirector.count() },
  ];

  let allPurged = true;
  for (const check of checks) {
    const status = check.count === 0 ? '[PURGED]' : '[WARNING]';
    if (check.count > 0) allPurged = false;
    console.log(`${status} ${check.name}: ${check.count} record(s)`);
  }

  if (allPurged) {
    console.log('\n[SUCCESS] All championship data has been purged');
  } else {
    console.log('\n[WARNING] Some data may not have been purged completely');
  }
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  try {
    // Security validation
    validateSecurityChecks();

    // Show what will be preserved BEFORE purge
    console.log('PRE-PURGE STATE:');
    await verifyPreservedData();

    // Confirm action
    console.log('\n========================================');
    console.log('  READY TO PURGE');
    console.log('========================================');
    console.log('\nThis will DELETE all:');
    console.log('  - Seasons');
    console.log('  - Tournaments');
    console.log('  - Players');
    console.log('  - Tournament registrations');
    console.log('  - Eliminations');
    console.log('  - Blind levels');
    console.log('  - Table assignments');
    console.log('  - And all related data...');
    console.log('\nPreserving:');
    console.log('  - User accounts (admin)');
    console.log('  - Settings');
    console.log('  - Chip sets (mallettes)');
    console.log('  - Tournament templates');
    console.log('  - Default chip denominations');
    console.log('\nExecuting in 3 seconds...\n');

    // 3 second delay for safety
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Execute purge
    const results = await purgeChampionshipData();

    // Summary
    console.log('\n========================================');
    console.log('  PURGE SUMMARY');
    console.log('========================================\n');

    let totalDeleted = 0;
    for (const result of results) {
      console.log(`  ${result.model}: ${result.count} deleted`);
      totalDeleted += result.count;
    }
    console.log(`\n  TOTAL: ${totalDeleted} records deleted`);

    // Verify preserved data
    await verifyPreservedData();

    // Verify purged data
    await verifyPurgedData();

    console.log('\n========================================');
    console.log('  RESET COMPLETE');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n[FATAL ERROR]', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
