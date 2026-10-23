import {
  buildStateFromDb,
  computeCorrectedResults,
  diffPlayers,
  summarizeStateChanges,
  validateCorrectionState,
  type CorrectionContext,
  type CorrectionState,
  type SeasonScoring,
} from '@/lib/tournament-corrections';

const season: SeasonScoring = {
  detailedPointsConfig: null,
  pointsFirst: 1500, pointsSecond: 1000, pointsThird: 700, pointsFourth: 500,
  pointsFifth: 400, pointsSixth: 300, pointsSeventh: 250, pointsEighth: 200,
  pointsNinth: 150, pointsTenth: 140, pointsEleventh: 120, pointsSixteenth: 100,
  eliminationPoints: 50,
  bustEliminationBonus: 25,
  leaderKillerBonus: 50,
  topSharkLeaderBonus: 40,
  randomKillerBonus: 30,
  freeRebuysCount: 1,
  recavePenaltyTiers: [{ fromRecaves: 2, penaltyPoints: -50 }],
  rebuyPenaltyTier1: -50,
  rebuyPenaltyTier2: -100,
  rebuyPenaltyTier3: -150,
};

// 5 joueurs : A gagne. Ordre de sortie : E (5e), D (4e), C (3e), B (2e)
const playerIds = ['A', 'B', 'C', 'D', 'E'];

function ctx(over: Partial<CorrectionContext> = {}): CorrectionContext {
  return {
    type: 'CHAMPIONSHIP',
    season,
    seasonLeaderAtStartId: null,
    seasonTopSharkAtStartId: null,
    randomTargetPlayerId: null,
    prizeAmounts: [],
    storedPrizeByRank: {},
    playerIds,
    ...over,
  };
}

function baseState(): CorrectionState {
  return {
    exits: [
      { id: 'e1', eliminatedId: 'E', eliminatorId: 'A', kind: 'ELIMINATION', level: 5 },
      { id: 'e2', eliminatedId: 'D', eliminatorId: 'B', kind: 'ELIMINATION', level: 6 },
      { id: 'e3', eliminatedId: 'C', eliminatorId: 'A', kind: 'ELIMINATION', level: 7 },
      { id: 'e4', eliminatedId: 'B', eliminatorId: 'A', kind: 'ELIMINATION', level: 8 },
    ],
    busts: [],
    rebuys: playerIds.map((playerId) => ({ playerId, rebuysCount: 0, lightRebuyUsed: false })),
  };
}

const byId = (r: ReturnType<typeof computeCorrectedResults>, id: string) => r.players.find((p) => p.playerId === id)!;

describe('validateCorrectionState', () => {
  it('accepte un état cohérent', () => {
    expect(validateCorrectionState(baseState(), playerIds)).toEqual([]);
  });

  it('refuse un joueur sorti deux fois / un nombre de sorties incorrect', () => {
    const s = baseState();
    s.exits[1] = { ...s.exits[1], eliminatedId: 'E' };
    const errors = validateCorrectionState(s, playerIds);
    expect(errors.some((e) => e.includes('plusieurs fois'))).toBe(true);
  });

  it('refuse un éliminateur déjà sorti', () => {
    const s = baseState();
    s.exits[2] = { ...s.exits[2], eliminatorId: 'E' }; // E sorti en 1er, ne peut pas éliminer C ensuite
    expect(validateCorrectionState(s, playerIds).some((e) => e.includes('déjà sorti'))).toBe(true);
  });

  it("refuse l'auto-élimination, l'éliminateur manquant et l'abandon avec éliminateur", () => {
    const s = baseState();
    s.exits[0] = { ...s.exits[0], eliminatorId: 'E' };
    s.exits[1] = { ...s.exits[1], eliminatorId: null };
    s.exits[2] = { ...s.exits[2], kind: 'ABANDON' };
    const errors = validateCorrectionState(s, playerIds);
    expect(errors.some((e) => e.includes('lui-même'))).toBe(true);
    expect(errors.some((e) => e.includes('manquant'))).toBe(true);
    expect(errors.some((e) => e.includes('abandon'))).toBe(true);
  });

  it('refuse un bust sur soi-même et des recaves négatives ou manquantes', () => {
    const s = baseState();
    s.busts.push({ eliminatedId: 'C', killerId: 'C', level: 2, recaveApplied: true });
    s.rebuys[0].rebuysCount = -1;
    s.rebuys.pop();
    const errors = validateCorrectionState(s, playerIds);
    expect(errors.some((e) => e.includes('se buster'))).toBe(true);
    expect(errors.some((e) => e.includes('nombre invalide'))).toBe(true);
    expect(errors.some((e) => e.includes('chaque joueur'))).toBe(true);
  });
});

