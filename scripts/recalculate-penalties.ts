/**
 * Script to recalculate penalty points for a tournament
 * Usage: npx tsx scripts/recalculate-penalties.ts <tournamentId>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RecavePenaltyRules {
  freeRebuysCount: number;
  penaltyPerUnit: number;
}

function computeRecavePenalty(
  totalRebuys: number,
  lightRebuyUsed: boolean,
  rules: RecavePenaltyRules
): number {
  // Light rebuy compte comme 0.5 recave équivalente
  const recavesEquivalentes = totalRebuys + (lightRebuyUsed ? 0.5 : 0);

  // Nombre de recaves payantes (au-delà des gratuites)
  const recavesPayantes = Math.max(0, recavesEquivalentes - rules.freeRebuysCount);

  // Si pas de recaves payantes, retourner 0
  if (recavesPayantes === 0) {
    return 0;
  }

  // Total: arrondi pour éviter les problèmes de virgule flottante
  return Math.round(recavesPayantes * -rules.penaltyPerUnit);
}

async function main() {
  const tournamentId = process.argv[2];

  if (!tournamentId) {
    console.error('Usage: npx tsx scripts/recalculate-penalties.ts <tournamentId>');
    process.exit(1);
  }

  console.log(`\n🔄 Recalculating penalties for tournament: ${tournamentId}\n`);

  // Get tournament with season and players
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      season: true,
      tournamentPlayers: {
        include: {
          player: {
            select: {
              firstName: true,
              lastName: true,
              nickname: true,
            },
          },
        },
      },
    },
  });

  if (!tournament) {
    console.error('Tournament not found');
    process.exit(1);
  }

  if (!tournament.season) {
    console.error('Tournament has no season');
    process.exit(1);
  }

  console.log(`📋 Tournament: ${tournament.name}`);
  console.log(`📅 Season: ${tournament.season.name}`);
  console.log(`👥 Players: ${tournament.tournamentPlayers.length}`);
  console.log(`🎁 Free rebuys: ${tournament.season.freeRebuysCount}`);
  console.log(`💰 Penalty per rebuy: ${tournament.season.rebuyPenaltyTier1} pts\n`);

  const rules: RecavePenaltyRules = {
    freeRebuysCount: tournament.season.freeRebuysCount,
    penaltyPerUnit: Math.abs(tournament.season.rebuyPenaltyTier1),
  };

  let updated = 0;

  for (const tp of tournament.tournamentPlayers) {
    const playerName = tp.player.nickname || `${tp.player.firstName} ${tp.player.lastName}`;

    const newPenalty = computeRecavePenalty(
      tp.rebuysCount,
      tp.lightRebuyUsed,
      rules
    );

    const oldPenalty = tp.penaltyPoints;

    if (oldPenalty !== newPenalty) {
      console.log(`  ${playerName}:`);
      console.log(`    Rebuys: ${tp.rebuysCount}, Light: ${tp.lightRebuyUsed}`);
      console.log(`    Old penalty: ${oldPenalty} → New penalty: ${newPenalty}`);

      // Update penalty points
      await prisma.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: tp.playerId,
          },
        },
        data: {
          penaltyPoints: newPenalty,
        },
      });

      updated++;
    }
  }

  console.log(`\n✅ Updated ${updated} players' penalties\n`);

  // Now recalculate total points
  console.log('📊 Recalculating total points...\n');

  const season = tournament.season;

  // Get detailed points config if available
  const detailedConfig = season.detailedPointsConfig as { type: string; byRank: Record<string, number>; rank19Plus: number } | null;

  function getRankPoints(rank: number): number {
    if (detailedConfig?.type === 'DETAILED' && detailedConfig.byRank) {
      const points = detailedConfig.byRank[String(rank)];
      if (points !== undefined) return points;
      return detailedConfig.rank19Plus ?? 0;
    }

    const legacyMap: Record<number, number> = {
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

    if (legacyMap[rank] !== undefined) return legacyMap[rank];
    if (rank >= 11 && rank <= 15) return season.pointsEleventh;
    return season.pointsSixteenth;
  }

  // Refresh tournament players after penalty update
  const refreshedPlayers = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: {
          firstName: true,
          lastName: true,
          nickname: true,
        },
      },
    },
  });

  for (const tp of refreshedPlayers) {
    const playerName = tp.player.nickname || `${tp.player.firstName} ${tp.player.lastName}`;

    let rankPoints = 0;
    let eliminationPoints = 0;
    let bonusPoints = 0;

    if (tp.finalRank !== null) {
      rankPoints = getRankPoints(tp.finalRank);
      // Points d'élimination: finales + bust
      const finalElimPoints = tp.eliminationsCount * season.eliminationPoints;
      const bustElimPoints = tp.bustEliminations * season.bustEliminationBonus;
      eliminationPoints = finalElimPoints + bustElimPoints;
      bonusPoints = tp.leaderKills * season.leaderKillerBonus;
    }

    const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

    if (
      tp.rankPoints !== rankPoints ||
      tp.eliminationPoints !== eliminationPoints ||
      tp.bonusPoints !== bonusPoints ||
      tp.totalPoints !== totalPoints
    ) {
      console.log(`  ${playerName} (Rank ${tp.finalRank}):`);
      console.log(`    Rank: ${rankPoints}, Elim: ${eliminationPoints}, Bonus: ${bonusPoints}, Penalty: ${tp.penaltyPoints}`);
      console.log(`    Old total: ${tp.totalPoints} → New total: ${totalPoints}`);

      await prisma.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: tp.playerId,
          },
        },
        data: {
          rankPoints,
          eliminationPoints,
          bonusPoints,
          totalPoints,
        },
      });
    }
  }

  console.log('\n✅ Done!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
