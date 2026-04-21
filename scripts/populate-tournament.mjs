// Script to populate tournament results for 2026-04-17
// Run with: node scripts/populate-tournament.mjs

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TOURNAMENT_ID = 'cmo479s4700dhr5ka308oqy3k';

async function main() {
  console.log('Starting tournament population...');

  // Step 0: Compute seasonLeaderAtStartId (leader saison AVANT ce tournoi)
  // Indispensable pour que le bonus Leader Killer soit calculé correctement.
  const tournament = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    select: { seasonId: true, date: true },
  });
  let seasonLeaderAtStartId = null;
  if (tournament?.seasonId) {
    const priorTournaments = await prisma.tournament.findMany({
      where: {
        seasonId: tournament.seasonId,
        type: 'CHAMPIONSHIP',
        status: 'FINISHED',
        id: { not: TOURNAMENT_ID },
        date: { lt: tournament.date },
      },
      select: { id: true },
    });
    if (priorTournaments.length > 0) {
      const totals = await prisma.tournamentPlayer.groupBy({
        by: ['playerId'],
        where: { tournamentId: { in: priorTournaments.map(p => p.id) } },
        _sum: { totalPoints: true },
      });
      const leader = totals
        .map(x => ({ playerId: x.playerId, totalPoints: x._sum.totalPoints || 0 }))
        .sort((a, b) => b.totalPoints - a.totalPoints)[0];
      seasonLeaderAtStartId = leader?.playerId ?? null;
    }
  }
  console.log('seasonLeaderAtStartId computed:', seasonLeaderAtStartId);

  // Step 1: Set tournament to FINISHED + lock seasonLeaderAtStartId
  await prisma.tournament.update({
    where: { id: TOURNAMENT_ID },
    data: {
      status: 'FINISHED',
      currentLevel: 10,
      seasonLeaderAtStartId,
    },
  });
  console.log('Tournament set to FINISHED');

  // Step 2: Mark all players as paid
  await prisma.tournamentPlayer.updateMany({
    where: { tournamentId: TOURNAMENT_ID },
    data: { hasPaid: true },
  });
  console.log('All players marked as paid');

  // Step 3: Create BustEvents (during recave period, all recaved)
  const busts = [
    { id: 'bust_01', eliminatedId: 'cmo47bxsa00dtr5kab264oj8w', killerId: 'cmo47cy7300e3r5kafbse8v1l', level: 2 },  // Jérémy by Vincent
    { id: 'bust_02', eliminatedId: 'cmo47cy7200dyr5ka23z0135u', killerId: 'cmo47c2zf00dvr5kab0mq0ax9', level: 2 },  // Karine by Greg
    { id: 'bust_03', eliminatedId: 'cmo47cy7200dyr5ka23z0135u', killerId: 'cmo47cy7200dxr5kaeju1t5yk', level: 3 },  // Karine by Georges
    { id: 'bust_04', eliminatedId: 'cmo47cy7200dwr5kaymy6h5az', killerId: 'cmo47cy7200dxr5kaeju1t5yk', level: 3 },  // Benji by Georges
    { id: 'bust_05', eliminatedId: 'cmo47cy7200dwr5kaymy6h5az', killerId: 'cmo47cy7200dzr5kau7mo4l9n', level: 3 },  // Benji by Mika
    { id: 'bust_06', eliminatedId: 'cmo47cy7200dwr5kaymy6h5az', killerId: 'cmo47cy7300e3r5kafbse8v1l', level: 4 },  // Benji by Vincent
    { id: 'bust_07', eliminatedId: 'cmo47c2zf00dur5kahxusg702', killerId: 'cmo47bkuo00dqr5kaottxqpdb', level: 4 },  // Rémi by NicoJOUQ
    { id: 'bust_08', eliminatedId: 'cmo47bkuo00dor5kaqbsvj66l', killerId: 'cmo47bkuo00dpr5kabf4ulieb', level: 4 },  // NicoBO by NicoFO
    { id: 'bust_09', eliminatedId: 'cmo47bqz200drr5kaxxjzqon8', killerId: 'cmo47cy7200e2r5kapctgjwqi', level: 4 },  // Christophe by Stephan
    { id: 'bust_10', eliminatedId: 'cmo47bqz300dsr5kahf83elns', killerId: 'cmo47cy7200dxr5kaeju1t5yk', level: 4 },  // Christian by Georges
  ];

  for (const bust of busts) {
    await prisma.bustEvent.create({
      data: {
        id: bust.id,
        tournamentId: TOURNAMENT_ID,
        eliminatedId: bust.eliminatedId,
        killerId: bust.killerId,
        level: bust.level,
        recaveApplied: true,
      },
    });
  }
  console.log(`Created ${busts.length} bust events`);

  // Step 4: Create Eliminations (final, after recaves)
  const eliminations = [
    { id: 'elim_16', eliminatedId: 'cmkfrg0ur000dr5k3hg9w45wg', eliminatorId: 'cmkh8n7iy002nr5k3bwgurs0a', rank: 16, level: 6 },   // Jérémy by Mika
    { id: 'elim_15', eliminatedId: 'cmkh8n7iy002nr5k3bwgurs0a', eliminatorId: 'cmkfr7oa9000ar5k3971z2lov', rank: 15, level: 6 },   // Mika by Greg
    { id: 'elim_14', eliminatedId: 'cmkfr6dxe0007r5k3554h80lu', eliminatorId: 'cmkfqidwk0001r5k2108iu4ak', rank: 14, level: 6 },   // Romain by Pascal
    { id: 'elim_13', eliminatedId: 'cmkfr3w8f0003r5k3exb92wpr', eliminatorId: 'cmkfqjb1f0002r5k2bjo9i95d', rank: 13, level: 7 },   // Rémi by Karine
    { id: 'elim_12', eliminatedId: 'cmkfrfryg000cr5k3a2hxz7b4', eliminatorId: 'cmkfr36q90002r5k306i4q51j', rank: 12, level: 7 },   // Christophe by Georges
    { id: 'elim_11', eliminatedId: 'cmkfr514n0005r5k34org547m', eliminatorId: 'cmkfr36q90002r5k306i4q51j', rank: 11, level: 7 },   // NicoBO by Georges
    { id: 'elim_10', eliminatedId: 'cmkfr4iuw0004r5k3jjq65qzx', eliminatorId: 'cmkfr7oa9000ar5k3971z2lov', rank: 10, level: 8 },   // NicoFO by Greg
    { id: 'elim_09', eliminatedId: 'cmkfr5j7d0006r5k3jyunl98a', eliminatorId: 'cmkfr2te50001r5k3l8w2g98h', rank: 9, level: 8 },    // Benji by Vincent
    { id: 'elim_08', eliminatedId: 'cmkfra30s000br5k3zub8ud6b', eliminatorId: 'cmkfr7oa9000ar5k3971z2lov', rank: 8, level: 8 },    // Christian by Greg
    { id: 'elim_07', eliminatedId: 'cmkfqidwk0001r5k2108iu4ak', eliminatorId: 'cmmhlnah300kyr5k9a4forq3z', rank: 7, level: 9 },    // Pascal by Stephan
    { id: 'elim_06', eliminatedId: 'cmkfqjb1f0002r5k2bjo9i95d', eliminatorId: 'cmkh8nv2v002or5k3nvj8ec12', rank: 6, level: 9 },    // Karine by NicoJOUQ
    { id: 'elim_05', eliminatedId: 'cmkfr36q90002r5k306i4q51j', eliminatorId: 'cmkfr7oa9000ar5k3971z2lov', rank: 5, level: 9 },    // Georges by Greg
    { id: 'elim_04', eliminatedId: 'cmmhlnah300kyr5k9a4forq3z', eliminatorId: 'cmkh8nv2v002or5k3nvj8ec12', rank: 4, level: 10 },   // Stephan by NicoJOUQ
    { id: 'elim_03', eliminatedId: 'cmkfr7oa9000ar5k3971z2lov', eliminatorId: 'cmkh8nv2v002or5k3nvj8ec12', rank: 3, level: 10 },   // Greg by NicoJOUQ
    { id: 'elim_02', eliminatedId: 'cmkfr2te50001r5k3l8w2g98h', eliminatorId: 'cmkh8nv2v002or5k3nvj8ec12', rank: 2, level: 10 },   // Vincent by NicoJOUQ
  ];

  // Compteur de leader kills par éliminateur (pour incrémenter TournamentPlayer.leaderKills)
  const leaderKillsByEliminator = new Map();

  for (const elim of eliminations) {
    // Une élim est un Leader Kill si le joueur éliminé est le leader saison figé au start.
    const isLeaderKill = seasonLeaderAtStartId !== null
      && elim.eliminatedId === seasonLeaderAtStartId;
    if (isLeaderKill && elim.eliminatorId) {
      leaderKillsByEliminator.set(
        elim.eliminatorId,
        (leaderKillsByEliminator.get(elim.eliminatorId) || 0) + 1,
      );
    }
    await prisma.elimination.create({
      data: {
        id: elim.id,
        tournamentId: TOURNAMENT_ID,
        eliminatedId: elim.eliminatedId,
        eliminatorId: elim.eliminatorId,
        rank: elim.rank,
        level: elim.level,
        isLeaderKill,
        isAutoElimination: false,
        isAbandonment: false,
      },
    });
  }
  console.log(`Created ${eliminations.length} eliminations (${[...leaderKillsByEliminator.entries()].map(([k,v])=>`${k}:${v} LK`).join(', ') || 'no LK'})`);

  // Récupère le bonus Leader Killer de la saison pour recalculer les points impactés
  const seasonForBonus = await prisma.season.findUnique({
    where: { id: tournament.seasonId },
    select: { leaderKillerBonus: true },
  });
  const leaderKillerBonus = seasonForBonus?.leaderKillerBonus ?? 0;

  // Step 5: Update TournamentPlayer stats and points
  // Season 2026 config: detailedPointsConfig byRank, eliminationPoints=50, bustEliminationBonus=25
  // freeRebuysCount=1, penaltyPerUnit=50
  const playerUpdates = [
    // NicoJOUQ - Rank 1, 0 rebuys, 1 bustElim, 4 finalElims, prize 130€
    { id: 'cmo47bkuo00dqr5kaottxqpdb', finalRank: 1, rebuysCount: 0, bustEliminations: 1, eliminationsCount: 4, penaltyPoints: 0, rankPoints: 1500, eliminationPoints: 225, totalPoints: 1725, prizeAmount: 130 },
    // Vincent - Rank 2, 0 rebuys, 2 bustElims, 1 finalElim, prize 80€
    { id: 'cmo47cy7300e3r5kafbse8v1l', finalRank: 2, rebuysCount: 0, bustEliminations: 2, eliminationsCount: 1, penaltyPoints: 0, rankPoints: 1000, eliminationPoints: 100, totalPoints: 1100, prizeAmount: 80 },
    // Greg - Rank 3, 0 rebuys, 1 bustElim, 4 finalElims, prize 30€
    { id: 'cmo47c2zf00dvr5kab0mq0ax9', finalRank: 3, rebuysCount: 0, bustEliminations: 1, eliminationsCount: 4, penaltyPoints: 0, rankPoints: 700, eliminationPoints: 225, totalPoints: 925, prizeAmount: 30 },
    // Stephan - Rank 4, 0 rebuys, 1 bustElim, 1 finalElim
    { id: 'cmo47cy7200e2r5kapctgjwqi', finalRank: 4, rebuysCount: 0, bustEliminations: 1, eliminationsCount: 1, penaltyPoints: 0, rankPoints: 500, eliminationPoints: 75, totalPoints: 575, prizeAmount: null },
    // Georges - Rank 5, 0 rebuys, 3 bustElims, 2 finalElims
    { id: 'cmo47cy7200dxr5kaeju1t5yk', finalRank: 5, rebuysCount: 0, bustEliminations: 3, eliminationsCount: 2, penaltyPoints: 0, rankPoints: 400, eliminationPoints: 175, totalPoints: 575, prizeAmount: null },
    // Karine - Rank 6, 2 rebuys, 0 bustElims, 1 finalElim, penalty -50
    { id: 'cmo47cy7200dyr5ka23z0135u', finalRank: 6, rebuysCount: 2, bustEliminations: 0, eliminationsCount: 1, penaltyPoints: -50, rankPoints: 300, eliminationPoints: 50, totalPoints: 300, prizeAmount: null },
    // Pascal - Rank 7, 0 rebuys, 0 bustElims, 1 finalElim
    { id: 'cmo47cy7200e0r5kacuft8lae', finalRank: 7, rebuysCount: 0, bustEliminations: 0, eliminationsCount: 1, penaltyPoints: 0, rankPoints: 250, eliminationPoints: 50, totalPoints: 300, prizeAmount: null },
    // Christian - Rank 8, 1 rebuy, 0 bustElims, 0 finalElims
    { id: 'cmo47bqz300dsr5kahf83elns', finalRank: 8, rebuysCount: 1, bustEliminations: 0, eliminationsCount: 0, penaltyPoints: 0, rankPoints: 200, eliminationPoints: 0, totalPoints: 200, prizeAmount: null },
    // Benji - Rank 9, 3 rebuys, 0 bustElims, 0 finalElims, penalty -100
    { id: 'cmo47cy7200dwr5kaymy6h5az', finalRank: 9, rebuysCount: 3, bustEliminations: 0, eliminationsCount: 0, penaltyPoints: -100, rankPoints: 180, eliminationPoints: 0, totalPoints: 80, prizeAmount: null },
    // NicoFO - Rank 10, 0 rebuys, 1 bustElim, 0 finalElims
    { id: 'cmo47bkuo00dpr5kabf4ulieb', finalRank: 10, rebuysCount: 0, bustEliminations: 1, eliminationsCount: 0, penaltyPoints: 0, rankPoints: 160, eliminationPoints: 25, totalPoints: 185, prizeAmount: null },
    // NicoBO - Rank 11, 1 rebuy, 0 bustElims, 0 finalElims
    { id: 'cmo47bkuo00dor5kaqbsvj66l', finalRank: 11, rebuysCount: 1, bustEliminations: 0, eliminationsCount: 0, penaltyPoints: 0, rankPoints: 140, eliminationPoints: 0, totalPoints: 140, prizeAmount: null },
    // Christophe - Rank 12, 1 rebuy, 0 bustElims, 0 finalElims
    { id: 'cmo47bqz200drr5kaxxjzqon8', finalRank: 12, rebuysCount: 1, bustEliminations: 0, eliminationsCount: 0, penaltyPoints: 0, rankPoints: 120, eliminationPoints: 0, totalPoints: 120, prizeAmount: null },
    // Rémi - Rank 13, 1 rebuy, 0 bustElims, 0 finalElims
    { id: 'cmo47c2zf00dur5kahxusg702', finalRank: 13, rebuysCount: 1, bustEliminations: 0, eliminationsCount: 0, penaltyPoints: 0, rankPoints: 100, eliminationPoints: 0, totalPoints: 100, prizeAmount: null },
    // Romain - Rank 14, 0 rebuys, 0 bustElims, 0 finalElims
    { id: 'cmo47cy7200e1r5kaumof57dz', finalRank: 14, rebuysCount: 0, bustEliminations: 0, eliminationsCount: 0, penaltyPoints: 0, rankPoints: 90, eliminationPoints: 0, totalPoints: 90, prizeAmount: null },
    // Mika - Rank 15, 0 rebuys, 1 bustElim, 1 finalElim
    { id: 'cmo47cy7200dzr5kau7mo4l9n', finalRank: 15, rebuysCount: 0, bustEliminations: 1, eliminationsCount: 1, penaltyPoints: 0, rankPoints: 80, eliminationPoints: 75, totalPoints: 155, prizeAmount: null },
    // Jérémy - Rank 16, 1 rebuy, 0 bustElims, 0 finalElims
    { id: 'cmo47bxsa00dtr5kab264oj8w', finalRank: 16, rebuysCount: 1, bustEliminations: 0, eliminationsCount: 0, penaltyPoints: 0, rankPoints: 70, eliminationPoints: 0, totalPoints: 70, prizeAmount: null },
  ];

  for (const p of playerUpdates) {
    // Résoudre le playerId pour retrouver un éventuel leaderKills
    const tp = await prisma.tournamentPlayer.findUnique({
      where: { id: p.id },
      select: { playerId: true },
    });
    const lk = tp ? (leaderKillsByEliminator.get(tp.playerId) || 0) : 0;
    const bonusPoints = lk * leaderKillerBonus;
    const totalPoints = p.totalPoints + bonusPoints;
    await prisma.tournamentPlayer.update({
      where: { id: p.id },
      data: {
        finalRank: p.finalRank,
        rebuysCount: p.rebuysCount,
        bustEliminations: p.bustEliminations,
        eliminationsCount: p.eliminationsCount,
        leaderKills: lk,
        penaltyPoints: p.penaltyPoints,
        rankPoints: p.rankPoints,
        eliminationPoints: p.eliminationPoints,
        bonusPoints,
        totalPoints,
        prizeAmount: p.prizeAmount,
      },
    });
  }
  console.log(`Updated ${playerUpdates.length} tournament players`);

  // Step 6: Prize pool configuration
  await prisma.tournament.update({
    where: { id: TOURNAMENT_ID },
    data: {
      prizePayoutCount: 3,
      prizePayoutPercents: [130, 80, 30],
      prizePoolAdjustment: 20,
      prizePoolAdjustmentReason: 'Ajustement tournoi du 17 avril',
      prizePayoutUpdatedAt: new Date(),
    },
  });
  console.log('Prize pool configured');

  // Step 7: Table assignments (2 tables of 8, all inactive since tournament is finished)
  const table1Players = [
    'cmkh8nv2v002or5k3nvj8ec12', 'cmkfr2te50001r5k3l8w2g98h', 'cmkfr7oa9000ar5k3971z2lov', 'cmkfr36q90002r5k306i4q51j',
    'cmkfqjb1f0002r5k2bjo9i95d', 'cmkfqidwk0001r5k2108iu4ak', 'cmkfrg0ur000dr5k3hg9w45wg', 'cmkh8n7iy002nr5k3bwgurs0a',
  ];
  const table2Players = [
    'cmmhlnah300kyr5k9a4forq3z', 'cmkfr5j7d0006r5k3jyunl98a', 'cmkfra30s000br5k3zub8ud6b', 'cmkfrfryg000cr5k3a2hxz7b4',
    'cmkfr3w8f0003r5k3exb92wpr', 'cmkfr4iuw0004r5k3jjq65qzx', 'cmkfr514n0005r5k34org547m', 'cmkfr6dxe0007r5k3554h80lu',
  ];

  for (let i = 0; i < table1Players.length; i++) {
    await prisma.tableAssignment.create({
      data: {
        id: `ta_${String(i + 1).padStart(2, '0')}`,
        tournamentId: TOURNAMENT_ID,
        playerId: table1Players[i],
        tableNumber: 1,
        seatNumber: i + 1,
        isActive: false,
        isTableDirector: false,
      },
    });
  }
  for (let i = 0; i < table2Players.length; i++) {
    await prisma.tableAssignment.create({
      data: {
        id: `ta_${String(i + 9).padStart(2, '0')}`,
        tournamentId: TOURNAMENT_ID,
        playerId: table2Players[i],
        tableNumber: 2,
        seatNumber: i + 1,
        isActive: false,
        isTableDirector: false,
      },
    });
  }
  console.log('Table assignments created (2 tables of 8)');

  // Verification
  const tournamentFinal = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    select: { status: true, prizePayoutCount: true, prizePayoutPercents: true, prizePoolAdjustment: true, seasonLeaderAtStartId: true },
  });
  console.log('Tournament:', tournamentFinal);

  const players = await prisma.tournamentPlayer.findMany({
    where: { tournamentId: TOURNAMENT_ID },
    include: { player: { select: { nickname: true } } },
    orderBy: { finalRank: 'asc' },
  });
  console.log('\nResults:');
  for (const p of players) {
    console.log(`  ${p.finalRank}. ${p.player.nickname} - ${p.totalPoints} pts (rank:${p.rankPoints} elim:${p.eliminationPoints} pen:${p.penaltyPoints}) rebuys:${p.rebuysCount} bustElims:${p.bustEliminations} finalElims:${p.eliminationsCount}${p.prizeAmount ? ` prize:${p.prizeAmount}€` : ''}`);
  }

  const bustCount = await prisma.bustEvent.count({ where: { tournamentId: TOURNAMENT_ID } });
  const elimCount = await prisma.elimination.count({ where: { tournamentId: TOURNAMENT_ID } });
  const tableCount = await prisma.tableAssignment.count({ where: { tournamentId: TOURNAMENT_ID } });
  console.log(`\nBust events: ${bustCount}, Eliminations: ${elimCount}, Table assignments: ${tableCount}`);

  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