describe('computeCorrectedResults', () => {
  it('calcule rangs, compteurs et points', () => {
    const r = computeCorrectedResults(baseState(), ctx());
    expect(r.winnerId).toBe('A');
    expect(r.exits.map((e) => e.rank)).toEqual([5, 4, 3, 2]);

    const a = byId(r, 'A');
    expect(a.finalRank).toBe(1);
    expect(a.eliminationsCount).toBe(3);
    expect(a.rankPoints).toBe(1500);
    expect(a.eliminationPoints).toBe(150);
    expect(a.totalPoints).toBe(1650);

    expect(byId(r, 'B')).toMatchObject({ finalRank: 2, eliminationsCount: 1, totalPoints: 1050 });
    expect(byId(r, 'E')).toMatchObject({ finalRank: 5, eliminationsCount: 0, totalPoints: 400 });
  });

  it("inverse correctement deux sorties (cas MAQUENHEN / PROST)", () => {
    const s = baseState();
    [s.exits[1], s.exits[2]] = [s.exits[2], s.exits[1]]; // C sort avant D
    const r = computeCorrectedResults(s, ctx());
    expect(byId(r, 'C').finalRank).toBe(4);
    expect(byId(r, 'D').finalRank).toBe(3);
    // les éliminateurs ne changent pas : points d'élimination inchangés
    expect(byId(r, 'A').eliminationsCount).toBe(3);
    expect(byId(r, 'B').eliminationsCount).toBe(1);
  });

  it("une sortie AUTO (bust sans recave) ne rapporte ni point d'élimination ni bonus", () => {
    const s = baseState();
    s.exits[0] = { ...s.exits[0], kind: 'AUTO' };
    s.busts.push({ eliminatedId: 'E', killerId: 'A', level: 4, recaveApplied: false });
    const r = computeCorrectedResults(s, ctx({ seasonLeaderAtStartId: 'E' }));
    const a = byId(r, 'A');
    expect(a.eliminationsCount).toBe(2);
    expect(a.bustEliminations).toBe(1);
    expect(a.leaderKills).toBe(0);
    expect(a.eliminationPoints).toBe(2 * 50 + 25);
    expect(r.exits[0]).toMatchObject({ isAutoElimination: true, isLeaderKill: false, eliminatorId: 'A' });
  });

  it("un abandon n'a pas d'éliminateur et ne rapporte rien", () => {
    const s = baseState();
    s.exits[0] = { ...s.exits[0], kind: 'ABANDON', eliminatorId: null };
    const r = computeCorrectedResults(s, ctx());
    expect(byId(r, 'A').eliminationsCount).toBe(2);
    expect(r.exits[0]).toMatchObject({ isAbandonment: true, eliminatorId: null });
  });

  it('attribue les bonus Leader / Top Shark / Random selon la victime', () => {
    const r = computeCorrectedResults(
      baseState(),
      ctx({ seasonLeaderAtStartId: 'C', seasonTopSharkAtStartId: 'D', randomTargetPlayerId: 'C' })
    );
    const a = byId(r, 'A'); // a éliminé C
    expect(a).toMatchObject({ leaderKills: 1, randomTargetKills: 1, topSharkLeaderKills: 0, bonusPoints: 50 + 30 });
    const b = byId(r, 'B'); // a éliminé D
    expect(b).toMatchObject({ topSharkLeaderKills: 1, bonusPoints: 40 });
  });

  it('changer un éliminateur déplace les points et bonus', () => {
    const s = baseState();
    s.exits[2] = { ...s.exits[2], eliminatorId: 'B' }; // C éliminé par B au lieu de A
    const r = computeCorrectedResults(s, ctx({ seasonLeaderAtStartId: 'C' }));
    expect(byId(r, 'A')).toMatchObject({ eliminationsCount: 2, leaderKills: 0 });
    expect(byId(r, 'B')).toMatchObject({ eliminationsCount: 2, leaderKills: 1 });
  });

  it('applique le malus de recave (light = 0.5)', () => {
    const s = baseState();
    s.rebuys.find((r) => r.playerId === 'C')!.rebuysCount = 3;
    s.rebuys.find((r) => r.playerId === 'D')!.lightRebuyUsed = true;
    s.rebuys.find((r) => r.playerId === 'D')!.rebuysCount = 1;
    const r = computeCorrectedResults(s, ctx());
    expect(byId(r, 'C').penaltyPoints).toBe(-100); // 3 - 1 gratuite = 2 × -50
    expect(byId(r, 'D').penaltyPoints).toBe(-25);  // 1.5 - 1 = 0.5 × -50
    expect(byId(r, 'C').totalPoints).toBe(700 - 100);
  });

  it("ne donne pas de points à un tournoi hors championnat (malus conservé)", () => {
    const s = baseState();
    s.rebuys.find((r) => r.playerId === 'A')!.rebuysCount = 2;
    const r = computeCorrectedResults(s, ctx({ type: 'CASUAL' }));
    expect(byId(r, 'A')).toMatchObject({ rankPoints: 0, eliminationPoints: 0, bonusPoints: 0, penaltyPoints: -50, totalPoints: -50 });
  });

  it('les gains suivent la place : config du tournoi, sinon gains stockés par place', () => {
    const s = baseState();
    [s.exits[3], s.exits[2]] = [s.exits[2], s.exits[3]]; // B 3e, C 2e
    const withConfig = computeCorrectedResults(s, ctx({ prizeAmounts: [100, 60, 30] }));
    expect(byId(withConfig, 'C').prizeAmount).toBe(60);
    expect(byId(withConfig, 'B').prizeAmount).toBe(30);
    expect(byId(withConfig, 'D').prizeAmount).toBeNull();

    const injected = computeCorrectedResults(s, ctx({ storedPrizeByRank: { 1: 130, 2: 80, 3: 30 } }));
    expect(byId(injected, 'C').prizeAmount).toBe(80);
    expect(byId(injected, 'B').prizeAmount).toBe(30);
  });

  it('utilise la config de points détaillée si présente', () => {
    const r = computeCorrectedResults(
      baseState(),
      ctx({ season: { ...season, detailedPointsConfig: { type: 'DETAILED', byRank: { '1': 2000 }, rank19Plus: 7 } } })
    );
    expect(byId(r, 'A').rankPoints).toBe(2000);
    expect(byId(r, 'B').rankPoints).toBe(7);
  });
});

