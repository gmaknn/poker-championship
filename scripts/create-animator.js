const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createAnimator() {
  try {
    // Chercher si un animateur existe déjà
    const existingAnimator = await prisma.player.findFirst({
      where: {
        role: 'ANIMATOR'
      }
    });

    if (existingAnimator) {
      console.log(`✅ Un animateur existe déjà: ${existingAnimator.firstName} ${existingAnimator.lastName} (${existingAnimator.nickname})`);
      console.log(`   Rôle: ${existingAnimator.role}`);
      return;
    }

    // Créer un nouvel animateur
    const animator = await prisma.player.create({
      data: {
        firstName: 'Alex',
        lastName: 'Dupont',
        nickname: 'The Animator',
        email: 'alex.dupont@example.com',
        role: 'ANIMATOR',
        avatar: 'Poker'
      }
    });

    console.log(`✅ Animateur créé avec succès !`);
    console.log(`   Nom: ${animator.firstName} ${animator.lastName}`);
    console.log(`   Pseudo: ${animator.nickname}`);
    console.log(`   Rôle: ${animator.role}`);
    console.log(`\n🎉 Vous pouvez maintenant vous connecter en tant qu'animateur sur /dev-login !`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAnimator();
