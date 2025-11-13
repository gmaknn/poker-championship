const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSeasons() {
  try {
    const seasons = await prisma.season.findMany();

    console.log('\n📊 Toutes les saisons:\n');
    seasons.forEach(s => {
      console.log(`${s.status === 'ACTIVE' ? '✅' : '  '} ${s.name} (${s.year}) - ${s.status}`);
      console.log(`   ID: ${s.id}`);
    });

    const activeSeasons = seasons.filter(s => s.status === 'ACTIVE');
    console.log(`\n🔍 Nombre de saisons actives: ${activeSeasons.length}`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSeasons();
