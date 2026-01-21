/**
 * Script to recalculate prize amounts for a tournament
 * Usage: node scripts/recalculate-tournament-prizes.js <tournamentId>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tournamentId = process.argv[2] || 'cmkh7blnu0001r5k32m5a0td6'; // Default to Tournament #1

  console.log(`Recalculating prizes for tournament: ${tournamentId}`);

  // Get tournament with prize pool config
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      prizePayoutPercents: true,
      prizePayoutCount: true,
    },
  });

  if (!tournament) {
    console.error('Tournament not found');
    process.exit(1);
  }

  console.log(`Tournament: ${tournament.name}`);

  // Get prize amounts (stored as JSON array - they're actually amounts, not percents)
  const prizeAmounts = tournament.prizePayoutPercents || [];
  console.log(`Prize amounts: ${JSON.stringify(prizeAmounts)}`);

  if (prizeAmounts.length === 0) {
    console.error('No prize pool configured for this tournament');
    process.exit(1);
  }

  // Get all tournament players
  const tournamentPlayers = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    include: {
      player: {
        select: {
          nickname: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  console.log(`Found ${tournamentPlayers.length} players`);

  // Update prizeAmount for each player based on their final rank
  for (const tp of tournamentPlayers) {
    let prizeAmount = null;
    if (tp.finalRank !== null && tp.finalRank >= 1 && tp.finalRank <= prizeAmounts.length) {
      prizeAmount = prizeAmounts[tp.finalRank - 1];
    }

    await prisma.tournamentPlayer.update({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId: tp.playerId,
        },
      },
      data: { prizeAmount },
    });

    const playerName = tp.player.nickname || `${tp.player.firstName} ${tp.player.lastName}`;
    if (prizeAmount) {
      console.log(`  Rank ${tp.finalRank}: ${playerName} -> ${prizeAmount}€`);
    }
  }

  console.log('\nDone! Prize amounts updated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
