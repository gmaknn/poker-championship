const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin player...');

  const adminPlayer = await prisma.player.upsert({
    where: { nickname: 'Admin' },
    update: {
      role: 'ADMIN',
    },
    create: {
      firstName: 'Administrateur',
      lastName: 'Système',
      nickname: 'Admin',
      email: 'admin@poker.com',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Admin player created:', adminPlayer);
  console.log('\nYou can now login via:');
  console.log('https://wpt-villelaure.fly.dev/dev-login');
  console.log('And select the "Admin" player');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
