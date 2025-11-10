import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed default chip denominations for the championship
 * Standard poker chip colors and values
 */
async function seedDefaultChips() {
  console.log('🎰 Seeding default chip denominations...');

  const defaultChips = [
    {
      value: 10,
      color: '#FF0000', // Rouge
      order: 1,
      isDefault: true,
    },
    {
      value: 25,
      color: '#00FF00', // Vert
      order: 2,
      isDefault: true,
    },
    {
      value: 50,
      color: '#0000FF', // Bleu
      order: 3,
      isDefault: true,
    },
    {
      value: 100,
      color: '#000000', // Noir
      order: 4,
      isDefault: true,
    },
    {
      value: 500,
      color: '#800080', // Violet
      order: 5,
      isDefault: true,
    },
    {
      value: 1000,
      color: '#FFFF00', // Jaune
      order: 6,
      isDefault: true,
    },
    {
      value: 5000,
      color: '#FFA500', // Orange
      order: 7,
      isDefault: true,
    },
    {
      value: 10000,
      color: '#FFFFFF', // Blanc
      order: 8,
      isDefault: true,
    },
  ];

  // Delete existing default chips to avoid duplicates
  await prisma.chipDenomination.deleteMany({
    where: { isDefault: true },
  });

  // Create new default chips
  for (const chip of defaultChips) {
    await prisma.chipDenomination.create({
      data: chip,
    });
    console.log(`  ✓ Created chip: ${chip.value} (${chip.color})`);
  }

  console.log('✅ Default chips seeded successfully!');
}

seedDefaultChips()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
