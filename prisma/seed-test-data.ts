import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding des données de test...');

  // 1. Récupérer tous les joueurs existants
  const players = await prisma.player.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, nickname: true }
  });

  if (players.length === 0) {
    console.log('❌ Aucun joueur trouvé. Veuillez d\'abord créer des joueurs.');
    return;
  }

  console.log(`✓ ${players.length} joueurs trouvés`);

  // 2. Créer une saison de test
  console.log('\n📅 Création de la saison de test...');

  const season = await prisma.season.create({
    data: {
      name: 'Saison Test 2025',
      year: 2025,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      status: 'ACTIVE',
      // Points par défaut
      pointsFirst: 1500,
      pointsSecond: 1000,
      pointsThird: 700,
      pointsFourth: 500,
      pointsFifth: 400,
      pointsSixth: 300,
      pointsSeventh: 200,
      pointsEighth: 200,
      pointsNinth: 200,
      pointsTenth: 200,
      pointsEleventh: 100,
      pointsSixteenth: 50,
      eliminationPoints: 50,
      leaderKillerBonus: 25,
      freeRebuysCount: 2,
      rebuyPenaltyTier1: -50,
      rebuyPenaltyTier2: -100,
      rebuyPenaltyTier3: -150,
      totalTournamentsCount: 20,
      bestTournamentsCount: 15,
    },
  });

  console.log(`✓ Saison créée: ${season.name} (${season.id})`);

  // 3. Créer des tournois de test
  console.log('\n🏆 Création des tournois de test...');

  const tournamentDates = [
    new Date('2025-01-15T20:00:00'),
    new Date('2025-02-01T20:00:00'),
    new Date('2025-02-15T20:00:00'),
    new Date('2025-03-01T20:00:00'),
    new Date('2025-03-15T20:00:00'),
  ];

  const tournaments = [];

  for (let i = 0; i < tournamentDates.length; i++) {
    const tournamentDate = tournamentDates[i];
    const isFinished = i < 2; // Les 2 premiers tournois sont terminés
    const isPlanned = i >= 2; // Les suivants sont planifiés

    const tournament = await prisma.tournament.create({
      data: {
        name: `Tournoi Test #${i + 1}`,
        seasonId: season.id,
        date: tournamentDate,
        buyInAmount: 10,
        startingChips: 5000,
        targetDuration: 180,
        totalPlayers: players.length,
        status: isFinished ? 'FINISHED' : 'PLANNED',
        levelDuration: 15,
        timerElapsedSeconds: isFinished ? 10800 : 0, // 3 heures pour les tournois terminés
      },
    });

    tournaments.push(tournament);
    console.log(`✓ Tournoi créé: ${tournament.name} (${isFinished ? 'FINISHED' : 'PLANNED'})`);

    // 4. Inscrire des joueurs au tournoi
    if (isFinished || i === 2) { // Tournois terminés + le prochain planifié
      console.log(`  → Inscription des joueurs...`);

      // Sélectionner un nombre aléatoire de joueurs (min 8, max tous)
      const numPlayers = Math.max(8, Math.min(players.length, Math.floor(Math.random() * players.length) + 8));
      const selectedPlayers = [...players].sort(() => Math.random() - 0.5).slice(0, numPlayers);

      for (const player of selectedPlayers) {
        await prisma.tournamentPlayer.create({
          data: {
            tournamentId: tournament.id,
            playerId: player.id,
            hasPaid: true,
            rebuysCount: 0,
            lightRebuyUsed: false,
            eliminationsCount: 0,
            leaderKills: 0,
            rankPoints: 0,
            eliminationPoints: 0,
            bonusPoints: 0,
            penaltyPoints: 0,
            totalPoints: 0,
            finalRank: null,
          },
        });
      }

      console.log(`  ✓ ${selectedPlayers.length} joueurs inscrits`);

      // 5. Pour les tournois terminés, générer des classements et points
      if (isFinished) {
        console.log(`  → Génération du classement...`);

        // Mélanger les joueurs pour le classement
        const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);

        // Attribuer des rangs
        for (let rank = 1; rank <= shuffledPlayers.length; rank++) {
          const player = shuffledPlayers[rank - 1];

          // Calculer les points selon le rang
          let rankPoints = 0;
          if (rank === 1) rankPoints = season.pointsFirst;
          else if (rank === 2) rankPoints = season.pointsSecond;
          else if (rank === 3) rankPoints = season.pointsThird;
          else if (rank === 4) rankPoints = season.pointsFourth;
          else if (rank === 5) rankPoints = season.pointsFifth;
          else if (rank === 6) rankPoints = season.pointsSixth;
          else if (rank === 7) rankPoints = season.pointsSeventh;
          else if (rank === 8) rankPoints = season.pointsEighth;
          else if (rank === 9) rankPoints = season.pointsNinth;
          else if (rank === 10) rankPoints = season.pointsTenth;
          else if (rank === 11) rankPoints = season.pointsEleventh;
          else if (rank >= 16) rankPoints = season.pointsSixteenth;
          else rankPoints = 100; // Rangs 12-15

          // Éliminations aléatoires (0-3)
          const eliminations = Math.floor(Math.random() * 4);
          const eliminationPoints = eliminations * season.eliminationPoints;

          // Bonus leader killer aléatoire (0-1)
          const leaderKills = Math.random() > 0.8 ? 1 : 0;
          const bonusPoints = leaderKills * season.leaderKillerBonus;

          // Recaves aléatoires (0-3)
          const rebuys = Math.floor(Math.random() * 4);
          let penaltyPoints = 0;
          if (rebuys > season.freeRebuysCount) {
            if (rebuys === 3) penaltyPoints = season.rebuyPenaltyTier1;
            else if (rebuys === 4) penaltyPoints = season.rebuyPenaltyTier2;
            else if (rebuys >= 5) penaltyPoints = season.rebuyPenaltyTier3;
          }

          const totalPoints = rankPoints + eliminationPoints + bonusPoints + penaltyPoints;

          // Prize pour le podium
          let prizeAmount = null;
          if (rank === 1) prizeAmount = selectedPlayers.length * 10 * 0.5; // 50% du prize pool
          else if (rank === 2) prizeAmount = selectedPlayers.length * 10 * 0.3; // 30%
          else if (rank === 3) prizeAmount = selectedPlayers.length * 10 * 0.2; // 20%

          await prisma.tournamentPlayer.update({
            where: {
              tournamentId_playerId: {
                tournamentId: tournament.id,
                playerId: player.id,
              },
            },
            data: {
              finalRank: rank,
              rebuysCount: rebuys,
              eliminationsCount: eliminations,
              leaderKills: leaderKills,
              rankPoints: rankPoints,
              eliminationPoints: eliminationPoints,
              bonusPoints: bonusPoints,
              penaltyPoints: penaltyPoints,
              totalPoints: totalPoints,
              prizeAmount: prizeAmount,
            },
          });
        }

        console.log(`  ✓ Classement généré pour ${shuffledPlayers.length} joueurs`);

        // 6. Créer quelques éliminations pour le tournoi
        const numEliminations = Math.min(5, Math.floor(shuffledPlayers.length / 2));
        console.log(`  → Création de ${numEliminations} éliminations...`);

        for (let e = 0; e < numEliminations; e++) {
          const eliminated = shuffledPlayers[shuffledPlayers.length - 1 - e]; // Les derniers sont éliminés
          const eliminator = shuffledPlayers[Math.floor(Math.random() * Math.min(5, shuffledPlayers.length))]; // Top 5 éliminent

          if (eliminated.id !== eliminator.id) {
            await prisma.elimination.create({
              data: {
                tournamentId: tournament.id,
                eliminatedId: eliminated.id,
                eliminatorId: eliminator.id,
                rank: shuffledPlayers.length - e, // Rang au moment de l'élimination
                level: Math.floor(Math.random() * 10) + 1,
                isLeaderKill: Math.random() > 0.8, // 20% de chance d'être un leader kill
              },
            });
          }
        }

        console.log(`  ✓ ${numEliminations} éliminations créées`);
      }
    }
  }

  console.log('\n✅ Seeding terminé avec succès!');
  console.log(`\n📊 Résumé:`);
  console.log(`   - 1 saison créée: ${season.name}`);
  console.log(`   - ${tournaments.length} tournois créés`);
  console.log(`   - 2 tournois terminés avec classements`);
  console.log(`   - ${tournaments.length - 2} tournois planifiés`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
