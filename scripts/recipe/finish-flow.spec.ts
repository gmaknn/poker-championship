/**
 * RECETTE TECHNIQUE - finish-flow (PROD-SAFE)
 *
 * Scenario de garde contre la regression du bug:
 * - rebuyEndLevel=0 non persiste
 * - eliminations bloquees pendant recaves
 * - status FINISHED bloque si ranks incomplets
 *
 * Ce test isole valide le flow critique:
 * 1. Creer tournoi sandbox (RECIPE_*)
 * 2. PATCH rebuyEndLevel=0 et verifier persistance
 * 3. Enregistrer eliminations via endpoint metier
 * 4. Attribuer finalRank aux restants
 * 5. PATCH status=FINISHED et verifier
 *
 * Usage:
 *   npm run recipe:finish-flow
 *   npm run recipe:finish-flow -- --headed
 *
 * Variables d'environnement:
 *   RECIPE_BASE_URL (default: http://localhost:3003)
 *   RECIPE_ADMIN_EMAIL (default: admin@wpt-villelaure.fr)
 *   RECIPE_ADMIN_PASSWORD (default: Admin123!)
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// Configuration
const BASE_URL = process.env.RECIPE_BASE_URL || 'http://localhost:3003';
const ADMIN_EMAIL = process.env.RECIPE_ADMIN_EMAIL || 'admin@wpt-villelaure.fr';
const ADMIN_PASSWORD = process.env.RECIPE_ADMIN_PASSWORD || 'Admin123!';
const TIMESTAMP = Date.now();
const TEST_PREFIX = `RECIPE_FF_${TIMESTAMP}`;

// Resultats
interface StepResult {
  step: string;
  status: 'OK' | 'FAIL';
  details?: string;
  data?: Record<string, unknown>;
}

const results: StepResult[] = [];
let hasFailure = false;

function log(result: StepResult) {
  results.push(result);
  const icon = result.status === 'OK' ? '✅' : '❌';
  console.log(`${icon} ${result.step}`);
  if (result.details) {
    console.log(`   └─ ${result.details}`);
  }
  if (result.data) {
    console.log(`   └─ Data: ${JSON.stringify(result.data)}`);
  }
  if (result.status === 'FAIL') {
    hasFailure = true;
  }
}

// Helper pour requetes API
async function apiRequest(
  api: APIRequestContext,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  cookies: string,
  body?: unknown
): Promise<{ status: number; data: unknown; raw: string }> {
  const options: {
    headers: Record<string, string>;
    data?: unknown;
  } = {
    headers: {
      Cookie: cookies,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.data = body;
  }

  let response;
  const url = `${BASE_URL}${endpoint}`;

  switch (method) {
    case 'GET':
      response = await api.get(url, options);
      break;
    case 'POST':
      response = await api.post(url, options);
      break;
    case 'PATCH':
      response = await api.patch(url, options);
      break;
    case 'DELETE':
      response = await api.delete(url, options);
      break;
  }

  const raw = await response.text();
  let data: unknown = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return { status: response.status(), data, raw };
}

test.describe.serial('FINISH-FLOW GUARD - rebuyEndLevel=0 + eliminations + FINISHED', () => {
  let page: Page;
  let api: APIRequestContext;
  let cookies: string = '';

  // IDs crees
  let seasonId: string;
  let tournamentId: string;
  const playerIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    api = context.request;

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   FINISH-FLOW GUARD - rebuyEndLevel=0 + eliminations + FINISHED║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  URL: ${BASE_URL.padEnd(55)}║`);
    console.log(`║  Test ID: ${TEST_PREFIX.padEnd(51)}║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n');
  });

  test.afterAll(async () => {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      RAPPORT FINAL                             ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    const okCount = results.filter(r => r.status === 'OK').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;

    console.log(`\nResultats: ${okCount} OK / ${failCount} FAIL\n`);

    if (failCount > 0) {
      console.log('Etapes en echec:');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ❌ ${r.step}`);
        if (r.details) console.log(`     └─ ${r.details}`);
        if (r.data) console.log(`     └─ ${JSON.stringify(r.data)}`);
      });
    }

    console.log('\n');

    if (hasFailure) {
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║              ❌ FINISH-FLOW: REGRESSION DETECTEE              ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('\nLe bug rebuyEndLevel=0 / eliminations / FINISHED est present.');
      console.log('Verifier src/app/api/tournaments/[id]/route.ts et tournament-utils.ts\n');
    } else {
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ FINISH-FLOW: GUARD OK                         ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝');
      console.log('\nLe flow rebuyEndLevel=0 -> eliminations -> FINISHED fonctionne.\n');
    }
  });

  // ===================================================================
  // STEP 1 - Login admin
  // ===================================================================
  test('01 - Login admin', async () => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);

    const allCookies = await page.context().cookies();
    cookies = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    const { status, data } = await apiRequest(api, 'GET', '/api/me', cookies);

    if (status === 200 && (data as { id?: string }).id) {
      log({ step: '01 - Login admin', status: 'OK' });
    } else {
      log({
        step: '01 - Login admin',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(status).toBe(200);
  });

  // ===================================================================
  // STEP 2 - Creer saison sandbox
  // ===================================================================
  test('02 - Creer saison sandbox', async () => {
    const { status, data } = await apiRequest(api, 'POST', '/api/seasons', cookies, {
      name: `${TEST_PREFIX}_Season`,
      year: 2099,
      startDate: new Date().toISOString(),
      status: 'ACTIVE',
    });

    const id = (data as { id?: string }).id;
    if ((status === 200 || status === 201) && id) {
      seasonId = id;
      log({ step: '02 - Creer saison sandbox', status: 'OK', details: `ID: ${id.substring(0, 12)}...` });
    } else {
      log({
        step: '02 - Creer saison sandbox',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(seasonId).toBeDefined();
  });

  // ===================================================================
  // STEP 3 - Creer tournoi sandbox
  // ===================================================================
  test('03 - Creer tournoi sandbox', async () => {
    const { status, data } = await apiRequest(api, 'POST', '/api/tournaments', cookies, {
      seasonId,
      name: `${TEST_PREFIX}_Tournament`,
      date: new Date().toISOString(),
      buyInAmount: 10,
      startingChips: 5000,
      levelDuration: 12,
    });

    const id = (data as { id?: string }).id;
    if ((status === 200 || status === 201) && id) {
      tournamentId = id;
      log({ step: '03 - Creer tournoi sandbox', status: 'OK', details: `ID: ${id.substring(0, 12)}...` });
    } else {
      log({
        step: '03 - Creer tournoi sandbox',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(tournamentId).toBeDefined();
  });

  // ===================================================================
  // STEP 4 - Creer 4 joueurs sandbox
  // ===================================================================
  test('04 - Creer 4 joueurs sandbox', async () => {
    for (let i = 1; i <= 4; i++) {
      const { status, data } = await apiRequest(api, 'POST', '/api/players', cookies, {
        firstName: `P${i}`,
        lastName: TEST_PREFIX,
        nickname: `${TEST_PREFIX}_P${i}`,
        status: 'ACTIVE',
      });

      const id = (data as { id?: string }).id;
      if ((status === 200 || status === 201) && id) {
        playerIds.push(id);
      }
    }

    if (playerIds.length === 4) {
      log({ step: '04 - Creer 4 joueurs sandbox', status: 'OK' });
    } else {
      log({
        step: '04 - Creer 4 joueurs sandbox',
        status: 'FAIL',
        details: `${playerIds.length}/4 crees`,
      });
    }

    expect(playerIds.length).toBe(4);
  });

  // ===================================================================
  // STEP 5 - Inscrire joueurs au tournoi
  // ===================================================================
  test('05 - Inscrire joueurs au tournoi', async () => {
    let enrolled = 0;
    for (const playerId of playerIds) {
      const { status } = await apiRequest(
        api,
        'POST',
        `/api/tournaments/${tournamentId}/players`,
        cookies,
        { playerId }
      );
      if (status === 200 || status === 201) {
        enrolled++;
      }
    }

    if (enrolled === 4) {
      log({ step: '05 - Inscrire joueurs au tournoi', status: 'OK' });
    } else {
      log({
        step: '05 - Inscrire joueurs au tournoi',
        status: 'FAIL',
        details: `${enrolled}/4 inscrits`,
      });
    }

    expect(enrolled).toBe(4);
  });

  // ===================================================================
  // STEP 6 - Demarrer tournoi (IN_PROGRESS)
  // ===================================================================
  test('06 - Demarrer tournoi', async () => {
    const { status, data } = await apiRequest(
      api,
      'PATCH',
      `/api/tournaments/${tournamentId}`,
      cookies,
      { status: 'IN_PROGRESS' }
    );

    if (status === 200) {
      log({ step: '06 - Demarrer tournoi (IN_PROGRESS)', status: 'OK' });
    } else {
      log({
        step: '06 - Demarrer tournoi (IN_PROGRESS)',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(status).toBe(200);
  });

  // ===================================================================
  // STEP 7 - PATCH rebuyEndLevel=0 (CRITIQUE)
  // ===================================================================
  test('07 - PATCH rebuyEndLevel=0', async () => {
    const { status, data } = await apiRequest(
      api,
      'PATCH',
      `/api/tournaments/${tournamentId}`,
      cookies,
      { rebuyEndLevel: 0 }
    );

    if (status === 200) {
      log({ step: '07 - PATCH rebuyEndLevel=0', status: 'OK' });
    } else {
      log({
        step: '07 - PATCH rebuyEndLevel=0',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(status).toBe(200);
  });

  // ===================================================================
  // STEP 8 - Verifier persistance rebuyEndLevel=0 (CRITIQUE)
  // ===================================================================
  test('08 - Verifier rebuyEndLevel=0 persiste', async () => {
    const { status, data } = await apiRequest(
      api,
      'GET',
      `/api/tournaments/${tournamentId}`,
      cookies
    );

    const tournament = data as {
      rebuyEndLevel?: number | null;
      currentLevel?: number;
      status?: string;
    };

    const rebuyEndLevel = tournament.rebuyEndLevel;
    const currentLevel = tournament.currentLevel;

    if (status === 200 && rebuyEndLevel === 0) {
      log({
        step: '08 - Verifier rebuyEndLevel=0 persiste',
        status: 'OK',
        data: { rebuyEndLevel, currentLevel, tournamentStatus: tournament.status },
      });
    } else {
      log({
        step: '08 - Verifier rebuyEndLevel=0 persiste',
        status: 'FAIL',
        details: `rebuyEndLevel=${rebuyEndLevel} (attendu: 0)`,
        data: { rebuyEndLevel, currentLevel, type: typeof rebuyEndLevel },
      });
    }

    expect(rebuyEndLevel).toBe(0);
  });

  // ===================================================================
  // STEP 9 - Enregistrer bust P4 par P1 (recave period)
  // ===================================================================
  test('09 - Bust P4 par P1', async () => {
    const { status, data } = await apiRequest(
      api,
      'POST',
      `/api/tournaments/${tournamentId}/busts`,
      cookies,
      { eliminatedId: playerIds[3], killerId: playerIds[0] }
    );

    if (status === 200 || status === 201) {
      log({ step: '09 - Bust P4 par P1', status: 'OK' });
    } else {
      log({
        step: '09 - Bust P4 par P1',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect([200, 201]).toContain(status);
  });

  // ===================================================================
  // STEP 10 - Bust P3 par P1
  // ===================================================================
  test('10 - Bust P3 par P1', async () => {
    const { status, data } = await apiRequest(
      api,
      'POST',
      `/api/tournaments/${tournamentId}/busts`,
      cookies,
      { eliminatedId: playerIds[2], killerId: playerIds[0] }
    );

    if (status === 200 || status === 201) {
      log({ step: '10 - Bust P3 par P1', status: 'OK' });
    } else {
      log({
        step: '10 - Bust P3 par P1',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect([200, 201]).toContain(status);
  });

  // ===================================================================
  // STEP 11 - Elimination definitive P4 (rank 4) via endpoint metier
  // ===================================================================
  test('11 - Elimination P4 (rank 4)', async () => {
    const { status, data } = await apiRequest(
      api,
      'POST',
      `/api/tournaments/${tournamentId}/eliminations`,
      cookies,
      { eliminatorId: playerIds[0], eliminatedId: playerIds[3] }
    );

    if (status === 200 || status === 201) {
      log({ step: '11 - Elimination P4 (rank 4)', status: 'OK' });
    } else {
      // Diagnostic: afficher les details de l'erreur
      const errorData = data as {
        error?: string;
        currentLevel?: number;
        rebuyEndLevel?: number | null;
      };
      log({
        step: '11 - Elimination P4 (rank 4)',
        status: 'FAIL',
        details: `HTTP ${status} - ${errorData.error || 'Unknown error'}`,
        data: {
          error: errorData.error,
          currentLevel: errorData.currentLevel,
          rebuyEndLevel: errorData.rebuyEndLevel,
        },
      });
    }

    expect([200, 201]).toContain(status);
  });

  // ===================================================================
  // STEP 12 - Elimination definitive P3 (rank 3)
  // ===================================================================
  test('12 - Elimination P3 (rank 3)', async () => {
    const { status, data } = await apiRequest(
      api,
      'POST',
      `/api/tournaments/${tournamentId}/eliminations`,
      cookies,
      { eliminatorId: playerIds[0], eliminatedId: playerIds[2] }
    );

    if (status === 200 || status === 201) {
      log({ step: '12 - Elimination P3 (rank 3)', status: 'OK' });
    } else {
      const errorData = data as {
        error?: string;
        currentLevel?: number;
        rebuyEndLevel?: number | null;
      };
      log({
        step: '12 - Elimination P3 (rank 3)',
        status: 'FAIL',
        details: `HTTP ${status} - ${errorData.error || 'Unknown error'}`,
        data: {
          error: errorData.error,
          currentLevel: errorData.currentLevel,
          rebuyEndLevel: errorData.rebuyEndLevel,
        },
      });
    }

    expect([200, 201]).toContain(status);
  });

  // ===================================================================
  // STEP 13 - Attribuer finalRank P2 = 2
  // ===================================================================
  test('13 - Attribuer finalRank P2 = 2', async () => {
    const { status, data } = await apiRequest(
      api,
      'PATCH',
      `/api/tournaments/${tournamentId}/players/${playerIds[1]}`,
      cookies,
      { finalRank: 2 }
    );

    if (status === 200) {
      log({ step: '13 - Attribuer finalRank P2 = 2', status: 'OK' });
    } else {
      log({
        step: '13 - Attribuer finalRank P2 = 2',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(status).toBe(200);
  });

  // ===================================================================
  // STEP 14 - Attribuer finalRank P1 = 1 (winner)
  // ===================================================================
  test('14 - Attribuer finalRank P1 = 1', async () => {
    const { status, data } = await apiRequest(
      api,
      'PATCH',
      `/api/tournaments/${tournamentId}/players/${playerIds[0]}`,
      cookies,
      { finalRank: 1 }
    );

    if (status === 200) {
      log({ step: '14 - Attribuer finalRank P1 = 1 (winner)', status: 'OK' });
    } else {
      log({
        step: '14 - Attribuer finalRank P1 = 1 (winner)',
        status: 'FAIL',
        details: `HTTP ${status}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(status).toBe(200);
  });

  // ===================================================================
  // STEP 15 - PATCH status=FINISHED (CRITIQUE)
  // ===================================================================
  test('15 - PATCH status=FINISHED', async () => {
    const { status, data } = await apiRequest(
      api,
      'PATCH',
      `/api/tournaments/${tournamentId}`,
      cookies,
      { status: 'FINISHED' }
    );

    if (status === 200) {
      log({ step: '15 - PATCH status=FINISHED', status: 'OK' });
    } else {
      const errorData = data as { error?: string };
      log({
        step: '15 - PATCH status=FINISHED',
        status: 'FAIL',
        details: `HTTP ${status} - ${errorData.error || 'Unknown error'}`,
        data: data as Record<string, unknown>,
      });
    }

    expect(status).toBe(200);
  });

  // ===================================================================
  // STEP 16 - Verification finale
  // ===================================================================
  test('16 - Verification finale: status FINISHED + tous ranks valides', async () => {
    const { status, data } = await apiRequest(
      api,
      'GET',
      `/api/tournaments/${tournamentId}`,
      cookies
    );

    const tournament = data as {
      status?: string;
      rebuyEndLevel?: number | null;
      tournamentPlayers?: Array<{ playerId: string; finalRank: number | null }>;
    };

    const tournamentStatus = tournament.status;
    const rebuyEndLevel = tournament.rebuyEndLevel;
    const players = tournament.tournamentPlayers || [];
    const playersWithRank = players.filter(p => p.finalRank !== null);

    const allRanksValid = playersWithRank.length === 4;
    const isFinished = tournamentStatus === 'FINISHED';
    const rebuyPersisted = rebuyEndLevel === 0;

    if (status === 200 && isFinished && allRanksValid && rebuyPersisted) {
      log({
        step: '16 - Verification finale',
        status: 'OK',
        data: {
          status: tournamentStatus,
          rebuyEndLevel,
          playersWithRank: playersWithRank.length,
        },
      });
    } else {
      log({
        step: '16 - Verification finale',
        status: 'FAIL',
        details: `status=${tournamentStatus}, rebuyEndLevel=${rebuyEndLevel}, ranks=${playersWithRank.length}/4`,
        data: {
          isFinished,
          rebuyPersisted,
          allRanksValid,
        },
      });
    }

    expect(isFinished).toBe(true);
    expect(rebuyPersisted).toBe(true);
    expect(allRanksValid).toBe(true);
  });
});
