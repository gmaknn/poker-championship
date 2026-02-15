/**
 * RECETTE TECHNIQUE - Poker Championship (PROD-SAFE)
 *
 * Runner E2E deterministe pour valider les parcours critiques :
 * - Auth/API : aucun HTML sur /api/*, codes HTTP corrects (y compris 401/403)
 * - Parcours data : saison -> tournoi -> joueurs -> KO -> fin -> scoring -> classement
 * - Persistance : flags blinds rebalanceTables + isRebuyEnd
 * - Scoring : assertions numeriques strictes (pas d'adaptation)
 *
 * PROD-SAFE :
 * - Cree systematiquement ses propres donnees (jamais de reutilisation)
 * - Cleanup automatique via reset:prod si cible != localhost
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const BASE_URL = process.env.RECIPE_BASE_URL || 'http://localhost:3003';
const ADMIN_EMAIL = process.env.RECIPE_ADMIN_EMAIL || 'admin@wpt-villelaure.fr';
const ADMIN_PASSWORD = process.env.RECIPE_ADMIN_PASSWORD || 'Admin123!';
const TIMESTAMP = Date.now();
const TEST_PREFIX = `RECIPE_${TIMESTAMP}`;

// Prod-safe: reset automatique si non-localhost
const IS_PROD = !BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1');
const RESET_DISABLED = process.env.RECIPE_RESET_AFTER_RUN === 'false';
const RESET_REQUIRED = IS_PROD && !RESET_DISABLED;

// Scoring defaults from schema.prisma (Season.eliminationPoints @default(50))
// NOTE: Si ce parametre devient configurable dynamiquement, ajuster cette source
const SCHEMA_DEFAULT_ELIMINATION_POINTS = 50;
const SCHEMA_DEFAULT_LEADER_KILLER_BONUS = 25;

// Resultats de la recette
interface RecipeResult {
  step: string;
  status: 'OK' | 'KO';
  details?: string;
  endpoint?: string;
  httpStatus?: number;
  body?: string;
}

const results: RecipeResult[] = [];
let resetExecuted = false;

function logResult(result: RecipeResult) {
  results.push(result);
  const icon = result.status === 'OK' ? '✅' : '❌';
  console.log(`${icon} ${result.step}`);
  if (result.status === 'KO' && result.details) {
    console.log(`   └─ ${result.details}`);
    if (result.endpoint) console.log(`   └─ Endpoint: ${result.endpoint}`);
    if (result.httpStatus) console.log(`   └─ HTTP Status: ${result.httpStatus}`);
    if (result.body) console.log(`   └─ Body: ${result.body.substring(0, 200)}...`);
  }
}

// Helper : verifie qu'une reponse API est JSON et pas HTML
async function assertJsonResponse(
  response: { status: () => number; headers: () => { [key: string]: string }; text: () => Promise<string> },
  stepName: string,
  endpoint: string,
  expectedStatuses: number[] = [200, 201]
): Promise<{ ok: boolean; data?: unknown; body?: string }> {
  const status = response.status();
  const contentType = response.headers()['content-type'] || '';
  const body = await response.text();

  // Verifier que ce n'est pas du HTML
  const bodyLower = body.trim().toLowerCase();
  if (bodyLower.startsWith('<') || bodyLower.startsWith('<!doctype') || bodyLower.includes('<html')) {
    logResult({
      step: stepName,
      status: 'KO',
      details: 'Reponse HTML detectee au lieu de JSON',
      endpoint,
      httpStatus: status,
      body,
    });
    return { ok: false, body };
  }

  // Verifier Content-Type
  if (!contentType.includes('application/json')) {
    logResult({
      step: stepName,
      status: 'KO',
      details: `Content-Type incorrect: ${contentType}`,
      endpoint,
      httpStatus: status,
      body,
    });
    return { ok: false, body };
  }

  // Verifier status code
  if (!expectedStatuses.includes(status)) {
    logResult({
      step: stepName,
      status: 'KO',
      details: `Status HTTP inattendu: ${status} (attendu: ${expectedStatuses.join('/')})`,
      endpoint,
      httpStatus: status,
      body,
    });
    return { ok: false, body };
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    logResult({
      step: stepName,
      status: 'KO',
      details: 'JSON invalide',
      endpoint,
      httpStatus: status,
      body,
    });
    return { ok: false, body };
  }

  logResult({ step: stepName, status: 'OK' });
  return { ok: true, data, body };
}

test.describe.serial('RECETTE TECHNIQUE - Poker Championship (PROD-SAFE)', () => {
  let page: Page;
  let apiContext: APIRequestContext;
  let sessionCookies: string = '';

  // IDs crees pendant la recette
  let seasonId: string;
  let tournamentId: string;
  const playerIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Creer un contexte de navigateur pour le login
    const context = await browser.newContext();
    page = await context.newPage();
    apiContext = context.request;

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      RECETTE TECHNIQUE - POKER CHAMPIONSHIP (PROD-SAFE)    ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Base URL: ${BASE_URL.padEnd(47)}║`);
    console.log(`║  Admin: ${ADMIN_EMAIL.padEnd(50)}║`);
    console.log(`║  Test ID: ${TEST_PREFIX.padEnd(48)}║`);
    console.log(`║  Mode: ${(IS_PROD ? 'PRODUCTION' : 'LOCAL').padEnd(51)}║`);
    console.log(`║  Reset requis: ${(RESET_REQUIRED ? 'OUI' : 'NON').padEnd(43)}║`);
    console.log(`║  Reset desactive: ${(RESET_DISABLED ? 'OUI (explicite)' : 'NON').padEnd(40)}║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
  });

  test.afterAll(async () => {
    // Rapport final
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    RAPPORT FINAL                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const okCount = results.filter(r => r.status === 'OK').length;
    const koCount = results.filter(r => r.status === 'KO').length;

    console.log(`\nResultats: ${okCount} OK / ${koCount} KO\n`);

    if (koCount > 0) {
      console.log('Etapes en echec:');
      results.filter(r => r.status === 'KO').forEach(r => {
        console.log(`  ❌ ${r.step}: ${r.details}`);
      });
    }

    console.log('\n');

    // Verdict final avec prise en compte du reset
    // NO-GO si: tests KO OU (reset requis ET non execute)
    const resetFailure = RESET_REQUIRED && !resetExecuted;

    if (koCount > 0 || resetFailure) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          ❌ VERDICT: NO-GO TECHNIQUE                       ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      if (resetFailure && koCount === 0) {
        console.log('\nCause: Reset prod requis mais non execute.');
        console.log('Solution: Fournir PROD_RESET_TOKEN ou executer manuellement:');
        console.log('  flyctl ssh console --app wpt-villelaure');
        console.log('  ALLOW_PROD_RESET=YES PROD_RESET_TOKEN=<token> npm run reset:prod');
      }
    } else if (RESET_DISABLED && IS_PROD) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ VERDICT: GO TECHNIQUE (RESET DESACTIVE)                ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log('║  RECIPE_RESET_AFTER_RUN=false : reset volontairement omis  ║');
      console.log('║  Les donnees RECIPE_* restent en base.                     ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          ✅ VERDICT: GO TECHNIQUE                          ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    }
    console.log('\n');
  });

  // ===================================================================
  // TEST 00 - Verification API non-auth (401/403 + JSON, jamais HTML)
  // ===================================================================
  test('00 - API non-auth retourne 401/403 en JSON (jamais HTML)', async ({ browser }) => {
    // Creer un contexte SANS cookies de session
    const freshContext = await browser.newContext();
    const freshApi = freshContext.request;

    const response = await freshApi.get(`${BASE_URL}/api/me`);
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';
    const body = await response.text();
    const bodyLower = body.trim().toLowerCase();

    // Doit etre 401 ou 403 (pas 200, pas 500)
    if (status !== 401 && status !== 403) {
      logResult({
        step: '00.1 - /api/me non-auth retourne 401 ou 403',
        status: 'KO',
        details: `Status recu: ${status} (attendu: 401 ou 403)`,
        endpoint: '/api/me',
        httpStatus: status,
      });
      expect(status).toBeOneOf([401, 403]);
      return;
    }
    logResult({ step: '00.1 - /api/me non-auth retourne 401 ou 403', status: 'OK' });

    // Content-Type doit contenir application/json
    if (!contentType.includes('application/json')) {
      logResult({
        step: '00.2 - Content-Type est application/json',
        status: 'KO',
        details: `Content-Type: ${contentType}`,
        endpoint: '/api/me',
      });
      expect(contentType).toContain('application/json');
      return;
    }
    logResult({ step: '00.2 - Content-Type est application/json', status: 'OK' });

    // Body ne doit PAS contenir HTML
    if (bodyLower.startsWith('<') || bodyLower.includes('<!doctype') || bodyLower.includes('<html')) {
      logResult({
        step: '00.3 - Body ne contient pas HTML',
        status: 'KO',
        details: 'HTML detecte dans la reponse 401/403',
        endpoint: '/api/me',
        body,
      });
      expect(bodyLower).not.toContain('<html');
      return;
    }
    logResult({ step: '00.3 - Body ne contient pas HTML', status: 'OK' });

    await freshContext.close();
  });

  // ===================================================================
  // TEST 01 - Login admin et verification session
  // ===================================================================
  test('01 - Login admin et verification session', async () => {
    // Naviguer vers la page de login
    await page.goto(`${BASE_URL}/login`);

    // Remplir le formulaire
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    // Soumettre et attendre la redirection
    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => null),
      page.click('button[type="submit"]'),
    ]);

    // Recuperer les cookies de session
    const cookies = await page.context().cookies();
    sessionCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Verifier qu'on est connecte via /api/me
    const meResponse = await apiContext.get(`${BASE_URL}/api/me`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(meResponse, '01.1 - GET /api/me retourne JSON', '/api/me');

    if (result.ok && result.data) {
      // Verifier l'identite via l'email/id plutot que le role
      // (le role peut etre absent si le Player n'a pas de role explicite)
      const data = result.data as { id?: string; displayName?: string; role?: string };
      if (data.id) {
        logResult({
          step: `01.2 - Utilisateur authentifie (id: ${data.id.substring(0, 12)}...)`,
          status: 'OK',
        });
      } else {
        logResult({
          step: '01.2 - Utilisateur authentifie',
          status: 'KO',
          details: 'Pas d\'id dans la reponse /api/me',
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 02 - Health check API
  // ===================================================================
  test('02 - Verification health check API', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/health`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(response, '02 - GET /api/health retourne JSON', '/api/health');
    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 03 - Creer une saison de test
  // ===================================================================
  test('03 - Creer une saison de test', async () => {
    const seasonData = {
      name: `${TEST_PREFIX}_Season`,
      year: 2099,
      startDate: new Date().toISOString(),
      status: 'ACTIVE',
      // Valeurs de scoring explicites pour assertions deterministes
      eliminationPoints: SCHEMA_DEFAULT_ELIMINATION_POINTS,
      leaderKillerBonus: SCHEMA_DEFAULT_LEADER_KILLER_BONUS,
    };

    const response = await apiContext.post(`${BASE_URL}/api/seasons`, {
      headers: {
        Cookie: sessionCookies,
        'Content-Type': 'application/json',
      },
      data: seasonData,
    });

    const result = await assertJsonResponse(
      response,
      '03.1 - POST /api/seasons retourne JSON',
      '/api/seasons',
      [200, 201]
    );

    if (result.ok && result.data) {
      const data = result.data as { id?: string };
      if (data.id) {
        seasonId = data.id;
        logResult({ step: `03.2 - Saison creee avec ID: ${seasonId.substring(0, 12)}...`, status: 'OK' });
      } else {
        logResult({
          step: '03.2 - Saison creee avec ID',
          status: 'KO',
          details: 'Pas d\'ID dans la reponse',
        });
      }
    }

    expect(result.ok).toBe(true);
    expect(seasonId).toBeDefined();
  });

  // ===================================================================
  // TEST 04 - Verifier que la saison est active
  // ===================================================================
  test('04 - Verifier que la saison est active', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/seasons/${seasonId}`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '04.1 - GET /api/seasons/:id retourne JSON',
      `/api/seasons/${seasonId}`
    );

    if (result.ok && result.data) {
      const data = result.data as { status?: string };
      if (data.status === 'ACTIVE') {
        logResult({ step: '04.2 - Saison est bien ACTIVE', status: 'OK' });
      } else {
        logResult({
          step: '04.2 - Saison est bien ACTIVE',
          status: 'KO',
          details: `Status: ${data.status}`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 05 - Creer un tournoi rattache a la saison
  // ===================================================================
  test('05 - Creer un tournoi rattache a la saison', async () => {
    const tournamentData = {
      seasonId,
      name: `${TEST_PREFIX}_Tournament`,
      date: new Date().toISOString(),
      buyInAmount: 10,
      startingChips: 5000,
      levelDuration: 12,
    };

    const response = await apiContext.post(`${BASE_URL}/api/tournaments`, {
      headers: {
        Cookie: sessionCookies,
        'Content-Type': 'application/json',
      },
      data: tournamentData,
    });

    const result = await assertJsonResponse(
      response,
      '05.1 - POST /api/tournaments retourne JSON',
      '/api/tournaments',
      [200, 201]
    );

    if (result.ok && result.data) {
      const data = result.data as { id?: string };
      if (data.id) {
        tournamentId = data.id;
        logResult({ step: `05.2 - Tournoi cree avec ID: ${tournamentId.substring(0, 12)}...`, status: 'OK' });
      } else {
        logResult({
          step: '05.2 - Tournoi cree avec ID',
          status: 'KO',
          details: 'Pas d\'ID dans la reponse',
        });
      }
    }

    expect(result.ok).toBe(true);
    expect(tournamentId).toBeDefined();
  });

  // ===================================================================
  // TEST 06 - Configurer les blinds avec flags speciaux
  // ===================================================================
  test('06 - Configurer les blinds avec flags rebalanceTables et isRebuyEnd', async () => {
    const blindsData = [
      { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: false },
      { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: false },
      { level: 3, smallBlind: 75, bigBlind: 150, ante: 25, duration: 12, isBreak: false, rebalanceTables: true, isRebuyEnd: false },
      { level: 4, smallBlind: 0, bigBlind: 0, ante: 0, duration: 10, isBreak: true, rebalanceTables: false, isRebuyEnd: true },
      { level: 5, smallBlind: 100, bigBlind: 200, ante: 25, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: false },
      { level: 6, smallBlind: 150, bigBlind: 300, ante: 50, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: false },
    ];

    const response = await apiContext.post(`${BASE_URL}/api/tournaments/${tournamentId}/blinds`, {
      headers: {
        Cookie: sessionCookies,
        'Content-Type': 'application/json',
      },
      data: { levels: blindsData },
    });

    const result = await assertJsonResponse(
      response,
      '06 - POST /api/tournaments/:id/blinds retourne JSON',
      `/api/tournaments/${tournamentId}/blinds`,
      [200, 201]
    );

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 07 - Verifier persistance des flags blinds
  // ===================================================================
  test('07 - Verifier persistance des flags blinds apres reload', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/blinds`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '07.1 - GET /api/tournaments/:id/blinds retourne JSON',
      `/api/tournaments/${tournamentId}/blinds`
    );

    if (result.ok && result.data) {
      const levels = (result.data as { levels?: unknown[] }).levels || result.data;
      if (Array.isArray(levels)) {
        const level3 = levels.find((l: { level?: number }) => l.level === 3) as { rebalanceTables?: boolean } | undefined;
        const level4 = levels.find((l: { level?: number }) => l.level === 4) as { isBreak?: boolean; isRebuyEnd?: boolean } | undefined;

        if (level3?.rebalanceTables === true) {
          logResult({ step: '07.2 - Flag rebalanceTables persistant sur niveau 3', status: 'OK' });
        } else {
          logResult({
            step: '07.2 - Flag rebalanceTables persistant sur niveau 3',
            status: 'KO',
            details: `rebalanceTables: ${level3?.rebalanceTables}`,
          });
        }

        if (level4?.isBreak === true && level4?.isRebuyEnd === true) {
          logResult({ step: '07.3 - Pause Fin de Recave persistante sur niveau 4 (isBreak + isRebuyEnd)', status: 'OK' });
        } else {
          logResult({
            step: '07.3 - Pause Fin de Recave persistante sur niveau 4',
            status: 'KO',
            details: `isBreak: ${level4?.isBreak}, isRebuyEnd: ${level4?.isRebuyEnd}`,
          });
        }
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 08 - Creer 4 joueurs de test (JAMAIS de reutilisation)
  // ===================================================================
  test('08 - Creer 4 joueurs de test (deterministe, sans reutilisation)', async () => {
    // IMPORTANT: On cree TOUJOURS nos propres joueurs, jamais de reutilisation
    const PLAYER_COUNT = 4;

    for (let i = 1; i <= PLAYER_COUNT; i++) {
      const playerData = {
        firstName: `P${i}`,
        lastName: TEST_PREFIX,
        nickname: `${TEST_PREFIX}_P${i}`,
        status: 'ACTIVE',
      };

      const createResponse = await apiContext.post(`${BASE_URL}/api/players`, {
        headers: {
          Cookie: sessionCookies,
          'Content-Type': 'application/json',
        },
        data: playerData,
      });

      const status = createResponse.status();
      if (status === 200 || status === 201) {
        const data = await createResponse.json() as { id?: string };
        if (data.id) {
          playerIds.push(data.id);
        }
      } else {
        logResult({
          step: `08.X - Creation joueur P${i}`,
          status: 'KO',
          details: `Status: ${status}`,
          endpoint: '/api/players',
          httpStatus: status,
        });
      }
    }

    if (playerIds.length === PLAYER_COUNT) {
      logResult({ step: `08 - ${PLAYER_COUNT} joueurs RECIPE crees`, status: 'OK' });
    } else {
      logResult({
        step: `08 - ${PLAYER_COUNT} joueurs RECIPE crees`,
        status: 'KO',
        details: `Seulement ${playerIds.length}/${PLAYER_COUNT} crees`,
      });
    }

    expect(playerIds.length).toBe(PLAYER_COUNT);
  });

  // ===================================================================
  // TEST 09 - Inscrire les joueurs au tournoi
  // ===================================================================
  test('09 - Inscrire les joueurs au tournoi', async () => {
    for (const playerId of playerIds) {
      const response = await apiContext.post(`${BASE_URL}/api/tournaments/${tournamentId}/players`, {
        headers: {
          Cookie: sessionCookies,
          'Content-Type': 'application/json',
        },
        data: { playerId },
      });

      const status = response.status();
      if (status !== 200 && status !== 201) {
        logResult({
          step: `09.X - Inscription joueur`,
          status: 'KO',
          details: `Status: ${status}`,
          endpoint: `/api/tournaments/${tournamentId}/players`,
        });
      }
    }

    // Verifier la liste des joueurs inscrits
    const verifyResponse = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/players`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      verifyResponse,
      '09.1 - GET /api/tournaments/:id/players retourne JSON',
      `/api/tournaments/${tournamentId}/players`
    );

    if (result.ok && result.data) {
      const enrolledPlayers = (result.data as { players?: unknown[] }).players || result.data;
      if (Array.isArray(enrolledPlayers) && enrolledPlayers.length === 4) {
        logResult({ step: '09.2 - 4 joueurs inscrits au tournoi', status: 'OK' });
      } else {
        logResult({
          step: '09.2 - 4 joueurs inscrits au tournoi',
          status: 'KO',
          details: `${Array.isArray(enrolledPlayers) ? enrolledPlayers.length : 0} joueurs (attendu: 4)`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 10 - Demarrer le tournoi
  // ===================================================================
  test('10 - Demarrer le tournoi', async () => {
    const response = await apiContext.patch(`${BASE_URL}/api/tournaments/${tournamentId}`, {
      headers: {
        Cookie: sessionCookies,
        'Content-Type': 'application/json',
      },
      data: { status: 'IN_PROGRESS' },
    });

    const result = await assertJsonResponse(
      response,
      '10 - PATCH /api/tournaments/:id (status: IN_PROGRESS)',
      `/api/tournaments/${tournamentId}`
    );

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 11 - Enregistrer des busts pendant periode de recaves (P1 bust P3 et P4)
  // ===================================================================
  test('11 - Enregistrer des busts pendant recaves (P1 bust P3 et P4)', async () => {
    // Flow prod : pendant la periode de recaves, on enregistre des "pertes de tapis" (busts)
    // Les busts ne donnent pas de finalRank - le joueur peut faire une recave
    // Scenario : P1 bust P4 puis P3 (2 busts)

    const busts = [
      { eliminatedId: playerIds[3], killerId: playerIds[0] }, // P1 bust P4
      { eliminatedId: playerIds[2], killerId: playerIds[0] }, // P1 bust P3
    ];

    for (let i = 0; i < busts.length; i++) {
      const bust = busts[i];
      const response = await apiContext.post(`${BASE_URL}/api/tournaments/${tournamentId}/busts`, {
        headers: {
          Cookie: sessionCookies,
          'Content-Type': 'application/json',
        },
        data: bust,
      });

      await assertJsonResponse(
        response,
        `11.${i + 1} - POST bust P${4 - i} par P1`,
        `/api/tournaments/${tournamentId}/busts`,
        [200, 201]
      );
    }
  });

  // ===================================================================
  // TEST 11b - Verifier les busts enregistres
  // ===================================================================
  test('11b - Verifier les busts enregistres', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/busts`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '11b.1 - GET /api/tournaments/:id/busts retourne JSON',
      `/api/tournaments/${tournamentId}/busts`
    );

    if (result.ok && result.data) {
      const busts = result.data as unknown[];
      if (Array.isArray(busts) && busts.length === 2) {
        logResult({ step: '11b.2 - 2 busts enregistres', status: 'OK' });
      } else {
        logResult({
          step: '11b.2 - 2 busts enregistres',
          status: 'KO',
          details: `${Array.isArray(busts) ? busts.length : 0} busts (attendu: 2)`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 11c - Fermer la periode de recaves
  // ===================================================================
  test('11c - Fermer la periode de recaves', async () => {
    // On definit rebuyEndLevel = 0 pour que currentLevel (1) > rebuyEndLevel (0) => recaves fermees
    // Apres cela, les joueurs bustes sans recave peuvent etre elimines definitivement
    const response = await apiContext.patch(`${BASE_URL}/api/tournaments/${tournamentId}`, {
      headers: {
        Cookie: sessionCookies,
        'Content-Type': 'application/json',
      },
      data: { rebuyEndLevel: 0 },
    });

    const result = await assertJsonResponse(
      response,
      '11c - PATCH /api/tournaments/:id (rebuyEndLevel: 0)',
      `/api/tournaments/${tournamentId}`
    );

    // DEBUG: Verifier que rebuyEndLevel a ete persiste
    if (result.ok) {
      const verifyResponse = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}`, {
        headers: { Cookie: sessionCookies },
      });
      const verifyData = await verifyResponse.json() as {
        currentLevel?: number;
        rebuyEndLevel?: number | null;
        status?: string;
      };
      console.log('   [DEBUG 11c] Verification apres PATCH rebuyEndLevel=0:', {
        currentLevel: verifyData.currentLevel,
        rebuyEndLevel: verifyData.rebuyEndLevel,
        rebuyEndLevelType: typeof verifyData.rebuyEndLevel,
        status: verifyData.status,
        recavesShoudBeClosed: (verifyData.currentLevel || 0) > (verifyData.rebuyEndLevel ?? Infinity),
      });

      if (verifyData.rebuyEndLevel !== 0) {
        logResult({
          step: '11c.verify - rebuyEndLevel persiste comme 0',
          status: 'KO',
          details: `rebuyEndLevel=${verifyData.rebuyEndLevel} (type: ${typeof verifyData.rebuyEndLevel})`,
        });
      } else {
        logResult({
          step: '11c.verify - rebuyEndLevel persiste comme 0',
          status: 'OK',
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 11d - Convertir les busts en eliminations definitives
  // ===================================================================
  test('11d - Convertir les busts en eliminations definitives', async () => {
    // Apres fermeture des recaves, les joueurs bustes sans recave sont elimines definitivement
    // POST /eliminations pour P3 et P4 (dans l'ordre inverse des busts = ordre des ranks)
    // P4 = rank 4, P3 = rank 3

    const eliminations = [
      { eliminatorId: playerIds[0], eliminatedId: playerIds[3] }, // P4 rank 4
      { eliminatorId: playerIds[0], eliminatedId: playerIds[2] }, // P3 rank 3
    ];

    for (let i = 0; i < eliminations.length; i++) {
      const elim = eliminations[i];
      const response = await apiContext.post(`${BASE_URL}/api/tournaments/${tournamentId}/eliminations`, {
        headers: {
          Cookie: sessionCookies,
          'Content-Type': 'application/json',
        },
        data: elim,
      });

      const expectedRank = 4 - i;

      // Si erreur 400, afficher les details de diagnostic
      if (response.status() === 400) {
        const errorBody = await response.json() as {
          error?: string;
          currentLevel?: number;
          rebuyEndLevel?: number | null;
        };
        console.log(`   [DIAG 11d.${i + 1}] POST /eliminations returned 400:`, {
          error: errorBody.error,
          currentLevel: errorBody.currentLevel,
          rebuyEndLevel: errorBody.rebuyEndLevel,
        });
      }

      await assertJsonResponse(
        response,
        `11d.${i + 1} - POST elimination rank ${expectedRank}`,
        `/api/tournaments/${tournamentId}/eliminations`,
        [200, 201]
      );
    }
  });

  // ===================================================================
  // TEST 12 - Verifier les eliminations enregistrees
  // ===================================================================
  test('12 - Verifier les eliminations enregistrees', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/eliminations`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '12.1 - GET /api/tournaments/:id/eliminations retourne JSON',
      `/api/tournaments/${tournamentId}/eliminations`
    );

    if (result.ok && result.data) {
      const eliminations = (result.data as { eliminations?: unknown[] }).eliminations || result.data;
      if (Array.isArray(eliminations) && eliminations.length === 2) {
        logResult({ step: '12.2 - 2 eliminations enregistrees', status: 'OK' });
      } else {
        logResult({
          step: '12.2 - 2 eliminations enregistrees',
          status: 'KO',
          details: `${Array.isArray(eliminations) ? eliminations.length : 0} eliminations (attendu: 2)`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 13 - Terminer le tournoi avec rangs finaux
  // ===================================================================
  test('13 - Terminer le tournoi', async () => {
    // Attribuer les rangs finaux aux 2 joueurs restants
    // P1 = rank 1, P2 = rank 2
    const finalRanks = [
      { playerId: playerIds[0], rank: 1 },
      { playerId: playerIds[1], rank: 2 },
    ];

    for (const fr of finalRanks) {
      await apiContext.patch(`${BASE_URL}/api/tournaments/${tournamentId}/players/${fr.playerId}`, {
        headers: {
          Cookie: sessionCookies,
          'Content-Type': 'application/json',
        },
        data: { finalRank: fr.rank },
      });
    }

    // Passer le tournoi en FINISHED
    const response = await apiContext.patch(`${BASE_URL}/api/tournaments/${tournamentId}`, {
      headers: {
        Cookie: sessionCookies,
        'Content-Type': 'application/json',
      },
      data: { status: 'FINISHED' },
    });

    const result = await assertJsonResponse(
      response,
      '13 - PATCH /api/tournaments/:id (status: FINISHED)',
      `/api/tournaments/${tournamentId}`
    );

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 14 - Verifier les resultats du tournoi (assertions numeriques)
  // HYPOTHESE: eliminationPoints = 50 (default schema.prisma)
  // ===================================================================
  test('14 - Verifier les resultats du tournoi (scoring strict)', async () => {
    console.log(`   [Hypothese scoring] eliminationPoints = ${SCHEMA_DEFAULT_ELIMINATION_POINTS} (default schema)`);

    const response = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/results`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '14.1 - GET /api/tournaments/:id/results retourne JSON',
      `/api/tournaments/${tournamentId}/results`
    );

    if (result.ok && result.data) {
      const data = result.data as {
        results?: Array<{
          playerId?: string;
          finalRank?: number;
          totalPoints?: number;
          eliminationPoints?: number;
          rankPoints?: number;
          eliminationsCount?: number;
        }>
      };
      const tournamentResults = data.results || [];

      // Trouver P1 (playerIds[0]) dans les resultats
      const p1Result = tournamentResults.find(r => r.playerId === playerIds[0]);

      if (p1Result) {
        // P1 a fait 2 eliminations, attendu: 2 x SCHEMA_DEFAULT_ELIMINATION_POINTS
        const expectedKoPoints = 2 * SCHEMA_DEFAULT_ELIMINATION_POINTS;
        const actualKoPoints = p1Result.eliminationPoints || 0;

        if (actualKoPoints === expectedKoPoints) {
          logResult({
            step: `14.2 - P1 a ${expectedKoPoints} points KO (2 x ${SCHEMA_DEFAULT_ELIMINATION_POINTS})`,
            status: 'OK',
          });
        } else {
          logResult({
            step: `14.2 - P1 a ${expectedKoPoints} points KO`,
            status: 'KO',
            details: `eliminationPoints: ${actualKoPoints} (attendu: ${expectedKoPoints})`,
          });
        }

        // P1 est rank 1, donc doit avoir des rankPoints > 0
        if ((p1Result.rankPoints || 0) > 0) {
          logResult({ step: '14.3 - P1 (rank 1) a des rankPoints > 0', status: 'OK' });
        } else {
          logResult({
            step: '14.3 - P1 (rank 1) a des rankPoints > 0',
            status: 'KO',
            details: `rankPoints: ${p1Result.rankPoints}`,
          });
        }

        // totalPoints doit etre >= rankPoints + eliminationPoints
        const total = p1Result.totalPoints || 0;
        const expectedMin = (p1Result.rankPoints || 0) + (p1Result.eliminationPoints || 0);
        if (total >= expectedMin) {
          logResult({ step: '14.4 - totalPoints >= rankPoints + eliminationPoints', status: 'OK' });
        } else {
          logResult({
            step: '14.4 - totalPoints >= rankPoints + eliminationPoints',
            status: 'KO',
            details: `totalPoints: ${total}, attendu min: ${expectedMin}`,
          });
        }
      } else {
        logResult({
          step: '14.2 - P1 trouve dans les resultats',
          status: 'KO',
          details: 'P1 non trouve',
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 15 - Verifier le classement de la saison
  // ===================================================================
  test('15 - Verifier le classement de la saison', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/seasons/${seasonId}/leaderboard`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '15.1 - GET /api/seasons/:id/leaderboard retourne JSON',
      `/api/seasons/${seasonId}/leaderboard`
    );

    if (result.ok && result.data) {
      const data = result.data as {
        leaderboard?: Array<{
          playerId?: string;
          totalPoints?: number;
          player?: { id?: string; nickname?: string };
        }>
      };
      const leaderboard = data.leaderboard || [];

      // Le classement doit contenir nos joueurs RECIPE
      const recipeEntries = leaderboard.filter(e =>
        e.player?.nickname?.startsWith(TEST_PREFIX) || playerIds.includes(e.playerId || '')
      );

      if (recipeEntries.length >= 2) {
        logResult({ step: `15.2 - ${recipeEntries.length} joueurs RECIPE dans le classement`, status: 'OK' });

        // P1 devrait etre premier (plus de points = rank 1 + 2 KO)
        const p1Entry = recipeEntries.find(e => e.playerId === playerIds[0] || e.player?.id === playerIds[0]);
        const p2Entry = recipeEntries.find(e => e.playerId === playerIds[1] || e.player?.id === playerIds[1]);

        if (p1Entry && p2Entry) {
          const p1Points = p1Entry.totalPoints || 0;
          const p2Points = p2Entry.totalPoints || 0;

          if (p1Points > p2Points) {
            logResult({ step: `15.3 - P1 (${p1Points} pts) > P2 (${p2Points} pts)`, status: 'OK' });
          } else {
            logResult({
              step: '15.3 - P1 a plus de points que P2',
              status: 'KO',
              details: `P1: ${p1Points}, P2: ${p2Points}`,
            });
          }
        }
      } else {
        logResult({
          step: '15.2 - Joueurs RECIPE dans le classement',
          status: 'KO',
          details: `${recipeEntries.length} entrees (attendu: >= 2)`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 16 - Verifier les statistiques globales
  // ===================================================================
  test('16 - Verifier les statistiques globales', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/statistics`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '16 - GET /api/statistics retourne JSON',
      '/api/statistics'
    );

    expect(result.ok).toBe(true);
  });

  // ===================================================================
  // TEST 17 - Verification finale: aucun endpoint API ne retourne du HTML
  // ===================================================================
  test('17 - Verification finale: aucun endpoint API ne retourne du HTML', async () => {
    const endpoints = [
      '/api/me',
      '/api/health',
      '/api/seasons',
      `/api/seasons/${seasonId}`,
      '/api/tournaments',
      `/api/tournaments/${tournamentId}`,
      '/api/players',
      '/api/statistics',
    ];

    let allJson = true;
    for (const endpoint of endpoints) {
      const response = await apiContext.get(`${BASE_URL}${endpoint}`, {
        headers: { Cookie: sessionCookies },
      });

      const body = await response.text();
      const contentType = response.headers()['content-type'] || '';
      const bodyLower = body.trim().toLowerCase();

      if (bodyLower.startsWith('<') || bodyLower.includes('<!doctype') || bodyLower.includes('<html') || !contentType.includes('application/json')) {
        allJson = false;
        logResult({
          step: `17.X - ${endpoint} retourne HTML`,
          status: 'KO',
          details: `Content-Type: ${contentType}`,
          endpoint,
        });
      }
    }

    if (allJson) {
      logResult({ step: '17 - Tous les endpoints API retournent JSON', status: 'OK' });
    }

    expect(allJson).toBe(true);
  });

  // ===================================================================
  // TEST 18 - CLEANUP / RESET (conditionnel prod)
  // ===================================================================
  test('18 - CLEANUP / RESET prod (si applicable)', async () => {
    // Mode local ou reset explicitement desactive
    if (!RESET_REQUIRED) {
      if (RESET_DISABLED && IS_PROD) {
        logResult({
          step: '18 - CLEANUP: Reset desactive (RECIPE_RESET_AFTER_RUN=false)',
          status: 'OK',
          details: 'Reset volontairement omis par l\'utilisateur',
        });
      } else {
        logResult({ step: '18 - CLEANUP: Non requis (mode local)', status: 'OK' });
      }
      return;
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    CLEANUP PROD                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');

    const resetToken = process.env.PROD_RESET_TOKEN;

    // PROD_RESET_TOKEN manquant => KO (pas de pollution durable acceptee)
    if (!resetToken) {
      console.log('❌ PROD_RESET_TOKEN non fourni.');
      console.log('   Le reset est OBLIGATOIRE en mode prod pour eviter la pollution.');
      console.log('   Options:');
      console.log('   1. Fournir PROD_RESET_TOKEN=<token> au lancement');
      console.log('   2. Ou desactiver explicitement: RECIPE_RESET_AFTER_RUN=false');
      console.log('');

      logResult({
        step: '18 - CLEANUP: PROD_RESET_TOKEN manquant',
        status: 'KO',
        details: 'Token requis pour reset prod. Fournir PROD_RESET_TOKEN ou RECIPE_RESET_AFTER_RUN=false',
      });

      // resetExecuted reste false => verdict NO-GO
      return;
    }

    // Si on a le token, on tente le reset via une commande locale
    // Note: cela ne fonctionne que si on execute le runner depuis un contexte
    // qui a acces a la DB prod (ex: depuis Fly SSH ou CI avec tunnel)
    try {
      console.log('Tentative de reset prod avec PROD_RESET_TOKEN...');

      const { stdout, stderr } = await execAsync(
        `ALLOW_PROD_RESET=YES PROD_RESET_TOKEN=${resetToken} npm run reset:prod`,
        { timeout: 60000 }
      );

      if (stderr && !stderr.includes('RESET COMPLETE')) {
        throw new Error(stderr);
      }

      console.log(stdout);
      resetExecuted = true;
      logResult({ step: '18 - CLEANUP: Reset prod execute avec succes', status: 'OK' });
    } catch (error) {
      console.error('Erreur lors du reset:', error);
      logResult({
        step: '18 - CLEANUP: Reset prod echoue',
        status: 'KO',
        details: String(error),
      });
    }
  });
});
