/**
 * Fix TOURNOI #9 | 25/09/2026 - Titre + ordre de sortie MAQUENHEN / PROST
 *
 * CONTEXTE
 * 1. Le tournoi a été créé par duplication : son titre est
 *    "TOURNOI #9 | 25/09/2026 (copie)" au lieu de "TOURNOI #9 | 25/09/2026".
 * 2. Grégory MAQUENHEN a été éliminé AVANT Evie PROST, mais la saisie a fait
 *    l'inverse : MAQUENHEN a donc actuellement un meilleur classement que PROST.
 *
 * PORTEE DE LA CORRECTION
 * 1. Tournament.name                : suppression du suffixe " (copie)"
 * 2. TournamentPlayer.finalRank     : swap des rangs des deux joueurs
 * 3. Elimination.rank               : swap des rangs de sortie
 * 4. Recalcul rankPoints + totalPoints des deux joueurs
 *
 * CE QUI N'EST *PAS* IMPACTE
 * - Qui a éliminé qui (eliminatorId) : inchangé, donc eliminationPoints,
 *   eliminationsCount et bonus LK/TS/RK des killers restent corrects.
 * - penaltyPoints : liés aux recaves, indépendants du rang.
 * - prizeAmount : affiché par le script ; si l'un des deux est payé, le script
 *   s'arrête (le gain doit suivre le rang, à traiter à la main).
 *
 * GARDE-FOUS (le script s'arrête sans rien écrire si l'un échoue)
 * - Exactement un tournoi porte le titre "(copie)" OU le titre cible (si le titre
 *   a déjà été corrigé dans l'UI, seul le swap est appliqué).
 * - Les deux joueurs sont classés, à des rangs CONSECUTIFS, et MAQUENHEN est
 *   actuellement le mieux classé des deux (sinon la correction est déjà faite).
 * - Aucun des deux n'est 1er (pas de ligne Elimination pour le vainqueur).
 *
 * CONTRAINTE TECHNIQUE
 * @@unique([tournamentId, finalRank]) interdit un swap direct (collision transitoire).
 * On passe par un rang temporaire négatif, le tout dans une seule transaction.
 *
 * APRES EXECUTION
 * Le classement général de la saison lit les totalPoints STOCKES : ils sont mis à
 * jour ici, donc le classement saison est correct sans étape supplémentaire.
 *
 * USAGE (sur la machine Fly : fly ssh console, puis cd /app)
 *   npx tsx scripts/fix-tournament-9-rename-and-swap-maquenhen-prost.ts --dry-run
 *   npx tsx scripts/fix-tournament-9-rename-and-swap-maquenhen-prost.ts --apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CURRENT_NAME = 'TOURNOI #9 | 25/09/2026 (copie)';
const TARGET_NAME = 'TOURNOI #9 | 25/09/2026';

/** Joueur éliminé EN PREMIER (doit finir moins bien classé). */
const OUT_FIRST = { firstName: 'Grégory', lastName: 'MAQUENHEN' };
/** Joueur éliminé ENSUITE (doit finir mieux classé). */
const OUT_LATER = { firstName: 'Evie', lastName: 'PROST' };

// Rang temporaire pour contourner @@unique([tournamentId, finalRank])
const TEMP_RANK = -999;

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

/** Comparaison insensible à la casse et aux accents (Grégory / Gregory). */
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
}

