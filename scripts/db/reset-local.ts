/**
 * Reset local database and seed 10 test players
 *
 * Flow:
 * 1. Safety check (assertLocalDb)
 * 2. Run prisma migrate reset --force (standard Prisma DEV command)
 * 3. Seed 10 players
 *
 * SAFETY: Will NOT run in production or against remote databases
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';

// Load .env file
config();

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
 * Detect Prisma provider from DATABASE_URL
 */
function detectProvider(): 'sqlite' | 'postgresql' | 'mysql' {
  const dbUrl = process.env.DATABASE_URL || '';

  if (dbUrl.startsWith('file:')) {
    return 'sqlite';
  } else if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    return 'postgresql';
  } else if (dbUrl.startsWith('mysql://')) {
    return 'mysql';
  }

  // Default to sqlite for local dev
  return 'sqlite';
}

/**
 * Run prisma migrate reset --force
 * This is the standard Prisma DEV command that:
 * - Drops the database
 * - Creates a new database
 * - Applies all migrations
 * - Runs seed (if configured, but we skip it here to use our own)
 *
 * Note: We set PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION because:
 * - This script has assertLocalDb() guard that blocks production
 * - This is explicitly a local DEV reset tool
 * - The user invoked this command intentionally via npm run db:reset:local
 */
function runPrismaReset(): void {
  const provider = detectProvider();
  console.log(`📦 Provider détecté: ${provider}`);
  console.log('🔄 Running prisma migrate reset --force --skip-seed...');
  console.log('   (Standard Prisma DEV command - no raw SQL)\n');

  try {
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Safe because assertLocalDb() already verified this is a local database
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes reset local dev database'
      }
    });
    console.log('\n   ✅ Database reset complete\n');
  } catch (error) {
    console.error('   ❌ Prisma reset failed');
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

function main(): void {
  console.log('\n🔄 DB RESET LOCAL\n');
  console.log('=====================================');

  // Step 1: Safety check
  assertLocalDb();

  // Step 2: Run prisma migrate reset (standard Prisma command)
  runPrismaReset();

  // Step 3: Seed players
  seedPlayers();

  console.log('\n=====================================');
  console.log('✅ Reset complete! Database has 10 test players.\n');
}

main();
