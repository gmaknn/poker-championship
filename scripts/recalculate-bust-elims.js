/**
 * Script to recalculate elimination points including bustEliminations
 * Run on Fly: node scripts/recalculate-bust-elims.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Type for detailed points configuration
function getRankPointsForPosition(rank, season) {
  const config = season.detailedPointsConfig;
  if (config && config.type === 'DETAILED' && config.byRank) {
    const pointsForRank = config.byRank[String(rank)];
    if (pointsForRank !== undefined) {
      return pointsForRank;
    }
    return config.rank19Plus ?? 0;
  }

  const legacyPointsMap = {
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

  if (legacyPointsMap[rank] !== undefined) {
    return legacyPointsMap[rank];
  }

  if (rank >= 11 && rank <= 15) {
    return season.pointsEleventh;
  }

  return season.pointsSixteenth;
}

async function main() {
  console.log('\n🔄 Recalculating elimination points (including bustEliminations)...\n');

  // Get the current active season with all FINISHED tournaments
  const season = await prisma.season.findFirst({
    where: { isActive: true },
    include: {
      tournaments: {
        where: { status: 'FINISHED', type: 'CHAMPIONSHIP' },
        include: {
          tournamentPlayers: {
            include: {
              player: { select: { firstName: true, lastName: true, nickname: true } }
            }
          }
        }
      }
    }
  });

  if (!season) {
    console.log('No active season found');
    return;
  }

  console.log('Season:', season.name);
  console.log('eliminationPoints:', season.eliminationPoints, 'pts');
  console.log('bustEliminationBonus:', season.bustEliminationBonus, 'pts');
  console.log('Tournaments:', season.tournaments.length);
  console.log('---\n');

  let totalUpdated = 0;

  for (const tournament of season.tournaments) {
    console.log(`\n📋 ${tournament.name}`);

    for (const tp of tournament.tournamentPlayers) {
      const name = tp.player.nickname || `${tp.player.firstName} ${tp.player.lastName}`;

      let rankPoints = 0;
      let eliminationPoints = 0;
      let bonusPoints = 0;

      if (tp.finalRank !== null) {
        rankPoints = getRankPointsForPosition(tp.finalRank, season);

        // Points d'élimination (finales + bust)
        const finalElimPoints = tp.eliminationsCount * season.eliminationPoints;
        const bustElimPoints = tp.bustEliminations * season.bustEliminationBonus;
        eliminationPoints = finalElimPoints + bustElimPoints;

        bonusPoints = tp.leaderKills * season.leaderKillerBonus;
      }

      const totalPoints = rankPoints + eliminationPoints + bonusPoints + tp.penaltyPoints;

      // Check if update needed
      if (
        tp.rankPoints !== rankPoints ||
        tp.eliminationPoints !== eliminationPoints ||
        tp.bonusPoints !== bonusPoints ||
        tp.totalPoints !== totalPoints
      ) {
        console.log(`  ${name} (Rank ${tp.finalRank}):`);
        console.log(`    bustElims=${tp.bustEliminations} (${tp.bustEliminations * season.bustEliminationBonus}pts), finalElims=${tp.eliminationsCount} (${tp.eliminationsCount * season.eliminationPoints}pts)`);
        console.log(`    Old elimPts: ${tp.eliminationPoints} → New: ${eliminationPoints}`);
        console.log(`    Old total: ${tp.totalPoints} → New: ${totalPoints}`);

        await prisma.tournamentPlayer.update({
          where: {
            tournamentId_playerId: {
              tournamentId: tournament.id,
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

        totalUpdated++;
      }
    }
  }

  console.log(`\n✅ Updated ${totalUpdated} players\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
