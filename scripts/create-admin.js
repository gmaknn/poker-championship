const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Chercher si un admin existe déjà
    const existingAdmin = await prisma.player.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (existingAdmin) {
      console.log(`✅ Un admin existe déjà: ${existingAdmin.firstName} ${existingAdmin.lastName} (${existingAdmin.nickname})`);
      console.log(`   Rôle: ${existingAdmin.role}`);
      return;
    }

    // Créer un nouvel admin
    const admin = await prisma.player.create({
      data: {
        firstName: 'Admin',
        lastName: 'System',
        nickname: 'The Boss',
        email: 'admin@wpt-villelaure.com',
        role: 'ADMIN',
        avatar: 'Boss'
      }
    });

    console.log(`✅ Admin créé avec succès !`);
    console.log(`   Nom: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Pseudo: ${admin.nickname}`);
    console.log(`   Rôle: ${admin.role}`);
    console.log(`\n🎉 Vous pouvez maintenant vous connecter en tant qu'admin sur /dev-login !`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
