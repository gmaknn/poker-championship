const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listPlayers() {
  try {
    const players = await prisma.player.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { role: 'asc' }
    });

    console.log('\n📋 Liste des joueurs actifs:\n');
    console.log('═══════════════════════════════════════════════════════════════');

    players.forEach(player => {
      const roleEmoji = {
        'ADMIN': '👑',
        'TOURNAMENT_DIRECTOR': '🛡️',
        'ANIMATOR': '🎤',
        'PLAYER': '👤'
      }[player.role] || '👤';

      console.log(`${roleEmoji} ${player.nickname.padEnd(20)} | ${player.firstName} ${player.lastName}`);
      console.log(`   Rôle: ${player.role}`);
      console.log(`   ID: ${player.id}`);
      console.log('───────────────────────────────────────────────────────────────');
    });

    console.log(`\n✅ Total: ${players.length} joueurs actifs\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listPlayers();
