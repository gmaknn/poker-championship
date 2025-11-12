const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function promoteUser() {
  try {
    // Chercher Grégory Martin
    const gregory = await prisma.player.findFirst({
      where: {
        firstName: 'Grégory',
        lastName: 'Martin'
      }
    });

    if (!gregory) {
      console.log('❌ Grégory Martin non trouvé');
      return;
    }

    console.log(`✅ Trouvé: ${gregory.firstName} ${gregory.lastName} (${gregory.nickname})`);
    console.log(`   Rôle actuel: ${gregory.role}`);

    // Promouvoir au rôle ADMIN
    const updated = await prisma.player.update({
      where: { id: gregory.id },
      data: { role: 'ADMIN' }
    });

    console.log(`✅ Rôle mis à jour: ${updated.role}`);
    console.log(`\n🎉 Grégory Martin est maintenant Administrateur !`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

promoteUser();
