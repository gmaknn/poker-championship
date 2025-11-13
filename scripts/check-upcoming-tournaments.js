const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUpcomingTournaments() {
  try {
    const now = new Date();
    console.log('\n📅 Date actuelle:', now.toISOString());
    console.log('📅 Date locale:', now.toLocaleString('fr-FR'));

    const tournaments = await prisma.tournament.findMany({
      orderBy: { date: 'asc' }
    });

    console.log('\n📊 Tous les tournois:');
    tournaments.forEach(t => {
      const tournamentDate = new Date(t.date);
      const isFuture = tournamentDate > now;
      const isPlanningStatus = t.status === 'PLANNED' || t.status === 'REGISTRATION';

      console.log(`\n  ${isFuture && isPlanningStatus ? '✅' : '  '} ${t.name}`);
      console.log(`     Date: ${t.date.toISOString()} (${tournamentDate.toLocaleString('fr-FR')})`);
      console.log(`     Status: ${t.status}`);
      console.log(`     Future: ${isFuture}`);
      console.log(`     Planning status: ${isPlanningStatus}`);
    });

    const upcoming = tournaments.filter(t => {
      const tournamentDate = new Date(t.date);
      return tournamentDate > now && (t.status === 'PLANNED' || t.status === 'REGISTRATION');
    });

    console.log(`\n🔜 Tournois à venir: ${upcoming.length}`);
    upcoming.forEach(t => {
      console.log(`  - ${t.name} (${t.status}) - ${new Date(t.date).toLocaleString('fr-FR')}`);
    });

    if (upcoming.length > 0) {
      const next = upcoming[0];
      console.log(`\n🎯 Prochain tournoi: ${next.name}`);
      console.log(`   Date: ${new Date(next.date).toLocaleString('fr-FR')}`);
      console.log(`   Status: ${next.status}`);
    } else {
      console.log('\n⚠️ Aucun tournoi à venir trouvé');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUpcomingTournaments();
