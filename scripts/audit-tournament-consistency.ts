/**
 * Audit (lecture seule) : pour chaque tournoi terminé, compare les points/compteurs stockés
 * au recalcul de l'écran "Corriger" (src/lib/tournament-corrections.ts).
 * Un écart signifie que la première correction de ce tournoi modifiera aussi ces valeurs.
 *
 * Usage (sur une COPIE locale de la prod, cf. npm run backup:prod) :
 *   DATABASE_URL="file:../backups/<horodatage>/dev.db" npx tsx scripts/audit-tournament-consistency.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  buildStateFromDb,
  computeCorrectedResults,
  diffPlayers,
  validateCorrectionState,
} from '../src/lib/tournament-corrections';

const prisma = new PrismaClient();

async function main() {
  const tournaments = await prisma.tournament.findMany({
    where: { status: 'FINISHED' },
    orderBy: { date: 'asc' },
    include: {
      season: true,
      tournamentPlayers: { include: { player: true } },
      eliminations: true,
      bustEvents: true,
    },
  });

  let clean = 0;
  for (const t of tournaments) {
    const name = new Map(t.tournamentPlayers.map((tp) => [tp.playerId, `${tp.player.firstName} ${tp.player.lastName}`]));
    const nameOf = (id: string) => name.get(id) ?? id;
    const { state, warnings } = buildStateFromDb(t.tournamentPlayers, t.eliminations, t.bustEvents);
    const playerIds = t.tournamentPlayers.map((tp) => tp.playerId);
    const errors = validateCorrectionState(state, playerIds, nameOf);

    const header = `\n### ${t.name} (${t.date.toISOString().slice(0, 10)}, ${t.type}, ${playerIds.length} joueurs)`;
    if (warnings.length || errors.length) {
      console.log(header);
      for (const w of warnings) console.log(`  ⚠ ${w}`);
      for (const e of errors) console.log(`  ✖ ${e}`);
      continue;
    }

    const storedPrizeByRank: Record<number, number | null> = {};
    const storedPoints: Record<string, { rankPoints: number; eliminationPoints: number; bonusPoints: number; totalPoints: number }> = {};
    for (const tp of t.tournamentPlayers) {
      if (tp.finalRank !== null) storedPrizeByRank[tp.finalRank] = tp.prizeAmount;
      storedPoints[tp.playerId] = tp;
    }
    const computed = computeCorrectedResults(state, {
      type: t.type,
      season: t.season,
      seasonLeaderAtStartId: t.seasonLeaderAtStartId,
      seasonTopSharkAtStartId: t.seasonTopSharkAtStartId,
      randomTargetPlayerId: t.randomTargetPlayerId,
      storedPrizeByRank,
      storedPoints,
      playerIds,
    });
    const diff = diffPlayers(t.tournamentPlayers.map((tp) => ({ ...tp })), computed.players);

    // Drapeaux bonus des lignes Elimination (non visibles dans le diff joueurs)
    const flagDiffs = computed.exits.filter((e) => {
      const row = t.eliminations.find((r) => r.id === e.id);
      return row && (row.isLeaderKill !== e.isLeaderKill || row.isTopSharkLeaderKill !== e.isTopSharkLeaderKill || row.isRandomTargetKill !== e.isRandomTargetKill);
    });

    if (diff.length === 0 && flagDiffs.length === 0) {
      clean++;
      continue;
    }
    console.log(header);
    for (const d of diff) {
      console.log(`  ${nameOf(d.playerId)} : ` + d.changes.map((c) => `${c.field} ${c.before} → ${c.after}`).join(', '));
    }
    for (const e of flagDiffs) console.log(`  drapeau bonus sur la sortie de ${nameOf(e.eliminatedId)} serait recalculé`);
  }

  console.log(`\n${clean}/${tournaments.length} tournoi(s) terminé(s) parfaitement cohérent(s).`);
}

main().finally(() => prisma.$disconnect());
