/**
 * Script de seed COMPLET pour l'application Poker Championship
 * Génère des données de test couvrant TOUTES les fonctionnalités
 *
 * Usage: npm run db:seed-complete
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Noms réalistes pour les joueurs
const PLAYER_NAMES = [
  { firstName: 'Nicolas', lastName: 'Fortier', nickname: 'Nico Fo' },
  { firstName: 'Grégory', lastName: 'Martin', nickname: 'Greg' },
  { firstName: 'Romain', lastName: 'Dupont', nickname: 'Romain' },
  { firstName: 'Pascal', lastName: 'Bernard', nickname: 'Pascal' },
  { firstName: 'Bruno', lastName: 'Petit', nickname: 'bruno' },
  { firstName: 'Georges', lastName: 'Moreau', nickname: 'Georges' },
  { firstName: 'Karine', lastName: 'Laurent', nickname: 'Karine' },
  { firstName: 'Rémi', lastName: 'Simon', nickname: 'Remi' },
  { firstName: 'Christian', lastName: 'Michel', nickname: 'Christian' },
  { firstName: 'Benjamin', lastName: 'Lefebvre', nickname: 'Benjamin' },
  { firstName: 'Vadim', lastName: 'Leroy', nickname: 'Vadim' },
  { firstName: 'Vincent', lastName: 'Garnier', nickname: 'Vincent' },
  { firstName: 'Théo', lastName: 'Faure', nickname: 'Teo' },
  { firstName: 'Tom', lastName: 'Girard', nickname: 'Tom' },
  { firstName: 'Gilles', lastName: 'Bonnet', nickname: 'Gilles' },
  { firstName: 'Mike', lastName: 'Rousseau', nickname: 'mike' },
  { firstName: 'Jérémy', lastName: 'Blanc', nickname: 'Jeremy' },
  { firstName: 'Nicolas', lastName: 'Boyer', nickname: 'Nico Bo' },
  { firstName: 'Christophe', lastName: 'Guerin', nickname: 'Christophe' },
  { firstName: 'Thomas', lastName: 'Muller', nickname: 'Thomas' },
  { firstName: 'Philippe', lastName: 'Martinez', nickname: 'Philippe' },
  { firstName: 'Sébastien', lastName: 'Garcia', nickname: 'Seb' },
  { firstName: 'David', lastName: 'Rodriguez', nickname: 'David' },
  { firstName: 'Marc', lastName: 'Sanchez', nickname: 'Marc' },
  { firstName: 'Julien', lastName: 'Perez', nickname: 'Julien' },
];

// Styles d'avatars DiceBear
const AVATAR_STYLES = ['adventurer', 'avataaars', 'big-ears', 'bottts', 'micah', 'personas'];

async function main() {
  console.log('🌱 Début du seeding COMPLET de la base de données...\n');

  // 1. NETTOYER LA BASE (optionnel, pour recommencer à zéro)
  console.log('🗑️  Nettoyage de la base...');
  await prisma.elimination.deleteMany();
  await prisma.tableAssignment.deleteMany();
  await prisma.blindLevel.deleteMany();
  await prisma.chipDenomination.deleteMany();
  await prisma.tournamentPlayer.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.season.deleteMany();
  await prisma.player.deleteMany();
  await prisma.settings.deleteMany();
  console.log('✅ Base nettoyée\n');

  // 2. CRÉER LES SETTINGS GLOBAUX
  console.log('⚙️  Création des settings globaux...');
  const settings = await prisma.settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      championshipName: 'POKER CHAMPIONSHIP',
      clubName: 'WPT VILLELAURE',
      defaultBuyIn: 20,
      defaultStartingChips: 10000,
      defaultLevelDuration: 12,
      defaultTargetDuration: 180,
    },
  });
  console.log('✅ Settings créés\n');

  // 3. CRÉER LES JOUEURS
  console.log('👥 Création des joueurs...');
  const players = [];

  for (let i = 0; i < PLAYER_NAMES.length; i++) {
    const playerData = PLAYER_NAMES[i];
    const style = AVATAR_STYLES[i % AVATAR_STYLES.length];
    const seed = playerData.nickname.toLowerCase().replace(/\s/g, '');

    const player = await prisma.player.create({
      data: {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        nickname: playerData.nickname,
        email: `${seed}@poker.test`,
        avatar: `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`,
        status: i >= 23 ? 'ARCHIVED' : 'ACTIVE', // 2 derniers archivés
      },
    });
    players.push(player);
  }
  console.log(`✅ ${players.length} joueurs créés (${players.filter(p => p.status === 'ACTIVE').length} actifs, ${players.filter(p => p.status === 'ARCHIVED').length} archivés)\n`);

  const activePlayers = players.filter(p => p.status === 'ACTIVE');

  // 4. CRÉER LES SAISONS
  console.log('📅 Création des saisons...');

  // Saison passée (2023, terminée)
  const season2023 = await prisma.season.create({
    data: {
      name: 'Championnat 2023',
      year: 2023,
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
      status: 'ARCHIVED',
      totalTournamentsCount: 12,
      bestTournamentsCount: 10,
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
    },
  });

  // Saison en cours (2024-2025, active)
  const season2024 = await prisma.season.create({
    data: {
      name: 'Les Sharks 2024-2025',
      year: 2025,
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-06-30'),
      status: 'ACTIVE',
      totalTournamentsCount: 15,
      bestTournamentsCount: 12,
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
    },
  });

  // Saison future (2025-2026, planifiée)
  const season2025 = await prisma.season.create({
    data: {
      name: 'Championnat 2025-2026',
      year: 2026,
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      status: 'ACTIVE',
      totalTournamentsCount: 15,
      bestTournamentsCount: 12,
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
    },
  });

  console.log('✅ 3 saisons créées\n');

  // 5. CRÉER LES TOURNOIS POUR LA SAISON 2024 (en cours)
  console.log('🎰 Création des tournois pour la saison 2024-2025...');

  const tournaments = [];

  // Tournoi 1: FINISHED (octobre 2024)
  const tournament1 = await prisma.tournament.create({
    data: {
      name: 'Tournoi #1 - Lancement de saison',
      seasonId: season2024.id,
      date: new Date('2024-10-05T20:00:00'),
      status: 'FINISHED',
      buyInAmount: 20,
      startingChips: 10000,
      prizePool: 320,
    },
  });
  tournaments.push(tournament1);

  // Tournoi 2: FINISHED (novembre 2024)
  const tournament2 = await prisma.tournament.create({
    data: {
      name: 'Tournoi #2 - Halloween',
      seasonId: season2024.id,
      date: new Date('2024-11-01T20:00:00'),
      status: 'FINISHED',
      buyInAmount: 20,
      startingChips: 10000,
      prizePool: 280,
    },
  });
  tournaments.push(tournament2);

  // Tournoi 3: FINISHED (décembre 2024)
  const tournament3 = await prisma.tournament.create({
    data: {
      name: 'Tournoi #3 - Noël',
      seasonId: season2024.id,
      date: new Date('2024-12-20T20:00:00'),
      status: 'FINISHED',
      buyInAmount: 20,
      startingChips: 10000,
      prizePool: 340,
    },
  });
  tournaments.push(tournament3);

  // Tournoi 4: IN_PROGRESS (maintenant)
  const tournament4 = await prisma.tournament.create({
    data: {
      name: 'Tournoi #4 - En cours',
      seasonId: season2024.id,
      date: new Date('2025-01-15T20:00:00'),
      status: 'IN_PROGRESS',
      buyInAmount: 20,
      startingChips: 10000,
      prizePool: 300,
    },
  });
  tournaments.push(tournament4);

  // Tournoi 5: REGISTRATION
  const tournament5 = await prisma.tournament.create({
    data: {
      name: 'Tournoi #5 - Inscriptions ouvertes',
      seasonId: season2024.id,
      date: new Date('2025-02-01T20:00:00'),
      status: 'REGISTRATION',
      buyInAmount: 20,
      startingChips: 10000,
    },
  });
  tournaments.push(tournament5);

  // Tournoi 6: PLANNED
  const tournament6 = await prisma.tournament.create({
    data: {
      name: 'Tournoi #6 - Février',
      seasonId: season2024.id,
      date: new Date('2025-02-15T20:00:00'),
      status: 'PLANNED',
      buyInAmount: 20,
      startingChips: 10000,
    },
  });
  tournaments.push(tournament6);

  // Tournoi 7: CANCELLED
  const tournament7 = await prisma.tournament.create({
    data: {
      name: 'Tournoi annulé - Météo',
      seasonId: season2024.id,
      date: new Date('2024-11-15T20:00:00'),
      status: 'CANCELLED',
      buyInAmount: 20,
      startingChips: 10000,
    },
  });
  tournaments.push(tournament7);

  // Tournoi OFF (hors championnat)
  const tournamentOff = await prisma.tournament.create({
    data: {
      name: 'Poker Night - Hors championnat',
      seasonId: null,
      date: new Date('2024-12-31T20:00:00'),
      status: 'FINISHED',
      buyInAmount: 10,
      startingChips: 5000,
      prizePool: 100,
    },
  });
  tournaments.push(tournamentOff);

  console.log(`✅ ${tournaments.length} tournois créés\n`);

  // 6. FONCTIONS HELPER POUR GÉNÉRER DES DONNÉES

  async function createBlindStructure(tournamentId: string, type: 'fast' | 'normal' | 'slow') {
    console.log(`  📊 Création structure de blindes (${type})...`);

    const structures = {
      fast: [
        { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 10 },
        { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 10 },
        { level: 3, smallBlind: 75, bigBlind: 150, ante: 25, duration: 10 },
        { level: 4, smallBlind: 100, bigBlind: 200, ante: 25, duration: 10 },
        { level: 5, smallBlind: 150, bigBlind: 300, ante: 50, duration: 12 },
        { level: 6, smallBlind: 200, bigBlind: 400, ante: 50, duration: 12 },
        { level: 7, smallBlind: 300, bigBlind: 600, ante: 75, duration: 12 },
        { level: 8, smallBlind: 400, bigBlind: 800, ante: 100, duration: 12 },
        { level: 9, smallBlind: 600, bigBlind: 1200, ante: 150, duration: 15 },
        { level: 10, smallBlind: 800, bigBlind: 1600, ante: 200, duration: 15 },
      ],
      normal: [
        { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12 },
        { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12 },
        { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, duration: 12 },
        { level: 4, smallBlind: 100, bigBlind: 200, ante: 25, duration: 12 },
        { level: 5, smallBlind: 150, bigBlind: 300, ante: 50, duration: 15 },
        { level: 6, smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 },
        { level: 7, smallBlind: 300, bigBlind: 600, ante: 75, duration: 15 },
        { level: 8, smallBlind: 400, bigBlind: 800, ante: 100, duration: 15 },
        { level: 9, smallBlind: 600, bigBlind: 1200, ante: 150, duration: 15 },
        { level: 10, smallBlind: 800, bigBlind: 1600, ante: 200, duration: 15 },
        { level: 11, smallBlind: 1000, bigBlind: 2000, ante: 250, duration: 15 },
        { level: 12, smallBlind: 1500, bigBlind: 3000, ante: 400, duration: 15 },
      ],
      slow: [
        { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 15 },
        { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 15 },
        { level: 3, smallBlind: 75, bigBlind: 150, ante: 0, duration: 15 },
        { level: 4, smallBlind: 100, bigBlind: 200, ante: 0, duration: 15 },
        { level: 5, smallBlind: 150, bigBlind: 300, ante: 25, duration: 15 },
        { level: 6, smallBlind: 200, bigBlind: 400, ante: 50, duration: 15 },
        { level: 7, smallBlind: 300, bigBlind: 600, ante: 50, duration: 15 },
        { level: 8, smallBlind: 400, bigBlind: 800, ante: 75, duration: 15 },
        { level: 9, smallBlind: 600, bigBlind: 1200, ante: 100, duration: 15 },
        { level: 10, smallBlind: 800, bigBlind: 1600, ante: 150, duration: 15 },
        { level: 11, smallBlind: 1000, bigBlind: 2000, ante: 200, duration: 15 },
        { level: 12, smallBlind: 1500, bigBlind: 3000, ante: 300, duration: 15 },
        { level: 13, smallBlind: 2000, bigBlind: 4000, ante: 500, duration: 15 },
        { level: 14, smallBlind: 3000, bigBlind: 6000, ante: 750, duration: 15 },
      ],
    };

    for (const level of structures[type]) {
      await prisma.blindLevel.create({
        data: {
          tournamentId,
          ...level,
        },
      });
    }
  }

  async function createChipDenominations(tournamentId: string) {
    console.log('  🪙 Création dénominations de jetons...');

    const denominations = [
      { value: 25, color: '#FFFFFF', quantity: 10, order: 1 },
      { value: 100, color: '#FF0000', quantity: 10, order: 2 },
      { value: 500, color: '#0000FF', quantity: 8, order: 3 },
      { value: 1000, color: '#00FF00', quantity: 5, order: 4 },
      { value: 5000, color: '#000000', quantity: 2, order: 5 },
    ];

    for (const denom of denominations) {
      await prisma.chipDenomination.create({
        data: {
          tournamentId,
          ...denom,
        },
      });
    }
  }

  async function createTournamentResults(
    tournament: any,
    season: any,
    playerCount: number
  ) {
    console.log(`  🎯 Création résultats pour ${tournament.name}...`);

    // Sélectionner des joueurs aléatoires
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const selectedPlayers = shuffled.slice(0, playerCount);

    // Créer les classements
    const rankings = selectedPlayers.map((player, index) => ({
      player,
      rank: index + 1,
      rebuys: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
    }));

    // Créer les TournamentPlayers avec calcul des points
    const tournamentPlayers = [];

    for (const { player, rank, rebuys } of rankings) {
      // Calcul des points de classement
      const pointsMap: Record<number, number> = {
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
        11: season.pointsEleventh,
      };

      const rankPoints = rank <= 11 ? pointsMap[rank] : (rank <= 16 ? season.pointsSixteenth : 0);

      // Éliminations aléatoires
      const eliminations = Math.floor(Math.random() * 4);
      const eliminationPoints = eliminations * season.eliminationPoints;

      // Leader kills aléatoires
      const leaderKills = Math.random() > 0.8 ? Math.floor(Math.random() * 2) + 1 : 0;
      const bonusPoints = leaderKills * season.leaderKillerBonus;

      // Pénalités de recave
      let penaltyPoints = 0;
      if (rebuys === 3) penaltyPoints = -50;
      else if (rebuys === 4) penaltyPoints = -100;
      else if (rebuys >= 5) penaltyPoints = -150;

      const totalPoints = rankPoints + eliminationPoints + bonusPoints + penaltyPoints;

      const tp = await prisma.tournamentPlayer.create({
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
          prizeAmount: rank === 1 ? tournament.prizePool * 0.5 : rank === 2 ? tournament.prizePool * 0.3 : rank === 3 ? tournament.prizePool * 0.2 : null,
        },
      });

      tournamentPlayers.push({ tp, player, eliminations, leaderKills, rebuys });
    }

    // Créer les éliminations
    console.log('  ⚔️  Création éliminations...');
    const eliminated = [...tournamentPlayers].reverse(); // Éliminés dans l'ordre inverse du classement

    for (let i = 0; i < eliminated.length - 1; i++) {
      const { tp, player } = eliminated[i];
      const { player: eliminator } = eliminated[Math.min(i + 1 + Math.floor(Math.random() * 3), eliminated.length - 1)];

      if (tp.eliminationsCount && tp.eliminationsCount > 0) {
        await prisma.elimination.create({
          data: {
            tournamentId: tournament.id,
            eliminatorId: eliminator.id,
            eliminatedId: player.id,
            rank: tp.finalRank || 0,
            level: Math.floor(Math.random() * 10) + 1,
            isLeaderKill: tp.leaderKills > 0 && Math.random() > 0.5,
          },
        });
      }
    }

    return tournamentPlayers;
  }

  async function createTournamentInProgress(tournament: any) {
    console.log(`  🎮 Configuration tournoi en cours...`);

    // Inscrire des joueurs
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const selectedPlayers = shuffled.slice(0, 15);

    // Créer les inscriptions
    for (const player of selectedPlayers) {
      await prisma.tournamentPlayer.create({
        data: {
          tournamentId: tournament.id,
          playerId: player.id,
          finalRank: null,
          rebuysCount: 0,
          eliminationsCount: 0,
          leaderKills: 0,
          rankPoints: 0,
          eliminationPoints: 0,
          bonusPoints: 0,
          penaltyPoints: 0,
          totalPoints: 0,
        },
      });
    }

    // Créer 3 tables
    console.log('  🪑 Création des tables...');
    const tableCount = 3;
    const playersPerTable = Math.ceil(selectedPlayers.length / tableCount);

    for (let tableNum = 1; tableNum <= tableCount; tableNum++) {
      const startIdx = (tableNum - 1) * playersPerTable;
      const tablePlayers = selectedPlayers.slice(startIdx, startIdx + playersPerTable);

      for (let seatNum = 0; seatNum < tablePlayers.length; seatNum++) {
        await prisma.tableAssignment.create({
          data: {
            tournamentId: tournament.id,
            playerId: tablePlayers[seatNum].id,
            tableNumber: tableNum,
            seatNumber: seatNum + 1,
            isActive: Math.random() > 0.2, // 20% éliminés
          },
        });
      }
    }

    // Quelques éliminations déjà effectuées
    const eliminated = selectedPlayers.slice(0, 3);
    const survivors = selectedPlayers.slice(3);

    for (const player of eliminated) {
      const eliminator = survivors[Math.floor(Math.random() * survivors.length)];
      await prisma.elimination.create({
        data: {
          tournamentId: tournament.id,
          eliminatorId: eliminator.id,
          eliminatedId: player.id,
          rank: 15 - eliminated.indexOf(player),
          level: Math.floor(Math.random() * 5) + 1,
          isLeaderKill: false,
        },
      });
    }
  }

  async function createRegistrationTournament(tournament: any) {
    console.log(`  📝 Inscription des joueurs...`);

    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const selectedPlayers = shuffled.slice(0, 10);

    for (const player of selectedPlayers) {
      await prisma.tournamentPlayer.create({
        data: {
          tournamentId: tournament.id,
          playerId: player.id,
          finalRank: null,
          rebuysCount: 0,
          eliminationsCount: 0,
          leaderKills: 0,
          rankPoints: 0,
          eliminationPoints: 0,
          bonusPoints: 0,
          penaltyPoints: 0,
          totalPoints: 0,
        },
      });
    }
  }

  // 7. REMPLIR LES DONNÉES POUR CHAQUE TOURNOI
  console.log('\n🎲 Remplissage des données des tournois...\n');

  // Tournoi 1 FINISHED
  console.log('Tournoi #1 (FINISHED):');
  await createBlindStructure(tournament1.id, 'normal');
  await createChipDenominations(tournament1.id);
  await createTournamentResults(tournament1, season2024, 16);

  // Tournoi 2 FINISHED
  console.log('\nTournoi #2 (FINISHED):');
  await createBlindStructure(tournament2.id, 'fast');
  await createChipDenominations(tournament2.id);
  await createTournamentResults(tournament2, season2024, 14);

  // Tournoi 3 FINISHED
  console.log('\nTournoi #3 (FINISHED):');
  await createBlindStructure(tournament3.id, 'slow');
  await createChipDenominations(tournament3.id);
  await createTournamentResults(tournament3, season2024, 17);

  // Tournoi 4 IN_PROGRESS
  console.log('\nTournoi #4 (IN_PROGRESS):');
  await createBlindStructure(tournament4.id, 'normal');
  await createChipDenominations(tournament4.id);
  await createTournamentInProgress(tournament4);

  // Tournoi 5 REGISTRATION
  console.log('\nTournoi #5 (REGISTRATION):');
  await createBlindStructure(tournament5.id, 'normal');
  await createChipDenominations(tournament5.id);
  await createRegistrationTournament(tournament5);

  // Tournoi 6 PLANNED
  console.log('\nTournoi #6 (PLANNED):');
  await createBlindStructure(tournament6.id, 'normal');

  // Tournoi OFF
  console.log('\nTournoi OFF (FINISHED):');
  await createBlindStructure(tournamentOff.id, 'fast');
  await createChipDenominations(tournamentOff.id);
  await createTournamentResults(tournamentOff, season2024, 10);

  // 8. STATISTIQUES FINALES
  console.log('\n\n📊 STATISTIQUES FINALES:\n');

  const totalPlayers = await prisma.player.count();
  const totalSeasons = await prisma.season.count();
  const totalTournaments = await prisma.tournament.count();
  const totalTournamentPlayers = await prisma.tournamentPlayer.count();
  const totalEliminations = await prisma.elimination.count();
  const totalBlindLevels = await prisma.blindLevel.count();
  const totalTableAssignments = await prisma.tableAssignment.count();
  const totalChipDenominations = await prisma.chipDenomination.count();

  console.log(`✅ ${totalPlayers} joueurs`);
  console.log(`✅ ${totalSeasons} saisons`);
  console.log(`✅ ${totalTournaments} tournois`);
  console.log(`✅ ${totalTournamentPlayers} inscriptions de joueurs`);
  console.log(`✅ ${totalEliminations} éliminations`);
  console.log(`✅ ${totalBlindLevels} niveaux de blindes`);
  console.log(`✅ ${totalTableAssignments} assignments de tables`);
  console.log(`✅ ${totalChipDenominations} dénominations de jetons`);

  console.log('\n🎉 Seeding COMPLET terminé avec succès!\n');
  console.log('Vous pouvez maintenant tester TOUTES les fonctionnalités de l\'application.\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
