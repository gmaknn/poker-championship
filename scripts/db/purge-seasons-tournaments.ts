/**
 * Purge all seasons and tournaments from the local database
 * KEEPS: Players, Users, ChipSets, Templates, Settings
 *
 * SAFETY: Will NOT run in production or against remote databases
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Safety check: block execution if not a local database
 */
function assertLocalDb(): void {
  const nodeEnv = process.env.NODE_ENV;
  const dbUrl = process.env.DATABASE_URL || '';

  // Block if NODE_ENV is production
  if (nodeEnv === 'production') {
    throw new Error(
      '🚫 BLOCKED: NODE_ENV is "production". This script cannot run in production.'
    );
  }

  // Check DATABASE_URL for local patterns
  const isLocalSqlite = dbUrl.startsWith('file:');
  const isLocalPostgres =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('@db:') || // Docker compose
    dbUrl.includes('@postgres:'); // Docker compose

  if (!isLocalSqlite && !isLocalPostgres) {
    throw new Error(
      `🚫 BLOCKED: DATABASE_URL does not look like a local database.\n` +
      `URL: ${dbUrl.substring(0, 50)}...\n` +
      `Expected: file:* (SQLite) or *localhost* / *127.0.0.1* (Postgres)`
    );
  }

  console.log('✅ Local database check passed');
  console.log(`   NODE_ENV: ${nodeEnv || '(not set)'}`);
  console.log(`   DATABASE_URL: ${dbUrl.substring(0, 40)}...`);
}

async function purgeSeasonsTournaments(): Promise<void> {
  console.log('\n🗑️  PURGE: Seasons & Tournaments (keeping players)\n');

  // Safety first
  assertLocalDb();

  console.log('\n📊 Before purge:');
  const beforeCounts = await getCounts();
  logCounts(beforeCounts);

  console.log('\n🔄 Deleting in correct FK order...\n');

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

  console.log('✅ Deleted:');
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

  console.log('\n📊 After purge:');
  const afterCounts = await getCounts();
  logCounts(afterCounts);

  console.log('\n✅ Purge complete! Players preserved.');
}

async function getCounts() {
  return {
    players: await prisma.player.count(),
    users: await prisma.user.count(),
    seasons: await prisma.season.count(),
    tournaments: await prisma.tournament.count(),
    tournamentPlayers: await prisma.tournamentPlayer.count(),
    eliminations: await prisma.elimination.count(),
  };
}

function logCounts(counts: Awaited<ReturnType<typeof getCounts>>) {
  console.log(`   Players: ${counts.players}`);
  console.log(`   Users: ${counts.users}`);
  console.log(`   Seasons: ${counts.seasons}`);
  console.log(`   Tournaments: ${counts.tournaments}`);
  console.log(`   TournamentPlayers: ${counts.tournamentPlayers}`);
  console.log(`   Eliminations: ${counts.eliminations}`);
}

// Main
purgeSeasonsTournaments()
  .catch((e) => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
