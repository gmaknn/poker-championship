/**
 * Régression: GET /api/tournaments/[id]/results doit cumuler les 3 bonus kills
 * (Leader Killer + Top Shark Leader + Random Killer), pas seulement Leader Killer.
 *
 * Bug d'origine: bonusPoints = leaderKills * leaderKillerBonus uniquement,
 * ce qui faisait afficher un total et un bonus sous-évalués dans le classement
 * d'un tournoi (ex: un éliminateur avec un double kill Leader+TopShark affiché +50 au lieu de +100).
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    tournament: {
      findUnique: jest.fn(),
    },
  },
}));

// La route importe auth-helpers (pour le POST) qui tire next-auth — mocké pour éviter l'ESM.
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

import { GET } from '@/app/api/tournaments/[id]/results/route';
import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('GET /api/tournaments/[id]/results — cumul des bonus kills', () => {
  const tournamentId = 'tourn-test';

  const baseSeason = {
    id: 'season-1',
    name: 'Saison 2026',
    year: 2026,
    eliminationPoints: 50,
    bustEliminationBonus: 25,
    leaderKillerBonus: 50,
    topSharkLeaderBonus: 50,
    randomKillerBonus: 50,
    // champs détaillés non utilisés ici (fallback legacy)
    detailedPointsConfig: null,
    pointsFirst: 1000, pointsSecond: 700, pointsThird: 500, pointsFourth: 400,
    pointsFifth: 300, pointsSixth: 250, pointsSeventh: 200, pointsEighth: 150,
    pointsNinth: 140, pointsTenth: 130, pointsEleventh: 120, pointsSixteenth: 100,
  };

  const makePlayer = (over: Record<string, unknown>) => ({
    id: `tp-${over.playerId}`,
    playerId: over.playerId,
    finalRank: 6,
    rebuysCount: 0,
    eliminationsCount: 0,
    bustEliminations: 0,
    leaderKills: 0,
    topSharkLeaderKills: 0,
    randomTargetKills: 0,
    penaltyPoints: 0,
    prizeAmount: null,
    player: { id: over.playerId, firstName: 'X', lastName: 'Y', nickname: String(over.playerId), avatar: null },
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockTournamentWith(players: ReturnType<typeof makePlayer>[]) {
    (mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
      id: tournamentId,
      name: 'Tournoi Test',
      date: new Date('2026-05-08'),
      status: 'FINISHED',
      type: 'CHAMPIONSHIP',
      buyInAmount: 10,
      lightRebuyAmount: 5,
      prizePool: 280,
      season: baseSeason,
      tournamentPlayers: players,
    });
  }

  async function getResults() {
    const request = new NextRequest(`http://localhost/api/tournaments/${tournamentId}/results`, { method: 'GET' });
    const response = await GET(request, { params: Promise.resolve({ id: tournamentId }) });
    expect(response.status).toBe(200);
    return (await response.json()).results as Array<Record<string, number>>;
  }

  it('cumule Leader Killer + Top Shark Leader pour un double kill (le bug d’origine)', async () => {
    // Rémi: rank 6 (250pts) + 2 élim finales (100pts) + LK(50) + TS(50) = 450
    mockTournamentWith([
      makePlayer({ playerId: 'remi', finalRank: 6, eliminationsCount: 2, leaderKills: 1, topSharkLeaderKills: 1 }),
    ]);
    const [remi] = await getResults();
    expect(remi.bonusPoints).toBe(100);
    expect(remi.totalPoints).toBe(250 + 100 + 100);
  });

  it('compte le Random Killer bonus', async () => {
    // Tomtom: rank 6 (250) + 0 élim + RK(50) = 300
    mockTournamentWith([
      makePlayer({ playerId: 'tomtom', finalRank: 6, eliminationsCount: 0, randomTargetKills: 1 }),
    ]);
    const [tomtom] = await getResults();
    expect(tomtom.bonusPoints).toBe(50);
    expect(tomtom.totalPoints).toBe(250 + 0 + 50);
  });

  it('cumule les trois types de bonus simultanément', async () => {
    mockTournamentWith([
      makePlayer({ playerId: 'multi', finalRank: 6, leaderKills: 1, topSharkLeaderKills: 1, randomTargetKills: 1 }),
    ]);
    const [multi] = await getResults();
    expect(multi.bonusPoints).toBe(150);
  });

  it('ne crédite aucun bonus quand aucun kill spécial', async () => {
    mockTournamentWith([
      makePlayer({ playerId: 'none', finalRank: 6, eliminationsCount: 3 }),
    ]);
    const [none] = await getResults();
    expect(none.bonusPoints).toBe(0);
  });
});
