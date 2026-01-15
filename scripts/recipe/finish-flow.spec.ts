/**
 * FINISH-FLOW GUARD - rebuyEndLevel=0 + eliminations + FINISHED
 *
 * Guards against regression of the prod bug:
 * - rebuyEndLevel=0 not persisted (returned null on GET)
 * - Eliminations blocked during "open" recave period
 * - Tournament could not transition to FINISHED
 *
 * Usage: npm run recipe:finish-flow
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import {
  CONFIG, makePrefix, Reporter, RecipeClient,
  loginAdmin, createSandbox, startTournament, patchAndAssert,
  type SandboxIds
} from './helpers';

const PREFIX = makePrefix('FF_');

test.describe.serial('FINISH-FLOW GUARD', () => {
  let page: Page;
  let api: APIRequestContext;
  let client: RecipeClient;
  const reporter = new Reporter();
  let ids: SandboxIds;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    page = await ctx.newPage();
    api = ctx.request;

    reporter.banner('FINISH-FLOW GUARD', {
      URL: CONFIG.BASE_URL,
      'Test ID': PREFIX,
    });
  });

  test.afterAll(() => {
    reporter.summary(
      'FINISH-FLOW: GUARD OK - rebuyEndLevel=0 + eliminations + FINISHED work correctly',
      'FINISH-FLOW: REGRESSION DETECTED - check tournament-utils.ts and route.ts'
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECURITY: Diag endpoint must be invisible (404 without token)
  // ─────────────────────────────────────────────────────────────────────────
  test('00 - Diag endpoint is invisible (security guard)', async () => {
    // This test ensures /api/diag/** returns 404 when RECIPE_DIAGNOSTICS is not set
    // If this test fails, diag has been accidentally exposed in prod
    const res = await api.get(`${CONFIG.BASE_URL}/api/diag/tournament/test-id`);
    const status = res.status();

    if (status === 404) {
      reporter.ok('Diag endpoint invisible', 'GET /api/diag/tournament/test-id -> 404');
    } else {
      reporter.fail('Diag endpoint EXPOSED', `GET /api/diag/tournament/test-id -> ${status} (expected 404)`);
    }

    expect(status).toBe(404);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SETUP
  // ─────────────────────────────────────────────────────────────────────────
  test('01 - Login and create sandbox', async () => {
    const cookies = await loginAdmin(page, reporter);
    client = new RecipeClient(api, cookies, reporter);
    ids = await createSandbox(client, reporter, PREFIX, 4);

    expect(ids.seasonId).toBeDefined();
    expect(ids.tournamentId).toBeDefined();
    expect(ids.playerIds.length).toBe(4);
  });

  test('02 - Start tournament', async () => {
    const ok = await startTournament(client, ids.tournamentId);
    expect(ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // BUSTS (during recave period - BEFORE closing recaves)
  // ─────────────────────────────────────────────────────────────────────────
  test('03 - Register busts during recave period (P4, P3, P2 by P1)', async () => {
    // Busts happen while recave period is still open (rebuyEndLevel not yet set)
    // P1 busts P4, P3, P2 - they can still recave
    const busts = [
      { eliminatedId: ids.playerIds[3], killerId: ids.playerIds[0] }, // P4
      { eliminatedId: ids.playerIds[2], killerId: ids.playerIds[0] }, // P3
      { eliminatedId: ids.playerIds[1], killerId: ids.playerIds[0] }, // P2
    ];

    for (let i = 0; i < busts.length; i++) {
      const playerNum = 4 - i;
      const { ok } = await client.assertOk(
        `Bust P${playerNum} by P1`,
        'POST',
        `/api/tournaments/${ids.tournamentId}/busts`,
        busts[i]
      );
      expect(ok).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL: rebuyEndLevel=0 persistence (closes recave period)
  // ─────────────────────────────────────────────────────────────────────────
  test('04 - PATCH rebuyEndLevel=0 and verify persistence', async () => {
    // Close recave period: currentLevel(1) > rebuyEndLevel(0)
    const ok = await patchAndAssert<{ rebuyEndLevel?: number | null }>(
      client, reporter,
      'rebuyEndLevel=0',
      `/api/tournaments/${ids.tournamentId}`,
      { rebuyEndLevel: 0 },
      (data) => ({
        ok: data.rebuyEndLevel === 0,
        details: data.rebuyEndLevel !== 0 ? `rebuyEndLevel=${data.rebuyEndLevel} (expected 0)` : undefined,
      })
    );
    expect(ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL: Eliminations after recave closed - auto-finish on last elimination
  // ─────────────────────────────────────────────────────────────────────────
  test('05 - Eliminations after recave closed (P4, P3, P2 -> P1 wins)', async () => {
    // Eliminate all busted players: P4 (rank 4), P3 (rank 3), P2 (rank 2)
    // When P2 is eliminated, only P1 remains -> auto-finish with P1 rank 1
    const elims = [
      { eliminatorId: ids.playerIds[0], eliminatedId: ids.playerIds[3], expectedRank: 4 }, // P4
      { eliminatorId: ids.playerIds[0], eliminatedId: ids.playerIds[2], expectedRank: 3 }, // P3
      { eliminatorId: ids.playerIds[0], eliminatedId: ids.playerIds[1], expectedRank: 2 }, // P2 -> triggers auto-finish
    ];

    for (const elim of elims) {
      const { ok, data } = await client.assertOk(
        `Elimination P${5 - elim.expectedRank} (rank ${elim.expectedRank})`,
        'POST',
        `/api/tournaments/${ids.tournamentId}/eliminations`,
        { eliminatorId: elim.eliminatorId, eliminatedId: elim.eliminatedId }
      );

      if (!ok) {
        const errData = data as { error?: string; currentLevel?: number; rebuyEndLevel?: number | null };
        console.log(`   [DIAG] error=${errData.error}, currentLevel=${errData.currentLevel}, rebuyEndLevel=${errData.rebuyEndLevel}`);
      }

      expect(ok).toBe(true);

      // Check if tournament auto-completed on last elimination
      const respData = data as { tournamentCompleted?: boolean };
      if (elim.expectedRank === 2) {
        reporter.ok('Tournament auto-completed on final elimination', `tournamentCompleted=${respData.tournamentCompleted}`);
      }
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  test('06 - Final verification', async () => {
    const { data } = await client.get(`/api/tournaments/${ids.tournamentId}`);
    const t = data as {
      status?: string;
      rebuyEndLevel?: number | null;
      tournamentPlayers?: Array<{ playerId: string; finalRank: number | null }>;
    };

    const isFinished = t.status === 'FINISHED';
    const rebuyPersisted = t.rebuyEndLevel === 0;
    const players = t.tournamentPlayers || [];
    const playersWithRank = players.filter(p => p.finalRank !== null);
    const allRanksSet = playersWithRank.length === 4;

    // Verify P1 is winner (rank 1)
    const p1 = players.find(p => p.playerId === ids.playerIds[0]);
    const p1IsWinner = p1?.finalRank === 1;

    if (isFinished && rebuyPersisted && allRanksSet && p1IsWinner) {
      reporter.ok('Final verification', `status=${t.status}, rebuyEndLevel=${t.rebuyEndLevel}, ranks=4/4, P1=rank1`);
    } else {
      reporter.fail('Final verification', `status=${t.status}, rebuyEndLevel=${t.rebuyEndLevel}, ranks=${playersWithRank.length}/4, P1rank=${p1?.finalRank}`);
    }

    expect(isFinished).toBe(true);
    expect(rebuyPersisted).toBe(true);
    expect(allRanksSet).toBe(true);
    expect(p1IsWinner).toBe(true);
  });
});
