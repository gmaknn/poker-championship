const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function archiveSeason() {
  try {
    // Archive the duplicate "Championnat 2025-2026" season
    const updated = await prisma.season.update({
      where: { id: 'cmhwaaqit000rwsx4o12rqhxk' },
      data: { status: 'ARCHIVED' }
    });

    console.log('✅ Season archived:', updated.name, `(${updated.year})`);
    console.log('   Status:', updated.status);

    // Verify only one active season remains
    const activeSeasons = await prisma.season.findMany({
      where: { status: 'ACTIVE' }
    });

    console.log('\n📊 Active seasons remaining:', activeSeasons.length);
    activeSeasons.forEach(s => {
      console.log(`   - ${s.name} (${s.year})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

archiveSeason();
