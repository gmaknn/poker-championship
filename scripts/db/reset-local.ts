/**
 * Reset local database and seed 10 test players
 *
 * Flow:
 * 1. Safety check (assertLocalDb)
 * 2. Drop all tables (raw SQL for SQLite)
 * 3. Run prisma migrate deploy
 * 4. Seed 10 players
 *
 * SAFETY: Will NOT run in production or against remote databases
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

/**
 * Safety check: block execution if not a local database
 */
function assertLocalDb(): void {
  const nodeEnv = process.env.NODE_ENV;
  const dbUrl = process.env.DATABASE_URL || '';

  console.log('\n🔒 Safety check...');
  console.log(`   NODE_ENV: ${nodeEnv || '(not set)'}`);
  console.log(`   DATABASE_URL: ${dbUrl.substring(0, 50)}${dbUrl.length > 50 ? '...' : ''}`);

  // Block if NODE_ENV is production
  if (nodeEnv === 'production') {
    console.error('\n🚫 BLOCKED: NODE_ENV is "production"');
    console.error('   This script cannot run in production environments.');
    process.exit(1);
  }

  // Check DATABASE_URL for local patterns
  const isLocalSqlite = dbUrl.startsWith('file:');
  const isLocalPostgres =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbUrl.includes('@db:') || // Docker compose
    dbUrl.includes('@postgres:'); // Docker compose

  if (!isLocalSqlite && !isLocalPostgres) {
    console.error('\n🚫 BLOCKED: DATABASE_URL does not look like a local database');
    console.error(`   URL pattern: ${dbUrl.substring(0, 30)}...`);
    console.error('   Expected: file:* (SQLite) or contains localhost/127.0.0.1');
    process.exit(1);
  }

  console.log('   ✅ Local database confirmed\n');
}

/**
 * Drop all tables in SQLite database
 */
async function dropAllTables(): Promise<void> {
  console.log('🗑️  Dropping all tables...');

  // Get list of all tables
  const tables = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'
  `;

  // Disable foreign key checks, drop tables, re-enable
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');

  for (const table of tables) {
    console.log(`   Dropping: ${table.name}`);
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.name}"`);
  }

  // Also drop migrations table to force re-run
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "_prisma_migrations"');

  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');

  console.log(`   ✅ Dropped ${tables.length} tables + migrations\n`);
}

/**
 * Run prisma migrate deploy
 */
function runMigrations(): void {
  console.log('🔄 Running prisma migrate deploy...');
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('   ✅ Migrations applied\n');
  } catch (error) {
    console.error('   ❌ Migration failed');
    process.exit(1);
  }
}

/**
 * Seed 10 test players
 */
function seedPlayers(): void {
  console.log('🌱 Seeding 10 test players...');
  try {
    execSync('npm run db:seed:players', {
      stdio: 'inherit',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('   ❌ Seed failed');
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log('\n🔄 DB RESET LOCAL\n');
  console.log('=====================================');

  // Step 1: Safety check
  assertLocalDb();

  // Step 2: Drop all tables
  await dropAllTables();

  // Disconnect before running CLI commands
  await prisma.$disconnect();

  // Step 3: Run migrations
  runMigrations();

  // Step 4: Seed players
  seedPlayers();

  console.log('\n=====================================');
  console.log('✅ Reset complete! Database has 10 test players.\n');
}

main().catch((e) => {
  console.error('\n❌ Error:', e.message);
  process.exit(1);
});
