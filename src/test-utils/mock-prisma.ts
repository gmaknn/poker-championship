/**
 * Mock Prisma pour les tests API
 * Permet de simuler les réponses de la base de données
 */

import { TEST_PLAYERS } from './test-utils';

/**
 * Mock des résultats Prisma par défaut
 */
export const mockPrismaResults = {
  players: [
    {
      ...TEST_PLAYERS.admin,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tournamentPlayers: 5, eliminations: 10 },
    },
    {
      ...TEST_PLAYERS.tournamentDirector,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tournamentPlayers: 3, eliminations: 5 },
    },
    {
      ...TEST_PLAYERS.player,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tournamentPlayers: 2, eliminations: 1 },
    },
  ],
  seasons: [
    {
      id: 'test-season-id',
      name: 'Saison Test 2025',
      year: 2025,
      startDate: new Date('2025-01-01'),
      endDate: null,
      status: 'ACTIVE',
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
      totalTournamentsCount: null,
      bestTournamentsCount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { tournaments: 3 },
    },
  ],
  tournaments: [
    {
      id: 'test-tournament-id',
      name: 'Tournoi Test',
      seasonId: 'test-season-id',
      createdById: TEST_PLAYERS.tournamentDirector.id,
      date: new Date(),
      type: 'CHAMPIONSHIP',
      status: 'PLANNED',
      buyInAmount: 10,
      startingChips: 5000,
      targetDuration: 180,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: {
        id: TEST_PLAYERS.tournamentDirector.id,
        firstName: TEST_PLAYERS.tournamentDirector.firstName,
        lastName: TEST_PLAYERS.tournamentDirector.lastName,
        nickname: TEST_PLAYERS.tournamentDirector.nickname,
      },
      season: {
        id: 'test-season-id',
        name: 'Saison Test 2025',
        year: 2025,
      },
      _count: { tournamentPlayers: 8 },
      tournamentPlayers: [],
    },
  ],
  settings: {
    id: 'test-settings-id',
    championshipName: 'POKER CHAMPIONSHIP',
    clubName: 'WPT VILLELAURE',
    clubLogo: null,
    defaultBuyIn: 10,
    defaultStartingChips: 5000,
    defaultLevelDuration: 12,
    defaultTargetDuration: 180,
    enableEmailNotifications: false,
    enableSmsNotifications: false,
    theme: 'dark',
    language: 'fr',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

/**
 * Crée un mock de prisma.player.findUnique basé sur l'ID
 */
export function mockPlayerFindUnique(playerId: string | null) {
  if (!playerId) return null;

  const players = Object.values(TEST_PLAYERS);
  return players.find(p => p.id === playerId) || null;
}

/**
 * Crée un mock de prisma.user.findUnique
 * Retourne null car en mode test on utilise le header x-player-id
 */
export function mockUserFindUnique() {
  return null;
}
