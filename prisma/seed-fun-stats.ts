/**
 * Script de seed pour les FUN STATS
 * Génère des données de test pour tester les badges et statistiques ludiques
 *
 * Usage: npx ts-node prisma/seed-fun-stats.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎮 Début du seeding pour les Fun Stats...\n');

  // Récupérer la saison active et les joueurs
  const activeSeason = await prisma.season.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
  });

  if (!activeSeason) {
    console.error('❌ Aucune saison active trouvée');
    return;
  }

  const players = await prisma.player.findMany({
    where: { status: 'ACTIVE' },
  });

  if (players.length < 10) {
    console.error('❌ Pas assez de joueurs (minimum 10)');
    return;
  }

  console.log(`✅ Saison: ${activeSeason.name} ${activeSeason.year}`);
  console.log(`✅ ${players.length} joueurs disponibles\n`);

  // Joueur vedette qui va débloquer beaucoup de badges
  const starPlayer = players[0];
  console.log(`⭐ Joueur vedette: ${starPlayer.firstName} ${starPlayer.lastName}\n`);

  // Créer 12 tournois terminés pour cette saison
  console.log('🎰 Création de 12 tournois terminés...\n');

  const tournaments = [];
  const dates = [
    '2024-09-15', '2024-10-01', '2024-10-15', '2024-11-01',
    '2024-11-15', '2024-12-01', '2024-12-15', '2025-01-05',
    '2025-01-19', '2025-02-02', '2025-02-16', '2025-03-01',
  ];

  for (let i = 0; i < 12; i++) {
    const tournament = await prisma.tournament.create({
      data: {
        name: `Tournoi #${i + 1} - Fun Stats`,
        seasonId: activeSeason.id,
        date: new Date(`${dates[i]}T20:00:00`),
        status: 'FINISHED',
        buyInAmount: 20,
        startingChips: 10000,
        targetDuration: 180,
        levelDuration: 12,
        totalPlayers: 15 + Math.floor(Math.random() * 5),
        prizePool: 300 + Math.floor(Math.random() * 100),
        finishedAt: new Date(`${dates[i]}T23:30:00`),
      },
    });
    tournaments.push(tournament);
    console.log(`  ✅ ${tournament.name} créé`);
  }

  console.log('\n📊 Génération des résultats...\n');

  // Configuration pour le joueur vedette
  const starResults = [
    { rank: 1, eliminations: 5, rebuys: 0 },   // Victoire Iron Man
    { rank: 1, eliminations: 4, rebuys: 2 },   // Victoire avec comeback
    { rank: 2, eliminations: 3, rebuys: 1 },   // Podium
    { rank: 1, eliminations: 7, rebuys: 1 },   // Victoire + tournoi meurtrier
    { rank: 3, eliminations: 2, rebuys: 0 },   // Podium
    { rank: 2, eliminations: 4, rebuys: 0 },   // Podium
    { rank: 1, eliminations: 6, rebuys: 3 },   // Victoire comeback
    { rank: 3, eliminations: 3, rebuys: 1 },   // Podium
    { rank: 4, eliminations: 2, rebuys: 2 },   // Bubble boy
    { rank: 2, eliminations: 5, rebuys: 0 },   // Podium
    { rank: 1, eliminations: 4, rebuys: 0 },   // Victoire
    { rank: 3, eliminations: 2, rebuys: 1 },   // Podium
  ];

  // Créer les résultats pour chaque tournoi
  for (let i = 0; i < tournaments.length; i++) {
    const tournament = tournaments[i];
    const playerCount = tournament.totalPlayers || 15;

    console.log(`  🎯 ${tournament.name}:`);

    // Mélanger les joueurs
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const selectedPlayers = shuffled.slice(0, playerCount);

    // Placer notre joueur vedette avec les stats configurées
    const starData = starResults[i];
    const starRank = starData.rank;

    // Créer les autres participants
    const rankings: Array<{
      player: any;
      rank: number;
      eliminations: number;
      leaderKills: number;
      rebuys: number;
    }> = [];

    for (let rank = 1; rank <= playerCount; rank++) {
      if (rank === starRank) {
        rankings.push({
          player: starPlayer,
          rank: starRank,
          eliminations: starData.eliminations,
          leaderKills: Math.min(starData.eliminations, Math.floor(Math.random() * 2) + 1),
          rebuys: starData.rebuys,
        });
      } else {
        const player = selectedPlayers.find(p => p.id !== starPlayer.id && !rankings.some(r => r.player.id === p.id)) || selectedPlayers[rank - 1];
        rankings.push({
          player,
          rank,
          eliminations: Math.floor(Math.random() * 4),
          leaderKills: Math.random() > 0.8 ? 1 : 0,
          rebuys: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
        });
      }
    }

    // Créer les TournamentPlayers
    for (const { player, rank, eliminations, leaderKills, rebuys } of rankings) {
      const pointsMap: Record<number, number> = {
        1: activeSeason.pointsFirst,
        2: activeSeason.pointsSecond,
        3: activeSeason.pointsThird,
        4: activeSeason.pointsFourth,
        5: activeSeason.pointsFifth,
        6: activeSeason.pointsSixth,
        7: activeSeason.pointsSeventh,
        8: activeSeason.pointsEighth,
        9: activeSeason.pointsNinth,
        10: activeSeason.pointsTenth,
        11: activeSeason.pointsEleventh,
      };

      const rankPoints = rank <= 11 ? pointsMap[rank] : (rank <= 16 ? activeSeason.pointsSixteenth : 0);
      const eliminationPoints = eliminations * activeSeason.eliminationPoints;
      const bonusPoints = leaderKills * activeSeason.leaderKillerBonus;

      let penaltyPoints = 0;
      if (rebuys === 3) penaltyPoints = activeSeason.rebuyPenaltyTier1;
      else if (rebuys === 4) penaltyPoints = activeSeason.rebuyPenaltyTier2;
      else if (rebuys >= 5) penaltyPoints = activeSeason.rebuyPenaltyTier3;

      const totalPoints = rankPoints + eliminationPoints + bonusPoints + penaltyPoints;

      let prizeAmount = null;
      if (rank === 1 && tournament.prizePool) prizeAmount = tournament.prizePool * 0.5;
      else if (rank === 2 && tournament.prizePool) prizeAmount = tournament.prizePool * 0.3;
      else if (rank === 3 && tournament.prizePool) prizeAmount = tournament.prizePool * 0.2;

      await prisma.tournamentPlayer.create({
        data: {
          tournamentId: tournament.id,
          playerId: player.id,
          finalRank: rank,
          rebuysCount: rebuys,
          eliminationsCount: eliminations,
          leaderKills,
          rankPoints,
          eliminationPoints,
          bonusPoints,
          penaltyPoints,
          totalPoints,
          prizeAmount,
        },
      });
    }

    // Créer les éliminations
    // Les 5 derniers sont éliminés
    for (let j = playerCount - 5; j < playerCount; j++) {
      const eliminated = rankings[j];
      const eliminator = rankings[Math.floor(Math.random() * (playerCount - 5))];

      if (eliminator && eliminated) {
        await prisma.elimination.create({
          data: {
            tournamentId: tournament.id,
            eliminatorId: eliminator.player.id,
            eliminatedId: eliminated.player.id,
            rank: eliminated.rank,
            level: Math.floor(Math.random() * 10) + 1,
            isLeaderKill: eliminator.leaderKills > 0 && Math.random() > 0.7,
          },
        });
      }
    }

    console.log(`    ✅ ${playerCount} joueurs, ${starPlayer.firstName} finit ${starRank}${starRank === 1 ? 'er' : 'ème'}`);
  }

  // Créer quelques éliminations pour les rivalités (nemesis/victime)
  console.log('\n⚔️  Création des rivalités...\n');

  // Créer un nemesis pour notre joueur vedette
  const nemesis = players[1];
  for (let i = 0; i < 5; i++) {
    const tournament = tournaments[i];
    await prisma.elimination.create({
      data: {
        tournamentId: tournament.id,
        eliminatorId: nemesis.id,
        eliminatedId: starPlayer.id,
        rank: 10 + i,
        level: Math.floor(Math.random() * 10) + 1,
        isLeaderKill: false,
      },
    });
  }
  console.log(`  ✅ ${nemesis.firstName} ${nemesis.lastName} est devenu le némésis de ${starPlayer.firstName}`);

  // Créer une victime favorite pour notre joueur vedette
  const victim = players[2];
  for (let i = 0; i < 4; i++) {
    const tournament = tournaments[i + 3];
    await prisma.elimination.create({
      data: {
        tournamentId: tournament.id,
        eliminatorId: starPlayer.id,
        eliminatedId: victim.id,
        rank: 12 + i,
        level: Math.floor(Math.random() * 10) + 1,
        isLeaderKill: Math.random() > 0.5,
      },
    });
  }
  console.log(`  ✅ ${victim.firstName} ${victim.lastName} est devenu la victime favorite de ${starPlayer.firstName}`);

  // Statistiques finales
  console.log('\n📊 RÉSUMÉ:\n');

  const starStats = await prisma.tournamentPlayer.findMany({
    where: {
      playerId: starPlayer.id,
      tournament: { status: 'FINISHED', seasonId: activeSeason.id },
    },
  });

  const victories = starStats.filter((s: typeof starStats[number]) => s.finalRank === 1).length;
  const podiums = starStats.filter((s: typeof starStats[number]) => s.finalRank && s.finalRank <= 3).length;
  const totalEliminations = starStats.reduce((sum: number, s: typeof starStats[number]) => sum + (s.eliminationsCount || 0), 0);
  const totalRebuys = starStats.reduce((sum: number, s: typeof starStats[number]) => sum + (s.rebuysCount || 0), 0);
  const totalWinnings = starStats.reduce((sum: number, s: typeof starStats[number]) => sum + (s.prizeAmount || 0), 0);

  console.log(`⭐ ${starPlayer.firstName} ${starPlayer.lastName}:`);
  console.log(`   🏆 ${victories} victoires`);
  console.log(`   🥉 ${podiums} podiums`);
  console.log(`   💀 ${totalEliminations} éliminations`);
  console.log(`   🔥 ${totalRebuys} recaves`);
  console.log(`   💰 ${totalWinnings.toFixed(2)}€ de gains`);
  console.log(`   🎯 ${starStats.length} tournois joués`);

  console.log('\n🎉 Seeding Fun Stats terminé avec succès!\n');
  console.log(`👉 Allez voir le profil de ${starPlayer.firstName} ${starPlayer.lastName} pour voir les badges!\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
