const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateFutureTournaments() {
  try {
    console.log('\n🔄 Mise à jour des tournois futurs...\n');

    // Mettre à jour Tournoi #5 - Inscriptions ouvertes
    const tournament5 = await prisma.tournament.updateMany({
      where: {
        name: 'Tournoi #5 - Inscriptions ouvertes'
      },
      data: {
        date: new Date('2025-12-01T19:00:00.000Z'), // 1er décembre 2025
        status: 'REGISTRATION'
      }
    });
    console.log('✅ Tournoi #5 mis à jour: 1er décembre 2025');

    // Mettre à jour Tournoi #6 - Février
    const tournament6 = await prisma.tournament.updateMany({
      where: {
        name: 'Tournoi #6 - Février'
      },
      data: {
        date: new Date('2026-01-15T19:00:00.000Z'), // 15 janvier 2026
        status: 'PLANNED'
      }
    });
    console.log('✅ Tournoi #6 mis à jour: 15 janvier 2026');

    // Vérifier le résultat
    const upcoming = await prisma.tournament.findMany({
      where: {
        date: {
          gt: new Date()
        },
        status: {
          in: ['PLANNED', 'REGISTRATION']
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    console.log(`\n📊 Tournois à venir: ${upcoming.length}`);
    upcoming.forEach(t => {
      console.log(`  - ${t.name} (${t.status}) - ${new Date(t.date).toLocaleString('fr-FR')}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateFutureTournaments();
