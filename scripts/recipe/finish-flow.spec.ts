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
  loginAdmin, createSandbox, startTournament, patchAndAssert, finishTournament,
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
  // CRITICAL: rebuyEndLevel=0 persistence
  // ─────────────────────────────────────────────────────────────────────────
  test('03 - PATCH rebuyEndLevel=0 and verify persistence', async () => {
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
  // BUSTS (recave period)
  // ─────────────────────────────────────────────────────────────────────────
  test('04 - Register busts (P4, P3 by P1)', async () => {
    const busts = [
      { eliminatedId: ids.playerIds[3], killerId: ids.playerIds[0] },
      { eliminatedId: ids.playerIds[2], killerId: ids.playerIds[0] },
    ];

    for (let i = 0; i < busts.length; i++) {
      const { ok } = await client.assertOk(
        `Bust P${4 - i} by P1`,
        'POST',
        `/api/tournaments/${ids.tournamentId}/busts`,
        busts[i]
      );
      expect(ok).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL: Eliminations after recave closed
  // ─────────────────────────────────────────────────────────────────────────
  test('05 - Eliminations (P4 rank 4, P3 rank 3)', async () => {
    const elims = [
      { eliminatorId: ids.playerIds[0], eliminatedId: ids.playerIds[3] },
      { eliminatorId: ids.playerIds[0], eliminatedId: ids.playerIds[2] },
    ];

    for (let i = 0; i < elims.length; i++) {
      const rank = 4 - i;
      const { ok, data } = await client.assertOk(
        `Elimination P${5 - rank} (rank ${rank})`,
        'POST',
        `/api/tournaments/${ids.tournamentId}/eliminations`,
        elims[i]
      );

      if (!ok) {
        // Diagnostic output for debugging
        const errData = data as { error?: string; currentLevel?: number; rebuyEndLevel?: number | null };
        console.log(`   [DIAG] error=${errData.error}, currentLevel=${errData.currentLevel}, rebuyEndLevel=${errData.rebuyEndLevel}`);
      }

      expect(ok).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // CRITICAL: FINISHED status
  // ─────────────────────────────────────────────────────────────────────────
  test('06 - Finish tournament (P1=1st, P2=2nd)', async () => {
    const ok = await finishTournament(client, reporter, ids.tournamentId, ids.playerIds, 0, 1);
    expect(ok).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // FINAL VERIFICATION
  // ─────────────────────────────────────────────────────────────────────────
  test('07 - Final verification', async () => {
    const { data } = await client.get(`/api/tournaments/${ids.tournamentId}`);
    const t = data as {
      status?: string;
      rebuyEndLevel?: number | null;
      tournamentPlayers?: Array<{ finalRank: number | null }>;
    };

    const isFinished = t.status === 'FINISHED';
    const rebuyPersisted = t.rebuyEndLevel === 0;
    const players = t.tournamentPlayers || [];
    const allRanksSet = players.filter(p => p.finalRank !== null).length === 4;

    if (isFinished && rebuyPersisted && allRanksSet) {
      reporter.ok('Final verification', `status=${t.status}, rebuyEndLevel=${t.rebuyEndLevel}, ranks=4/4`);
    } else {
      reporter.fail('Final verification', `status=${t.status}, rebuyEndLevel=${t.rebuyEndLevel}, ranks=${players.filter(p => p.finalRank !== null).length}/4`);
    }

    expect(isFinished).toBe(true);
    expect(rebuyPersisted).toBe(true);
    expect(allRanksSet).toBe(true);
  });
});
