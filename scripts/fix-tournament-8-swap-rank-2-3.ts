/**
 * Fix TOURNOI #8 | 04/09/2026 - Inversion des places 2 et 3
 *
 * CONTEXTE
 * Les joueurs ayant terminé 2ème et 3ème ont été intervertis lors de la saisie.
 * Classement correct :
 *   - 2ème : Nicolas BEAUSSET (actuellement 3ème)
 *   - 3ème : Nicolas FORTIN   (actuellement 2ème)
 *
 * PORTEE DE LA CORRECTION
 * 1. TournamentPlayer.finalRank : swap 2 <-> 3
 * 2. Elimination.rank           : swap 2 <-> 3 (le rang de sortie est aussi stocké ici)
 * 3. Recalcul rankPoints + totalPoints des deux joueurs
 *
 * CE QUI N'EST *PAS* IMPACTE (vérifié sur les données de prod)
 * - Points d'élimination : les deux sorties (rang 2 et 3) ont été créditées au MEME
 *   killer (Bruno LAURESTANT). Le swap ne transfère donc aucun point d'élimination
 *   et ne change le total d'aucun autre joueur.
 * - Badges/compteurs bonus (LK/TS/RK) : aucun sur ces deux joueurs.
 * - prizeAmount : tous null sur ce tournoi (aucun gain saisi).
 * - penaltyPoints : liés aux recaves, indépendants du rang.
 *
 * CONTRAINTE TECHNIQUE
 * @@unique([tournamentId, finalRank]) interdit un swap direct (collision transitoire).
 * On passe par un rang temporaire négatif, le tout dans une seule transaction.
 *
 * IMPACT ATTENDU
 *   Nicolas FORTIN   : rang 2->3, rankPoints 1000->700, total 1225 -> 925
 *   Nicolas BEAUSSET : rang 3->2, rankPoints 700->1000, total  875 -> 1175
 *
 * APRES EXECUTION
 * Le classement général de la saison lit les totalPoints STOCKES : ils sont mis à
 * jour ici, donc le classement saison est correct sans étape supplémentaire.
 *
 * USAGE
 *   npx tsx scripts/fix-tournament-8-swap-rank-2-3.ts --dry-run   (aperçu, défaut conseillé)
 *   npx tsx scripts/fix-tournament-8-swap-rank-2-3.ts --apply     (applique réellement)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TOURNAMENT_ID = 'cmtlt457w009ur5k4ft7akxv9';

// Rang temporaire pour contourner @@unique([tournamentId, finalRank])
const TEMP_RANK = -999;

/** Joueur attendu à chaque rang AVANT correction, pour valider qu'on agit sur les bonnes lignes. */
const EXPECTED_BEFORE = {
  rank2: { lastName: 'FORTIN', firstName: 'Nicolas' },
  rank3: { lastName: 'BEAUSSET', firstName: 'Nicolas' },
};

interface DetailedPointsConfig {
  type: 'DETAILED';
  byRank: Record<string, number>;
  rank19Plus: number;
}

type SeasonPoints = {
  detailedPointsConfig?: unknown;
  pointsFirst: number;
  pointsSecond: number;
  pointsThird: number;
  pointsFourth: number;
  pointsFifth: number;
  pointsSixth: number;
  pointsSeventh: number;
  pointsEighth: number;
  pointsNinth: number;
  pointsTenth: number;
  pointsEleventh: number;
  pointsSixteenth: number;
};

/**
 * Même logique que GET/POST /api/tournaments/[id]/results, pour rester cohérent
 * avec l'affichage de la page tournoi et l'export PNG.
 */
function getRankPointsForPosition(rank: number, season: SeasonPoints): number {
  const config = season.detailedPointsConfig as DetailedPointsConfig | null;
  if (config && config.type === 'DETAILED' && config.byRank) {
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) return pointsForRank;
    return config.rank19Plus ?? 0;
  }

  const legacyPointsMap: Record<number, number> = {
    1: season.pointsFirst,
    2: season.pointsSecond,
    3: season.pointsThird,
    4: season.pointsFourth,
    5: season.pointsFifth,
    6: season.pointsSixth,
    7: season.pointsSeventh,
    8: season.pointsEighth,
    9: season.pointsNinth,
    10: season.pointsTenth,
  };

  if (legacyPointsMap[rank] !== undefined) return legacyPointsMap[rank];
  if (rank >= 11 && rank <= 15) return season.pointsEleventh;
  return season.pointsSixteenth;
}