describe('diffPlayers', () => {
  it('ne liste que les champs modifiés', () => {
    const r = computeCorrectedResults(baseState(), ctx());
    const stored = r.players.map((p) => ({ ...p }));
    stored.find((p) => p.playerId === 'B')!.totalPoints = 999;
    expect(diffPlayers(stored, r.players)).toEqual([
      { playerId: 'B', changes: [{ field: 'totalPoints', before: 999, after: 1050 }] },
    ]);
  });
});

describe('buildStateFromDb', () => {
  const tps = [
    { id: 'tpA', playerId: 'A', finalRank: 1, rebuysCount: 0, lightRebuyUsed: false },
    { id: 'tpB', playerId: 'B', finalRank: 2, rebuysCount: 1, lightRebuyUsed: true },
    { id: 'tpC', playerId: 'C', finalRank: 3, rebuysCount: 0, lightRebuyUsed: false },
  ];

  it("reconstruit l'ordre de sortie, les types et les busts", () => {
    const { state, warnings } = buildStateFromDb(
      tps,
      [
        { id: 'e2', eliminatedId: 'B', eliminatorId: 'A', rank: 2, level: 9, isAutoElimination: false, isAbandonment: false },
        { id: 'e3', eliminatedId: 'C', eliminatorId: 'B', rank: 3, level: 4, isAutoElimination: true, isAbandonment: false },
      ],
      [{ id: 'b1', eliminatedId: 'tpC', killerId: 'tpB', level: 3, recaveApplied: true }]
    );
    expect(warnings).toEqual([]);
    expect(state.exits).toEqual([
      { id: 'e3', eliminatedId: 'C', eliminatorId: 'B', kind: 'AUTO', level: 4 },
      { id: 'e2', eliminatedId: 'B', eliminatorId: 'A', kind: 'ELIMINATION', level: 9 },
    ]);
    expect(state.busts).toEqual([{ id: 'b1', eliminatedId: 'C', killerId: 'B', level: 3, recaveApplied: true }]);
    expect(state.rebuys[1]).toEqual({ playerId: 'B', rebuysCount: 1, lightRebuyUsed: true });
  });

  it('signale une sortie sans ligne Elimination', () => {
    const { state, warnings } = buildStateFromDb(
      tps,
      [{ id: 'e2', eliminatedId: 'B', eliminatorId: 'A', rank: 2, level: 9, isAutoElimination: false, isAbandonment: false }],
      []
    );
    expect(warnings.length).toBe(1);
    expect(state.exits[0]).toEqual({ eliminatedId: 'C', eliminatorId: null, kind: 'ELIMINATION', level: 1 });
    expect(validateCorrectionState(state, ['A', 'B', 'C']).length).toBeGreaterThan(0);
  });
});

describe('summarizeStateChanges', () => {
  it('décrit les changements de manière lisible', () => {
    const before = baseState();
    const after = baseState();
    [after.exits[1], after.exits[2]] = [after.exits[2], after.exits[1]];
    after.exits[0] = { ...after.exits[0], eliminatorId: 'B' };
    after.busts.push({ eliminatedId: 'E', killerId: 'A', level: 2, recaveApplied: true });
    after.rebuys[4].rebuysCount = 1;
    const lines = summarizeStateChanges(before, after, (id) => `Joueur ${id}`);
    expect(lines).toEqual(
      expect.arrayContaining([
        'Joueur C : 3e → 4e',
        'Joueur D : 4e → 3e',
        'Joueur E : éliminateur Joueur A → Joueur B',
        'Bust ajouté : Joueur E par Joueur A (niv. 2)',
        'Joueur E : recaves 0 → 1',
      ])
    );
  });
});