async function main(): Promise<void> {
  const isApply = process.argv.includes('--apply');

  console.log('\n========================================');
  console.log('  FIX TOURNOI #9 - TITRE + SWAP MAQUENHEN / PROST');
  console.log('========================================');
  console.log(isApply ? '\n>>> MODE APPLY : les modifications seront écrites' : '\n>>> MODE DRY-RUN : aucune écriture (utiliser --apply pour appliquer)');

  // --- Tournoi ---
  // Le titre a pu être corrigé à la main dans l'UI : on accepte l'un ou l'autre, mais un seul tournoi.
  const candidates = await prisma.tournament.findMany({
    where: { name: { in: [CURRENT_NAME, TARGET_NAME] } },
    select: { id: true, name: true, status: true },
  });
  if (candidates.length !== 1) {
    throw new Error(
      `${candidates.length} tournoi(s) nommé(s) "${CURRENT_NAME}" ou "${TARGET_NAME}" (1 attendu) : ` +
        `${candidates.map((t) => `${t.id} "${t.name}" (${t.status})`).join(', ') || 'aucun'}.`
    );
  }

  const tournamentId = candidates[0].id;
  const needsRename = candidates[0].name !== TARGET_NAME;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      season: true,
      tournamentPlayers: {
        include: { player: true },
        orderBy: { finalRank: 'asc' },
      },
    },
  });

  if (!tournament) throw new Error(`Tournoi ${tournamentId} introuvable.`);
  if (!tournament.season) throw new Error("Le tournoi n'a pas de saison associée.");

  console.log(`\nTournoi : ${tournament.name} (${tournament.id})`);
  console.log(`Date    : ${tournament.date.toISOString()}`);
  console.log(`Statut  : ${tournament.status} | Type : ${tournament.type}`);
  console.log(`Saison  : ${tournament.season.name}`);
  console.log(`\n--- Titre ---\n  ${needsRename ? `"${tournament.name}" -> "${TARGET_NAME}"` : 'déjà correct (inchangé)'}`);

  // --- Les deux joueurs ---
  const findTp = (who: { firstName: string; lastName: string }) => {
    const matches = tournament.tournamentPlayers.filter(
      (tp) => normalize(tp.player.lastName) === normalize(who.lastName) && normalize(tp.player.firstName) === normalize(who.firstName)
    );
    if (matches.length !== 1) {
      throw new Error(`${matches.length} inscription(s) trouvée(s) pour ${who.firstName} ${who.lastName} (1 attendue).`);
    }
    return matches[0];
  };

  const tpOutFirst = findTp(OUT_FIRST); // MAQUENHEN : doit DESCENDRE
  const tpOutLater = findTp(OUT_LATER); // PROST : doit MONTER

  const rankOutFirst = tpOutFirst.finalRank;
  const rankOutLater = tpOutLater.finalRank;

  if (rankOutFirst === null || rankOutLater === null) {
    throw new Error(`Rang manquant : ${OUT_FIRST.lastName}=${rankOutFirst}, ${OUT_LATER.lastName}=${rankOutLater}.`);
  }
  if (rankOutFirst > rankOutLater) {
    throw new Error(
      `${OUT_FIRST.lastName} est déjà classé derrière ${OUT_LATER.lastName} (${rankOutFirst} vs ${rankOutLater}) : correction déjà appliquée ?`
    );
  }
  if (rankOutLater - rankOutFirst !== 1) {
    throw new Error(
      `Rangs non consécutifs (${OUT_FIRST.lastName}=${rankOutFirst}, ${OUT_LATER.lastName}=${rankOutLater}) : ` +
        "un simple swap décalerait mal les joueurs intermédiaires, à traiter à la main."
    );
  }
  if (rankOutFirst === 1) {
    throw new Error(`${OUT_FIRST.lastName} est 1er : pas de ligne Elimination pour le vainqueur, à traiter à la main.`);
  }
  if (tpOutFirst.prizeAmount || tpOutLater.prizeAmount) {
    throw new Error(
      `Gains saisis (${OUT_FIRST.lastName}=${tpOutFirst.prizeAmount}, ${OUT_LATER.lastName}=${tpOutLater.prizeAmount}) : ` +
        'le gain doit suivre le rang, à traiter à la main.'
    );
  }

  // --- Calcul des nouveaux points ---
  const season = tournament.season;
  // MAQUENHEN prend le rang de PROST (moins bon) et inversement.
  const plan = [
    { tp: tpOutFirst, newFinalRank: rankOutLater },
    { tp: tpOutLater, newFinalRank: rankOutFirst },
  ].map((p) => {
    const newRankPoints = getRankPointsForPosition(p.newFinalRank, season);
    return {
      ...p,
      newRankPoints,
      newTotalPoints: newRankPoints + p.tp.eliminationPoints + p.tp.bonusPoints + p.tp.penaltyPoints,
    };
  });

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
  const elimOutFirst = await prisma.elimination.findFirst({
    where: { tournamentId, eliminatedId: tpOutFirst.playerId, rank: rankOutFirst },
    include: { eliminated: true, eliminator: true },
  });
  const elimOutLater = await prisma.elimination.findFirst({
    where: { tournamentId, eliminatedId: tpOutLater.playerId, rank: rankOutLater },
    include: { eliminated: true, eliminator: true },
  });

  console.log('\n--- Elimination : changements ---');
  if (elimOutFirst && elimOutLater) {
    console.log(`  ${elimOutFirst.eliminated.lastName} : rank ${elimOutFirst.rank} -> ${rankOutLater} (killer ${elimOutFirst.eliminator?.lastName ?? 'aucun'})`);
    console.log(`  ${elimOutLater.eliminated.lastName} : rank ${elimOutLater.rank} -> ${rankOutFirst} (killer ${elimOutLater.eliminator?.lastName ?? 'aucun'})`);
    console.log("  Les killers ne changent pas : points d'élimination et bonus inchangés.");
  } else {
    console.log(
      `  Ligne(s) Elimination absente(s) (${OUT_FIRST.lastName}: ${elimOutFirst ? 'ok' : 'absente'}, ` +
        `${OUT_LATER.lastName}: ${elimOutLater ? 'ok' : 'absente'}) : seules les lignes présentes seront mises à jour.`
    );
  }

  if (!isApply) {
    console.log('\n--- DRY-RUN : aucune modification appliquée ---');
    console.log('Relancer avec --apply pour écrire les changements.\n');
    return;
  }

  // --- Application, en une seule transaction ---
  console.log('\n--- Application des modifications ---');

  await prisma.$transaction(async (tx) => {
    if (needsRename) {
      await tx.tournament.update({ where: { id: tournamentId }, data: { name: TARGET_NAME } });
    }

    // 1. Libérer le rang de MAQUENHEN via un rang temporaire (contrainte unique)
    await tx.tournamentPlayer.update({ where: { id: tpOutFirst.id }, data: { finalRank: TEMP_RANK } });

    // 2. PROST prend le meilleur rang, puis MAQUENHEN le rang libéré par PROST
    for (const p of [plan[1], plan[0]]) {
      await tx.tournamentPlayer.update({
        where: { id: p.tp.id },
        data: { finalRank: p.newFinalRank, rankPoints: p.newRankPoints, totalPoints: p.newTotalPoints },
      });
    }

    // 3. Swap des rangs d'élimination (pas de contrainte unique ici)
    if (elimOutFirst) await tx.elimination.update({ where: { id: elimOutFirst.id }, data: { rank: rankOutLater } });
    if (elimOutLater) await tx.elimination.update({ where: { id: elimOutLater.id }, data: { rank: rankOutFirst } });
  });

  console.log('Transaction appliquée.');

  // --- Vérification post-correction ---
  const after = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      tournamentPlayers: {
        where: { finalRank: { gte: rankOutFirst - 1, lte: rankOutLater + 1 } },
        include: { player: true },
        orderBy: { finalRank: 'asc' },
      },
    },
  });

  console.log(`\n--- Après correction : ${after?.name} ---`);
  for (const tp of after?.tournamentPlayers ?? []) {
    console.log(
      `  #${tp.finalRank} ${(tp.player.firstName + ' ' + tp.player.lastName).padEnd(22)} ` +
        `rank=${tp.rankPoints} elim=${tp.eliminationPoints} bonus=${tp.bonusPoints} ` +
        `pen=${tp.penaltyPoints} TOTAL=${tp.totalPoints}`
    );
  }

  const leftover = await prisma.tournamentPlayer.count({ where: { tournamentId, finalRank: TEMP_RANK } });
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
