const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSeasonTournaments() {
  try {
    const activeSeason = await prisma.season.findFirst({
      where: { status: 'ACTIVE' }
    });

    console.log('\n📊 Saison active:', activeSeason?.name, `(${activeSeason?.id})`);

    const tournaments = await prisma.tournament.findMany({
      where: { seasonId: activeSeason?.id }
    });

    console.log('📅 Tournois dans la saison active:', tournaments.length);

    tournaments.forEach(t => {
      console.log(`  - ${t.name} (${t.status}) - ${new Date(t.date).toLocaleDateString('fr-FR')}`);
    });

    const allTournaments = await prisma.tournament.count();
    console.log(`\n📊 Total de tous les tournois:`, allTournaments);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeasonTournaments();
