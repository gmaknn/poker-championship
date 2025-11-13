const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testLeaderboardAPI() {
  try {
    // Trouver la saison active
    const activeSeason = await prisma.season.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!activeSeason) {
      console.log('❌ Aucune saison active trouvée');
      return;
    }

    console.log('📊 Saison active:', activeSeason.name);
    console.log('   ID:', activeSeason.id);

    // Simuler ce que l'API /api/seasons/[id]/leaderboard retourne
    const season = await prisma.season.findUnique({
      where: { id: activeSeason.id },
      include: {
        tournaments: {
          where: {
            status: 'FINISHED',
          },
          include: {
            tournamentPlayers: {
              include: {
                player: true,
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    console.log(`\n🏁 Tournois terminés: ${season.tournaments.length}`);
    season.tournaments.forEach(t => {
      console.log(`  - ${t.name}: ${t.tournamentPlayers.length} joueurs`);
    });

    // Build player statistics
    const playerStatsMap = new Map();

    for (const tournament of season.tournaments) {
      for (const tp of tournament.tournamentPlayers) {
        if (!tp.player) continue;

        let playerStats = playerStatsMap.get(tp.playerId);

        if (!playerStats) {
          playerStats = {
            playerId: tp.playerId,
            player: {
              id: tp.player.id,
              firstName: tp.player.firstName,
              lastName: tp.player.lastName,
              nickname: tp.player.nickname,
              avatar: tp.player.avatar,
            },
            tournamentsPlayed: 0,
            tournamentsCount: 0,
            totalPoints: 0,
            bestResult: null,
            averagePoints: 0,
            victories: 0,
            podiums: 0,
            totalEliminations: 0,
            totalLeaderKills: 0,
            totalRebuys: 0,
            performances: [],
          };
          playerStatsMap.set(tp.playerId, playerStats);
        }

        playerStats.performances.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          tournamentDate: tournament.date,
          finalRank: tp.finalRank,
          totalPoints: tp.totalPoints,
          eliminationsCount: tp.eliminationsCount,
          leaderKills: tp.leaderKills,
          rebuysCount: tp.rebuysCount,
        });

        playerStats.tournamentsPlayed++;
        playerStats.totalEliminations += tp.eliminationsCount;
        playerStats.totalLeaderKills += tp.leaderKills;
        playerStats.totalRebuys += tp.rebuysCount;

        if (tp.finalRank !== null) {
          if (playerStats.bestResult === null || tp.finalRank < playerStats.bestResult) {
            playerStats.bestResult = tp.finalRank;
          }

          if (tp.finalRank === 1) playerStats.victories++;
          if (tp.finalRank <= 3) playerStats.podiums++;
        }
      }
    }

    // Apply "best performances" system
    const bestTournamentsCount = season.bestTournamentsCount;

    for (const playerStats of playerStatsMap.values()) {
      playerStats.performances.sort((a, b) => b.totalPoints - a.totalPoints);

      let performancesToCount = playerStats.performances;
      if (bestTournamentsCount && bestTournamentsCount > 0) {
        performancesToCount = playerStats.performances.slice(0, bestTournamentsCount);
      }

      playerStats.totalPoints = performancesToCount.reduce(
        (sum, perf) => sum + perf.totalPoints,
        0
      );
      playerStats.tournamentsCount = performancesToCount.length;

      playerStats.averagePoints =
        playerStats.tournamentsCount > 0
          ? Math.round(playerStats.totalPoints / playerStats.tournamentsCount)
          : 0;
    }

    // Convert to array and sort
    const leaderboard = Array.from(playerStatsMap.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints
    );

    console.log(`\n🏆 Classement (${leaderboard.length} joueurs):`);
    leaderboard.slice(0, 5).forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.player.nickname}: ${player.totalPoints} pts (${player.tournamentsCount} tournois)`);
    });

    if (leaderboard.length > 0) {
      console.log(`\n✅ Leader: ${leaderboard[0].player.nickname} avec ${leaderboard[0].totalPoints} points`);
    } else {
      console.log('\n⚠️ Aucun joueur dans le classement');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testLeaderboardAPI();
