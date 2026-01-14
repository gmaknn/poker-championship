/**
 * Seed 10 test players into the local database
 * Does NOT create seasons or tournaments
 *
 * SAFETY: Will NOT run in production or against remote databases
 */

import { PrismaClient, PlayerStatus, PlayerRole } from '@prisma/client';

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
}

// Deterministic test players data
const TEST_PLAYERS = [
  { firstName: 'Jean', lastName: 'Dupont', nickname: 'jdupont', role: PlayerRole.ADMIN },
  { firstName: 'Marie', lastName: 'Martin', nickname: 'mmartin', role: PlayerRole.TOURNAMENT_DIRECTOR },
  { firstName: 'Pierre', lastName: 'Bernard', nickname: 'pbernard', role: PlayerRole.PLAYER },
  { firstName: 'Sophie', lastName: 'Petit', nickname: 'spetit', role: PlayerRole.PLAYER },
  { firstName: 'Lucas', lastName: 'Robert', nickname: 'lrobert', role: PlayerRole.PLAYER },
  { firstName: 'Emma', lastName: 'Richard', nickname: 'erichard', role: PlayerRole.PLAYER },
  { firstName: 'Hugo', lastName: 'Durand', nickname: 'hdurand', role: PlayerRole.PLAYER },
  { firstName: 'Chloé', lastName: 'Leroy', nickname: 'cleroy', role: PlayerRole.PLAYER },
  { firstName: 'Louis', lastName: 'Moreau', nickname: 'lmoreau', role: PlayerRole.PLAYER },
  { firstName: 'Léa', lastName: 'Simon', nickname: 'lsimon', role: PlayerRole.PLAYER },
];

async function seedPlayers(): Promise<void> {
  console.log('\n🌱 SEED: 10 Test Players\n');

  // Safety first
  assertLocalDb();

  console.log('📊 Before seed:');
  const beforeCount = await prisma.player.count();
  console.log(`   Players: ${beforeCount}`);

  console.log('\n🔄 Creating/updating players...\n');

  let created = 0;
  let updated = 0;

  for (const playerData of TEST_PLAYERS) {
    const email = `${playerData.nickname}@local.test`;

    const result = await prisma.player.upsert({
      where: { nickname: playerData.nickname },
      update: {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        email: email,
        status: PlayerStatus.ACTIVE,
        role: playerData.role,
      },
      create: {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        nickname: playerData.nickname,
        email: email,
        status: PlayerStatus.ACTIVE,
        role: playerData.role,
      },
    });

    // Check if it was created or updated (crude check via createdAt vs updatedAt)
    const isNew = Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) {
      created++;
      console.log(`   ✅ Created: ${result.firstName} ${result.lastName} (@${result.nickname}) - ${result.role}`);
    } else {
      updated++;
      console.log(`   🔄 Updated: ${result.firstName} ${result.lastName} (@${result.nickname}) - ${result.role}`);
    }
  }

  console.log('\n📊 After seed:');
  const afterCount = await prisma.player.count();
  console.log(`   Players: ${afterCount}`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);

  console.log('\n✅ Seed complete!');
}

// Main
seedPlayers()
  .catch((e) => {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
