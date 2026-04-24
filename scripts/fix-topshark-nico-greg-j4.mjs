// Fix Top Shark Leader bonus: TOURNOI #4 n'avait pas seasonTopSharkAtStartId figé
// Greg était le leader du top shark (plus d'éliminations finales) avant J4
// NicoJOUQ a éliminé Greg définitivement → doit recevoir le bonus topSharkLeaderBonus
//
// Ce script:
//   1. Calcule qui était le top shark leader avant J4
//   2. Met seasonTopSharkAtStartId sur le tournoi
//   3. Met isTopSharkLeaderKill = true sur l'élim Nico→Greg
//   4. Incrémente topSharkLeaderKills de Nico à 1
//   5. Recalcule bonusPoints/totalPoints pour TOUS les joueurs de TOUS les tournois
//      FINISHED de la saison (pour propager l'impact au classement)
//
// Usage dry-run (aperçu sans écriture):
//   fly ssh console -C "node scripts/fix-topshark-nico-greg-j4.mjs"
//
// Usage apply (écrit en DB):
//   fly ssh console -C "APPLY=1 node scripts/fix-topshark-nico-greg-j4.mjs"

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TOURNAMENT_ID = 'cmo479s4700dhr5ka308oqy3k'; // TOURNOI #4 (17/04/2026)
const GREG_ID = 'cmkfr7oa9000ar5k3971z2lov';
const NICO_ID = 'cmkh8nv2v002or5k3nvj8ec12';
const APPLY = process.env.APPLY === '1';

function getRankPointsForPosition(rank, season) {
  const cfg = season.detailedPointsConfig;
  if (cfg && cfg.type === 'DETAILED' && cfg.byRank) {
    const p = cfg.byRank[String(rank)];
    if (p !== undefined) return p;
    return cfg.rank19Plus ?? 0;
  }
  const legacy = {
    1: season.pointsFirst, 2: season.pointsSecond, 3: season.pointsThird,
    4: season.pointsFourth, 5: season.pointsFifth, 6: season.pointsSixth,
    7: season.pointsSeventh, 8: season.pointsEighth, 9: season.pointsNinth,
    10: season.pointsTenth,
  };
  if (legacy[rank] !== undefined) return legacy[rank];
  if (rank >= 11 && rank <= 15) return season.pointsEleventh;
  return season.pointsSixteenth;
}