async function main(): Promise<void> {
  const isApply = process.argv.includes('--apply');

  console.log('\n========================================');
  console.log('  FIX TOURNOI #8 - SWAP PLACES 2 / 3');
  console.log('========================================');
  console.log(isApply ? '\n>>> MODE APPLY : les modifications seront écrites' : '\n>>> MODE DRY-RUN : aucune écriture (utiliser --apply pour appliquer)');

  const tournament = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    include: {
      season: true,
      tournamentPlayers: {
        include: { player: true },
        orderBy: { finalRank: 'asc' },
      },
    },
  });

  if (!tournament) throw new Error(`Tournoi ${TOURNAMENT_ID} introuvable.`);
  if (!tournament.season) throw new Error("Le tournoi n'a pas de saison associée.");

  console.log(`\nTournoi : ${tournament.name}`);
  console.log(`Date    : ${tournament.date.toISOString()}`);
  console.log(`Statut  : ${tournament.status} | Type : ${tournament.type}`);
  console.log(`Saison  : ${tournament.season.name}`);

  // --- Récupération des deux lignes concernées ---
  const tp2 = tournament.tournamentPlayers.find((tp) => tp.finalRank === 2);
  const tp3 = tournament.tournamentPlayers.find((tp) => tp.finalRank === 3);

  if (!tp2) throw new Error('Aucun joueur au rang 2.');
  if (!tp3) throw new Error('Aucun joueur au rang 3.');

  // --- Garde-fou : vérifier que ce sont bien les joueurs attendus ---
  const mismatch: string[] = [];
  if (tp2.player.lastName !== EXPECTED_BEFORE.rank2.lastName) {
    mismatch.push(`rang 2 attendu ${EXPECTED_BEFORE.rank2.lastName}, trouvé ${tp2.player.lastName}`);
  }
  if (tp3.player.lastName !== EXPECTED_BEFORE.rank3.lastName) {
    mismatch.push(`rang 3 attendu ${EXPECTED_BEFORE.rank3.lastName}, trouvé ${tp3.player.lastName}`);
  }
  if (mismatch.length > 0) {
    throw new Error(
      `Etat inattendu (la correction a peut-être déjà été appliquée) :\n  - ${mismatch.join('\n  - ')}`
    );
  }

  // --- Calcul des nouveaux points ---
  const season = tournament.season;
  const newRankPointsFor2 = getRankPointsForPosition(2, season); // pour celui qui DEVIENT 2ème
  const newRankPointsFor3 = getRankPointsForPosition(3, season); // pour celui qui DEVIENT 3ème

  // tp2 (FORTIN) descend au rang 3 ; tp3 (BEAUSSET) monte au rang 2.
  // eliminationPoints / bonusPoints / penaltyPoints sont inchangés : seul le rang bouge.
  const plan = [
    {
      tp: tp2,
      newFinalRank: 3,
      newRankPoints: newRankPointsFor3,
      newTotalPoints: newRankPointsFor3 + tp2.eliminationPoints + tp2.bonusPoints + tp2.penaltyPoints,
    },
    {
      tp: tp3,
      newFinalRank: 2,
      newRankPoints: newRankPointsFor2,
      newTotalPoints: newRankPointsFor2 + tp3.eliminationPoints + tp3.bonusPoints + tp3.penaltyPoints,
    },
  ];

  console.log('\n--- TournamentPlayer : changements ---');
  for (const p of plan) {
    const name = `${p.tp.player.firstName} ${p.tp.player.lastName}`;
    console.log(`\n${name}`);
    console.log(`  finalRank   : ${p.tp.finalRank} -> ${p.newFinalRank}`);
    console.log(`  rankPoints  : ${p.tp.rankPoints} -> ${p.newRankPoints}`);
    console.log(`  elimPoints  : ${p.tp.eliminationPoints} (inchangé)`);
    console.log(`  bonusPoints : ${p.tp.bonusPoints} (inchangé)`);
    console.log(`  penalty     : ${p.tp.penaltyPoints} (inchangé)`);
    console.log(`  TOTAL       : ${p.tp.totalPoints} -> ${p.newTotalPoints} (${p.newTotalPoints - p.tp.totalPoints >= 0 ? '+' : ''}${p.newTotalPoints - p.tp.totalPoints})`);
  }

  // --- Eliminations : le rang de sortie y est aussi stocké ---
  const elim2 = await prisma.elimination.findFirst({
    where: { tournamentId: TOURNAMENT_ID, rank: 2 },
    include: { eliminated: true, eliminator: true },
  });
  const elim3 = await prisma.elimination.findFirst({
    where: { tournamentId: TOURNAMENT_ID, rank: 3 },
    include: { eliminated: true, eliminator: true },
  });

  console.log('\n--- Elimination : changements ---');
  if (elim2 && elim3) {
    console.log(`  ${elim2.eliminated.lastName} : rank ${elim2.rank} -> 3`);
    console.log(`  ${elim3.eliminated.lastName} : rank ${elim3.rank} -> 2`);

    const sameKiller = elim2.eliminatorId === elim3.eliminatorId;
    console.log(
      `  Killers : ${elim2.eliminator?.lastName ?? 'aucun'} / ${elim3.eliminator?.lastName ?? 'aucun'}` +
        (sameKiller
          ? ' -> identiques, aucun point d\'élimination à transférer.'
          : ' -> DIFFERENTS : vérifier manuellement les points d\'élimination !')
    );
    if (!sameKiller) {
      console.log('\n  ATTENTION : les deux éliminations ont des killers différents.');
      console.log("  Le swap de rang ne modifie pas qui a éliminé qui, donc les compteurs");
      console.log('  eliminationsCount restent corrects. Aucune action, mais à vérifier.');
    }
  } else {
    console.log('  Elimination rang 2 et/ou 3 absente : rien à faire côté Elimination.');
  }

  if (!isApply) {
    console.log('\n--- DRY-RUN : aucune modification appliquée ---');
    console.log('Relancer avec --apply pour écrire les changements.\n');
    return;
  }

  // --- Application, en une seule transaction ---
  console.log('\n--- Application des modifications ---');

  await prisma.$transaction(async (tx) => {
    // 1. Libérer le rang 2 via un rang temporaire (contrainte unique)
    await tx.tournamentPlayer.update({
      where: { id: tp2.id },
      data: { finalRank: TEMP_RANK },
    });

    // 2. tp3 (BEAUSSET) prend le rang 2
    await tx.tournamentPlayer.update({
      where: { id: tp3.id },
      data: {
        finalRank: 2,
        rankPoints: newRankPointsFor2,
        totalPoints: newRankPointsFor2 + tp3.eliminationPoints + tp3.bonusPoints + tp3.penaltyPoints,
      },
    });

    // 3. tp2 (FORTIN) prend le rang 3
    await tx.tournamentPlayer.update({
      where: { id: tp2.id },
      data: {
        finalRank: 3,
        rankPoints: newRankPointsFor3,
        totalPoints: newRankPointsFor3 + tp2.eliminationPoints + tp2.bonusPoints + tp2.penaltyPoints,
      },
    });

    // 4. Swap des rangs d'élimination (pas de contrainte unique ici, swap direct possible)
    if (elim2 && elim3) {
      await tx.elimination.update({ where: { id: elim2.id }, data: { rank: 3 } });
      await tx.elimination.update({ where: { id: elim3.id }, data: { rank: 2 } });
    }
  });

  console.log('Transaction appliquée.');

  // --- Vérification post-correction ---
  const after = await prisma.tournamentPlayer.findMany({
    where: { tournamentId: TOURNAMENT_ID, finalRank: { in: [1, 2, 3, 4] } },
    include: { player: true },
    orderBy: { finalRank: 'asc' },
  });

  console.log('\n--- Podium après correction ---');
  for (const tp of after) {
    console.log(
      `  #${tp.finalRank} ${(tp.player.firstName + ' ' + tp.player.lastName).padEnd(22)} ` +
        `rank=${tp.rankPoints} elim=${tp.eliminationPoints} bonus=${tp.bonusPoints} ` +
        `pen=${tp.penaltyPoints} TOTAL=${tp.totalPoints}`
    );
  }

  const afterElims = await prisma.elimination.findMany({
    where: { tournamentId: TOURNAMENT_ID, rank: { in: [2, 3] } },
    include: { eliminated: true },
    orderBy: { rank: 'asc' },
  });
  console.log('\n--- Eliminations après correction ---');
  for (const e of afterElims) {
    console.log(`  rank=${e.rank} ${e.eliminated.firstName} ${e.eliminated.lastName}`);
  }

  // Cohérence : aucun rang temporaire ne doit subsister
  const leftover = await prisma.tournamentPlayer.count({
    where: { tournamentId: TOURNAMENT_ID, finalRank: TEMP_RANK },
  });
  if (leftover > 0) {
    throw new Error(`${leftover} joueur(s) encore au rang temporaire ${TEMP_RANK} !`);
  }

  console.log('\nCorrection terminée avec succès.\n');
}

main()
  .catch((e) => {
    console.error('\nERREUR :', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
