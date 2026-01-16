/**
 * PRODUCTION PURGE: Seasons & Tournaments (SAFE VERSION)
 *
 * KEEPS (NEVER TOUCHED):
 * - Player, User, Settings, ChipSet, ChipInventory, TournamentTemplate
 *
 * DELETES:
 * - Season, Tournament, TournamentPlayer, Elimination, BustEvent,
 *   BlindLevel, TableAssignment, TournamentChipConfig, TournamentDirector
 *
 * SECURITY: Requires:
 * 1. FLY_APP_NAME === "wpt-villelaure"
 * 2. ALLOW_PROD_RESET === "YES"
 * 3. Token passed as CLI arg matches expected
 *
 * Usage: node purge-prod-safe.js <TOKEN>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EXPECTED_TOKEN = 'RESET_PROD_WPT_2026_!x7Kp9Qm2Vt8Rz4Lh6Nc1Df3';

async function main() {
  console.log('========================================');
  console.log('  PRODUCTION PURGE - SECURITY CHECKS');
  console.log('========================================\n');

  // Check 1: FLY_APP_NAME
  const flyAppName = process.env.FLY_APP_NAME;
  if (flyAppName !== 'wpt-villelaure') {
    console.error('BLOCKED: FLY_APP_NAME is not "wpt-villelaure"');
    console.error('Current value:', flyAppName || '(not set)');
    process.exit(1);
  }
  console.log('[OK] FLY_APP_NAME === "wpt-villelaure"');

  // Check 2: ALLOW_PROD_RESET
  const allowReset = process.env.ALLOW_PROD_RESET;
  if (allowReset !== 'YES') {
    console.error('BLOCKED: ALLOW_PROD_RESET is not "YES"');
    console.error('Current value:', allowReset || '(not set)');
    process.exit(1);
  }
  console.log('[OK] ALLOW_PROD_RESET === "YES"');

  // Check 3: Token validation
  const token = process.argv[2];
  if (!token) {
    console.error('BLOCKED: No token provided');
    console.error('Usage: node purge-prod-safe.js <TOKEN>');
    process.exit(1);
  }
  if (token !== EXPECTED_TOKEN) {
    console.error('BLOCKED: Invalid token');
    process.exit(1);
  }
  console.log('[OK] Token validated\n');

  // BEFORE counts - PRESERVE
  console.log('=== BEFORE PURGE ===\n');
  console.log('WILL PRESERVE:');
  const playersBefore = await prisma.player.count();
  const usersBefore = await prisma.user.count();
  const settingsBefore = await prisma.settings.count();
  const chipSetsBefore = await prisma.chipSet.count();
  const templatesBefore = await prisma.tournamentTemplate.count();
  const inventoryBefore = await prisma.chipInventory.count();

  console.log('  Player:', playersBefore);
  console.log('  User:', usersBefore);
  console.log('  Settings:', settingsBefore);
  console.log('  ChipSet:', chipSetsBefore);
  console.log('  ChipInventory:', inventoryBefore);
  console.log('  TournamentTemplate:', templatesBefore);

  // BEFORE counts - DELETE
  console.log('\nWILL DELETE:');
  const seasonsBefore = await prisma.season.count();
  const tournamentsBefore = await prisma.tournament.count();
  const tpBefore = await prisma.tournamentPlayer.count();
  const elimBefore = await prisma.elimination.count();
  const bustBefore = await prisma.bustEvent.count();
  const blindBefore = await prisma.blindLevel.count();

  console.log('  Season:', seasonsBefore);
  console.log('  Tournament:', tournamentsBefore);
  console.log('  TournamentPlayer:', tpBefore);
  console.log('  Elimination:', elimBefore);
  console.log('  BustEvent:', bustBefore);
  console.log('  BlindLevel:', blindBefore);

  console.log('\n========================================');
  console.log('  EXECUTING PURGE IN 3 SECONDS...');
  console.log('========================================\n');

  await new Promise(r => setTimeout(r, 3000));

  // Execute purge in transaction
  const result = await prisma.$transaction([
    prisma.bustEvent.deleteMany({}),
    prisma.elimination.deleteMany({}),
    prisma.tableAssignment.deleteMany({}),
    prisma.blindLevel.deleteMany({}),
    prisma.tournamentChipConfig.deleteMany({}),
    prisma.chipDenomination.deleteMany({ where: { tournamentId: { not: null } } }),
    prisma.tournamentDirector.deleteMany({}),
    prisma.tournamentPlayer.deleteMany({}),
    prisma.tournament.deleteMany({}),
    prisma.season.deleteMany({}),
  ]);

  const labels = [
    'BustEvent', 'Elimination', 'TableAssignment', 'BlindLevel',
    'TournamentChipConfig', 'ChipDenomination', 'TournamentDirector',
    'TournamentPlayer', 'Tournament', 'Season'
  ];

  console.log('=== DELETED ===\n');
  let total = 0;
  result.forEach((r, i) => {
    console.log('  ' + labels[i] + ':', r.count);
    total += r.count;
  });
  console.log('\n  TOTAL:', total, 'records deleted');

  // VERIFICATION
  console.log('\n=== VERIFICATION ===\n');

  const playersAfter = await prisma.player.count();
  const usersAfter = await prisma.user.count();
  const settingsAfter = await prisma.settings.count();
  const chipSetsAfter = await prisma.chipSet.count();
  const templatesAfter = await prisma.tournamentTemplate.count();
  const inventoryAfter = await prisma.chipInventory.count();

  let integrityOk = true;

  const checks = [
    { name: 'Player', before: playersBefore, after: playersAfter },
    { name: 'User', before: usersBefore, after: usersAfter },
    { name: 'Settings', before: settingsBefore, after: settingsAfter },
    { name: 'ChipSet', before: chipSetsBefore, after: chipSetsAfter },
    { name: 'ChipInventory', before: inventoryBefore, after: inventoryAfter },
    { name: 'TournamentTemplate', before: templatesBefore, after: templatesAfter },
  ];

  console.log('Preserved data:');
  for (const check of checks) {
    if (check.before !== check.after) {
      console.log('  [ERROR] ' + check.name + ':', check.before, '->', check.after, '(CHANGED!)');
      integrityOk = false;
    } else {
      console.log('  [OK] ' + check.name + ':', check.after, '(INTACT)');
    }
  }

  // Verify purge complete
  console.log('\nPurged data:');
  const seasonsAfter = await prisma.season.count();
  const tournamentsAfter = await prisma.tournament.count();

  if (seasonsAfter === 0) {
    console.log('  [OK] Season: 0 (purged)');
  } else {
    console.log('  [ERROR] Season:', seasonsAfter, '(should be 0!)');
    integrityOk = false;
  }

  if (tournamentsAfter === 0) {
    console.log('  [OK] Tournament: 0 (purged)');
  } else {
    console.log('  [ERROR] Tournament:', tournamentsAfter, '(should be 0!)');
    integrityOk = false;
  }

  if (!integrityOk) {
    console.error('\n[CRITICAL] INTEGRITY CHECK FAILED!');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('  Players / Settings / ChipSets / Templates INTACTS');
  console.log('========================================');
  console.log('\n[SUCCESS] Purge completed successfully.\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('\n[FATAL ERROR]', e);
  process.exit(1);
});