async function main() {
  console.log(`\n=== MODE: ${APPLY ? 'APPLY (écriture DB)' : 'DRY-RUN (aucune écriture)'} ===\n`);

  const t = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    include: { season: true },
  });
  if (!t) { console.log('❌ Tournoi introuvable'); return; }
  console.log(`Tournoi: ${t.name} | seasonTopSharkAtStartId actuel = ${t.seasonTopSharkAtStartId}`);
  console.log(`topSharkLeaderBonus = ${t.season?.topSharkLeaderBonus}`);

  // === 0. Calculer qui était le top shark leader AVANT J4 ===
  const priorTournaments = await prisma.tournament.findMany({
    where: {
      seasonId: t.seasonId,
      type: 'CHAMPIONSHIP',
      status: 'FINISHED',
      id: { not: TOURNAMENT_ID },
      date: { lt: t.date },
    },
    include: {
      tournamentPlayers: {
        select: { playerId: true, eliminationsCount: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  console.log(`\n=== Tournois FINISHED antérieurs à J4: ${priorTournaments.length} ===`);
  priorTournaments.forEach(pt => console.log(`  ${pt.name} | ${pt.date.toISOString().slice(0, 10)}`));

  // Agréger les éliminations par joueur
  const playerEliminations = new Map();
  for (const tour of priorTournaments) {
    for (const tp of tour.tournamentPlayers) {
      const current = playerEliminations.get(tp.playerId) || 0;
      playerEliminations.set(tp.playerId, current + tp.eliminationsCount);
    }
  }

  // Trouver le top shark leader
  let topSharkLeaderId = null;
  let maxElims = 0;
  for (const [playerId, elimCount] of playerEliminations.entries()) {
    if (elimCount > maxElims) {
      maxElims = elimCount;
      topSharkLeaderId = playerId;
    }
  }

  const topSharkPlayer = topSharkLeaderId
    ? await prisma.player.findUnique({ where: { id: topSharkLeaderId }, select: { nickname: true } })
    : null;
  console.log(`\n→ Top Shark Leader avant J4: ${topSharkPlayer?.nickname} (${topSharkLeaderId}) avec ${maxElims} éliminations`);

  if (topSharkLeaderId !== GREG_ID) {
    console.log(`\n⚠️  Le top shark leader n'est PAS Greg (${GREG_ID})!`);
    console.log(`   Le top shark leader est ${topSharkPlayer?.nickname} (${topSharkLeaderId}).`);
    console.log(`   Abandon du fix.`);
    await prisma.$disconnect();
    return;
  }
  console.log(`✅ Confirmé: Greg est bien le top shark leader avant J4`);

  // === 1. Trouver l'élim Nico → Greg ===
  const elim = await prisma.elimination.findFirst({
    where: { tournamentId: TOURNAMENT_ID, eliminatorId: NICO_ID, eliminatedId: GREG_ID },
  });
  if (!elim) { console.log('❌ Élim Nico→Greg introuvable'); return; }
  console.log(`\nÉlim trouvée: id=${elim.id} rank=${elim.rank} isTopSharkLeaderKill actuel=${elim.isTopSharkLeaderKill}`);

  if (elim.isTopSharkLeaderKill) {
    console.log('✅ Déjà marquée isTopSharkLeaderKill=true, rien à faire');
    await prisma.$disconnect();
    return;
  }

  const nicoTp = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_playerId: { tournamentId: TOURNAMENT_ID, playerId: NICO_ID } },
  });
  console.log(`Nico TP avant: topSharkLeaderKills=${nicoTp.topSharkLeaderKills} bonusPoints=${nicoTp.bonusPoints} totalPoints=${nicoTp.totalPoints}`);

  // === 2. Patch tournoi + élim + topSharkLeaderKills Nico ===
  if (APPLY) {
    await prisma.$transaction([
      prisma.tournament.update({
        where: { id: TOURNAMENT_ID },
        data: { seasonTopSharkAtStartId: GREG_ID },
      }),
      prisma.elimination.update({
        where: { id: elim.id },
        data: { isTopSharkLeaderKill: true },
      }),
      prisma.tournamentPlayer.update({
        where: { tournamentId_playerId: { tournamentId: TOURNAMENT_ID, playerId: NICO_ID } },
        data: { topSharkLeaderKills: { increment: 1 } },
      }),
    ]);
    console.log('✅ Patch tournoi + élim + topSharkLeaderKills Nico OK');
  } else {
    console.log('(dry-run) set seasonTopSharkAtStartId=Greg, isTopSharkLeaderKill=true, topSharkLeaderKills Nico +1');
  }

  // === 3. Recalcul idempotent de TOUS les tournois FINISHED de la saison ===
  const season = await prisma.season.findUnique({
    where: { id: t.seasonId },
    include: {
      tournaments: {
        where: { status: 'FINISHED', type: 'CHAMPIONSHIP' },
        include: { tournamentPlayers: true },
      },
    },
  });

  let touched = 0;
  const changes = [];

  for (const tour of season.tournaments) {
    for (const tp of tour.tournamentPlayers) {
      let rankPoints = 0, eliminationPoints = 0, bonusPoints = 0;
      // Si c'est Nico sur CE tournoi et qu'on n'a pas encore écrit, utiliser topSharkLeaderKills+1
      let effectiveTSLK = tp.topSharkLeaderKills;
      if (!APPLY && tour.id === TOURNAMENT_ID && tp.playerId === NICO_ID) {
        effectiveTSLK = tp.topSharkLeaderKills + 1;
      }
      if (tp.finalRank !== null) {
        rankPoints = getRankPointsForPosition(tp.finalRank, season);
        eliminationPoints = tp.eliminationsCount * season.eliminationPoints
                          + tp.bustEliminations * season.bustEliminationBonus;
        bonusPoints = tp.leaderKills * season.leaderKillerBonus
                    + effectiveTSLK * season.topSharkLeaderBonus
                    + tp.randomTargetKills * season.randomKillerBonus;
      }
      const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

      if (tp.rankPoints !== rankPoints || tp.eliminationPoints !== eliminationPoints
          || tp.bonusPoints !== bonusPoints || tp.totalPoints !== totalPoints) {
        changes.push({
          tournamentId: tour.id,
          tournamentName: tour.name,
          playerId: tp.playerId,
          before: { rankPoints: tp.rankPoints, eliminationPoints: tp.eliminationPoints, bonusPoints: tp.bonusPoints, totalPoints: tp.totalPoints },
          after:  { rankPoints, eliminationPoints, bonusPoints, totalPoints },
        });
        if (APPLY) {
          await prisma.tournamentPlayer.update({
            where: { tournamentId_playerId: { tournamentId: tour.id, playerId: tp.playerId } },
            data: { rankPoints, eliminationPoints, bonusPoints, totalPoints },
          });
          touched++;
        }
      }
    }
  }

  console.log(`\n=== Changements de points détectés: ${changes.length} ===`);
  for (const c of changes) {
    const nick = (await prisma.player.findUnique({ where: { id: c.playerId }, select: { nickname: true } }))?.nickname;
    console.log(`  ${c.tournamentName} / ${nick}: total ${c.before.totalPoints} → ${c.after.totalPoints} (bonus ${c.before.bonusPoints}→${c.after.bonusPoints})`);
  }

  if (APPLY) console.log(`\n✅ ${touched} TournamentPlayer mis à jour`);
  else console.log(`\n(dry-run) ${changes.length} lignes seraient mises à jour. Relance avec APPLY=1 pour écrire.`);

  // === 4. Vérif classement saison (top 10) ===
  const allFinished = await prisma.tournament.findMany({
    where: { seasonId: t.seasonId, status: 'FINISHED', type: 'CHAMPIONSHIP' },
    select: { id: true },
  });
  const totals = await prisma.tournamentPlayer.groupBy({
    by: ['playerId'],
    where: { tournamentId: { in: allFinished.map(x => x.id) } },
    _sum: { totalPoints: true },
  });
  const sorted = totals
    .map(x => ({ playerId: x.playerId, totalPoints: x._sum.totalPoints || 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 10);
  console.log('\n=== TOP 10 saison (état courant en DB) ===');
  for (const row of sorted) {
    const p = await prisma.player.findUnique({ where: { id: row.playerId }, select: { nickname: true } });
    console.log(`  ${p?.nickname}: ${row.totalPoints} pts`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
