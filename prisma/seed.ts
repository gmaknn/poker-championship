import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@poker.com' },
    update: {},
    create: {
      email: 'admin@poker.com',
      password: hashedPassword,
      name: 'Administrateur',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create chip inventory with default values
  const chipValues = [
    { value: 10, quantity: 200 },
    { value: 20, quantity: 200 },
    { value: 50, quantity: 150 },
    { value: 100, quantity: 100 },
    { value: 250, quantity: 80 },
    { value: 500, quantity: 60 },
    { value: 1000, quantity: 40 },
  ];

  for (const chip of chipValues) {
    await prisma.chipInventory.upsert({
      where: { value: chip.value },
      update: { quantity: chip.quantity },
      create: chip,
    });
  }

  console.log('✅ Chip inventory created');

  // Create a sample tournament template
  await prisma.tournamentTemplate.upsert({
    where: { id: 'default-template' },
    update: {},
    create: {
      id: 'default-template',
      name: 'Structure Standard 3h',
      description: 'Structure de tournoi standard pour 3 heures de jeu',
      targetDuration: 180,
      startingChips: 5000,
      levelDuration: 12,
      rebuyEndLevel: 6,
      structure: {
        levels: [
          { level: 1, smallBlind: 10, bigBlind: 20, ante: 0, duration: 12 },
          { level: 2, smallBlind: 15, bigBlind: 30, ante: 0, duration: 12 },
          { level: 3, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12 },
          { level: 4, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12 },
          { level: 5, smallBlind: 75, bigBlind: 150, ante: 0, duration: 12 },
          { level: 6, smallBlind: 100, bigBlind: 200, ante: 0, duration: 12 },
          { level: 7, smallBlind: 150, bigBlind: 300, ante: 25, duration: 12 },
          { level: 8, smallBlind: 200, bigBlind: 400, ante: 50, duration: 12 },
          { level: 9, smallBlind: 300, bigBlind: 600, ante: 75, duration: 12 },
          { level: 10, smallBlind: 400, bigBlind: 800, ante: 100, duration: 12 },
          { level: 11, smallBlind: 600, bigBlind: 1200, ante: 150, duration: 12 },
          { level: 12, smallBlind: 800, bigBlind: 1600, ante: 200, duration: 12 },
          { level: 13, smallBlind: 1000, bigBlind: 2000, ante: 300, duration: 12 },
          { level: 14, smallBlind: 1500, bigBlind: 3000, ante: 400, duration: 12 },
          { level: 15, smallBlind: 2000, bigBlind: 4000, ante: 500, duration: 12 },
        ],
      },
    },
  });

  console.log('✅ Tournament template created');

  console.log('🎉 Seed completed successfully!');
  console.log('\n📝 Default credentials:');
  console.log('   Email: admin@poker.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
