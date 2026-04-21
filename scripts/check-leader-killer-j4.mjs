// Usage (prod): fly ssh console -C "node scripts/check-leader-killer-j4.mjs"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// TOURNOI #4 = 4e journée jouée de la saison (17/04/2026)
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || 'cmo479s4700dhr5ka308oqy3k';

async function main() {
  const t = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    include: { season: true },
  });
  if (!t) { console.log('Tournoi introuvable:', TOURNAMENT_ID); return; }

  console.log('=== TOURNOI ===');
  console.log(`${t.name} | ${t.date.toISOString().slice(0,10)} | ${t.status}`);
  console.log(`seasonLeaderAtStartId = ${t.seasonLeaderAtStartId}`);
  console.log(`Saison: ${t.season?.name} | leaderKillerBonus = ${t.season?.leaderKillerBonus}`);

  // Recalculer qui était leader de la saison AVANT ce tournoi
  const priorTournaments = await prisma.tournament.findMany({
    where: {
      seasonId: t.seasonId,
      type: 'CHAMPIONSHIP',
      status: 'FINISHED',
      date: { lt: t.date },
    },
    select: { id: true, name: true, date: true },
    orderBy: { date: 'asc' },
  });
  console.log('\n=== Tournois FINISHED antérieurs à J4 ===');
  priorTournaments.forEach(pt => console.log(`  ${pt.name} | ${pt.date.toISOString().slice(0,10)} | ${pt.id}`));

  if (priorTournaments.length > 0) {
    const priorIds = priorTournaments.map(p => p.id);
    const totals = await prisma.tournamentPlayer.groupBy({
      by: ['playerId'],
      where: { tournamentId: { in: priorIds } },
      _sum: { totalPoints: true },
    });
    const sorted = totals
      .map(x => ({ playerId: x.playerId, totalPoints: x._sum.totalPoints || 0 }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
    const top5 = sorted.slice(0, 5);
    console.log('\n=== TOP 5 saison AVANT J4 ===');
    for (const row of top5) {
      const p = await prisma.player.findUnique({ where: { id: row.playerId }, select: { nickname: true } });
      console.log(`  ${p?.nickname} : ${row.totalPoints} pts`);
    }
    if (sorted.length > 0) {
      const p = await prisma.player.findUnique({ where: { id: sorted[0].playerId }, select: { nickname: true } });
      console.log(`\n→ Leader attendu: ${p?.nickname} (${sorted[0].playerId})`);
      console.log(`→ Leader stocké : ${t.seasonLeaderAtStartId}`);
      console.log(`→ ${sorted[0].playerId === t.seasonLeaderAtStartId ? 'OK ✅' : 'MISMATCH ❌ bug: le leader n\'a pas été figé au start'}`);
    }
  }

  const nico = await prisma.player.findFirst({ where: { nickname: 'NicoJOUQ' } });
  const greg = await prisma.player.findFirst({ where: { nickname: 'Greg' } });

  const elims = await prisma.elimination.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    orderBy: { rank: 'desc' },
    include: {
      eliminated: { select: { nickname: true } },
      eliminator: { select: { nickname: true } },
    },
  });
  console.log('\n=== ÉLIMINATIONS ===');
  elims.forEach(e => {
    console.log(`rank=${e.rank} level=${e.level} ${e.eliminator?.nickname ?? 'ABANDON'} → ${e.eliminated.nickname} | leaderKill=${e.isLeaderKill}`);
  });

  if (nico) {
    const nicoTp = await prisma.tournamentPlayer.findUnique({
      where: { tournamentId_playerId: { tournamentId: TOURNAMENT_ID, playerId: nico.id } },
      select: { finalRank: true, eliminationsCount: true, leaderKills: true, rankPoints: true, eliminationPoints: true, bonusPoints: true, totalPoints: true },
    });
    console.log('\n=== NicoJOUQ @ J4 ===');
    console.log(nicoTp);

    const nicoElimsOfGreg = elims.filter(e => e.eliminatorId === nico.id && e.eliminatedId === greg?.id);
    console.log(`\nÉliminations Nico → Greg: ${nicoElimsOfGreg.length}`);
    nicoElimsOfGreg.forEach(e => console.log(`  rank=${e.rank} level=${e.level} isLeaderKill=${e.isLeaderKill}`));

    const expectedLK = nicoElimsOfGreg.filter(e => {
      // LK attendu si: Greg était leader AVANT J4 ET élim après recaves
      return t.seasonLeaderAtStartId === greg?.id;
    }).length;

    console.log(`\n--- Contrôle bonus Leader Killer ---`);
    console.log(`leaderKills stocké Nico : ${nicoTp?.leaderKills}`);
    console.log(`bonusPoints stocké Nico : ${nicoTp?.bonusPoints}`);
    console.log(`LK attendu (si Greg=leader): ${expectedLK} → bonus attendu ${expectedLK * 50} pts`);

    if (t.seasonLeaderAtStartId === null) {
      console.log(`\n❌ CAUSE: seasonLeaderAtStartId est NULL alors que ce n'est pas le 1er tournoi.`);
      console.log(`   Le timer a été démarré sans que le leader saison soit calculé/figé.`);
      console.log(`   Résultat: isLeaderKill=false pour toutes les élim de Greg → aucun bonus appliqué.`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
