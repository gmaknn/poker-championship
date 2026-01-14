/**
 * RECETTE TECHNIQUE - Poker Championship
 *
 * Runner E2E pour valider les parcours critiques :
 * - Auth/API : aucun HTML sur /api/, codes HTTP corrects
 * - Parcours data : saison -> tournoi -> joueurs -> KO -> fin -> scoring -> classement -> stats
 * - Persistance : flags blinds rebalanceTables + isRebuyEnd
 * - Cohérence : totals/breakdowns cohérents
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

// Configuration
const BASE_URL = process.env.RECIPE_BASE_URL || 'http://localhost:3003';
const ADMIN_EMAIL = process.env.RECIPE_ADMIN_EMAIL || 'admin@wpt-villelaure.fr';
const ADMIN_PASSWORD = process.env.RECIPE_ADMIN_PASSWORD || 'Admin123!';
const TIMESTAMP = Date.now();
const TEST_PREFIX = `RECIPE_${TIMESTAMP}`;

// Résultats de la recette
interface RecipeResult {
  step: string;
  status: 'OK' | 'KO';
  details?: string;
  endpoint?: string;
  httpStatus?: number;
  body?: string;
}

const results: RecipeResult[] = [];

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

// Helper : vérifie qu'une réponse API est JSON et pas HTML
async function assertJsonResponse(
  response: { status: () => number; headers: () => { [key: string]: string }; text: () => Promise<string> },
  stepName: string,
  endpoint: string,
  expectedStatuses: number[] = [200, 201]
): Promise<{ ok: boolean; data?: unknown; body?: string }> {
  const status = response.status();
  const contentType = response.headers()['content-type'] || '';
  const body = await response.text();

  // Vérifier que ce n'est pas du HTML
  if (body.trim().startsWith('<') || body.trim().startsWith('<!DOCTYPE')) {
    logResult({
      step: stepName,
      status: 'KO',
      details: 'Réponse HTML détectée au lieu de JSON',
      endpoint,
      httpStatus: status,
      body,
    });
    return { ok: false, body };
  }

  // Vérifier Content-Type
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

  // Vérifier status code
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

test.describe('RECETTE TECHNIQUE - Poker Championship', () => {
  let page: Page;
  let apiContext: APIRequestContext;
  let sessionCookies: string = '';

  // IDs créés pendant la recette
  let seasonId: string;
  let tournamentId: string;
  const playerIds: string[] = [];

  test.beforeAll(async ({ browser }) => {
    // Créer un contexte de navigateur pour le login
    const context = await browser.newContext();
    page = await context.newPage();
    apiContext = context.request;

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          RECETTE TECHNIQUE - POKER CHAMPIONSHIP            ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Base URL: ${BASE_URL.padEnd(47)}║`);
    console.log(`║  Admin: ${ADMIN_EMAIL.padEnd(50)}║`);
    console.log(`║  Test ID: ${TEST_PREFIX.padEnd(48)}║`);
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

    console.log(`\nRésultats: ${okCount} OK / ${koCount} KO\n`);

    if (koCount > 0) {
      console.log('Étapes en échec:');
      results.filter(r => r.status === 'KO').forEach(r => {
        console.log(`  ❌ ${r.step}: ${r.details}`);
      });
    }

    console.log('\n');
    if (koCount === 0) {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          ✅ VERDICT: GO TECHNIQUE                          ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    } else {
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║          ❌ VERDICT: NO-GO TECHNIQUE                       ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
    }
    console.log('\n');
  });

  test('01 - Login admin et vérification session', async () => {
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

    // Récupérer les cookies de session
    const cookies = await page.context().cookies();
    sessionCookies = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // Vérifier qu'on est connecté via /api/me
    const meResponse = await apiContext.get(`${BASE_URL}/api/me`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(meResponse, '01.1 - GET /api/me retourne JSON', '/api/me');

    if (result.ok && result.data) {
      const data = result.data as { player?: { role?: string } };
      if (data.player?.role === 'ADMIN') {
        logResult({ step: '01.2 - Utilisateur authentifié en tant qu\'ADMIN', status: 'OK' });
      } else {
        logResult({
          step: '01.2 - Utilisateur authentifié en tant qu\'ADMIN',
          status: 'KO',
          details: `Role: ${data.player?.role || 'non défini'}`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  test('02 - Vérification health check API', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/health`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(response, '02 - GET /api/health retourne JSON', '/api/health');
    expect(result.ok).toBe(true);
  });

  test('03 - Créer une saison de test', async () => {
    const seasonData = {
      name: `${TEST_PREFIX}_Season`,
      year: 2099,
      startDate: new Date().toISOString(),
      status: 'ACTIVE',
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
        logResult({ step: `03.2 - Saison créée avec ID: ${seasonId}`, status: 'OK' });
      } else {
        logResult({
          step: '03.2 - Saison créée avec ID',
          status: 'KO',
          details: 'Pas d\'ID dans la réponse',
        });
      }
    }

    expect(result.ok).toBe(true);
    expect(seasonId).toBeDefined();
  });

  test('04 - Vérifier que la saison est active', async () => {
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

  test('05 - Créer un tournoi rattaché à la saison', async () => {
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
        logResult({ step: `05.2 - Tournoi créé avec ID: ${tournamentId}`, status: 'OK' });
      } else {
        logResult({
          step: '05.2 - Tournoi créé avec ID',
          status: 'KO',
          details: 'Pas d\'ID dans la réponse',
        });
      }
    }

    expect(result.ok).toBe(true);
    expect(tournamentId).toBeDefined();
  });

  test('06 - Configurer les blinds avec flags rebalanceTables et isRebuyEnd', async () => {
    // Créer une structure de blinds
    const blindsData = [
      { level: 1, smallBlind: 25, bigBlind: 50, ante: 0, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: false },
      { level: 2, smallBlind: 50, bigBlind: 100, ante: 0, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: false },
      { level: 3, smallBlind: 75, bigBlind: 150, ante: 25, duration: 12, isBreak: false, rebalanceTables: true, isRebuyEnd: false },
      { level: 4, smallBlind: 100, bigBlind: 200, ante: 25, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: true },
      { level: 5, smallBlind: 150, bigBlind: 300, ante: 50, duration: 12, isBreak: false, rebalanceTables: false, isRebuyEnd: false },
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
      '06.1 - POST /api/tournaments/:id/blinds retourne JSON',
      `/api/tournaments/${tournamentId}/blinds`,
      [200, 201]
    );

    expect(result.ok).toBe(true);
  });

  test('07 - Vérifier persistance des flags blinds après reload', async () => {
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
        const level4 = levels.find((l: { level?: number }) => l.level === 4) as { isRebuyEnd?: boolean } | undefined;

        if (level3?.rebalanceTables === true) {
          logResult({ step: '07.2 - Flag rebalanceTables persistant sur niveau 3', status: 'OK' });
        } else {
          logResult({
            step: '07.2 - Flag rebalanceTables persistant sur niveau 3',
            status: 'KO',
            details: `rebalanceTables: ${level3?.rebalanceTables}`,
          });
        }

        if (level4?.isRebuyEnd === true) {
          logResult({ step: '07.3 - Flag isRebuyEnd persistant sur niveau 4', status: 'OK' });
        } else {
          logResult({
            step: '07.3 - Flag isRebuyEnd persistant sur niveau 4',
            status: 'KO',
            details: `isRebuyEnd: ${level4?.isRebuyEnd}`,
          });
        }
      }
    }

    expect(result.ok).toBe(true);
  });

  test('08 - Récupérer ou créer des joueurs de test', async () => {
    // D'abord récupérer les joueurs existants
    const listResponse = await apiContext.get(`${BASE_URL}/api/players`, {
      headers: { Cookie: sessionCookies },
    });

    const listResult = await assertJsonResponse(
      listResponse,
      '08.1 - GET /api/players retourne JSON',
      '/api/players'
    );

    if (listResult.ok && listResult.data) {
      const players = (listResult.data as { players?: unknown[] }).players || listResult.data;
      if (Array.isArray(players) && players.length >= 6) {
        // Utiliser les joueurs existants
        const activePlayers = players.filter((p: { status?: string }) => p.status === 'ACTIVE');
        activePlayers.slice(0, 6).forEach((p: { id?: string }) => {
          if (p.id) playerIds.push(p.id);
        });
        logResult({ step: `08.2 - ${playerIds.length} joueurs existants récupérés`, status: 'OK' });
      } else {
        // Créer des joueurs de test
        for (let i = 1; i <= 6; i++) {
          const playerData = {
            firstName: `Test${i}`,
            lastName: TEST_PREFIX,
            nickname: `${TEST_PREFIX}_Player${i}`,
          };

          const createResponse = await apiContext.post(`${BASE_URL}/api/players`, {
            headers: {
              Cookie: sessionCookies,
              'Content-Type': 'application/json',
            },
            data: playerData,
          });

          if (createResponse.status() === 200 || createResponse.status() === 201) {
            const data = await createResponse.json() as { id?: string };
            if (data.id) playerIds.push(data.id);
          }
        }
        logResult({ step: `08.2 - ${playerIds.length} joueurs créés`, status: playerIds.length === 6 ? 'OK' : 'KO' });
      }
    }

    expect(playerIds.length).toBeGreaterThanOrEqual(6);
  });

  test('09 - Inscrire les joueurs au tournoi', async () => {
    for (const playerId of playerIds) {
      const response = await apiContext.post(`${BASE_URL}/api/tournaments/${tournamentId}/players`, {
        headers: {
          Cookie: sessionCookies,
          'Content-Type': 'application/json',
        },
        data: { playerId },
      });

      // On accepte 200, 201 ou même 409 (déjà inscrit)
      const status = response.status();
      if (status !== 200 && status !== 201 && status !== 409) {
        logResult({
          step: `09 - Inscription joueur ${playerId}`,
          status: 'KO',
          details: `Status: ${status}`,
          endpoint: `/api/tournaments/${tournamentId}/players`,
        });
      }
    }

    // Vérifier la liste des joueurs inscrits
    const verifyResponse = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/players`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      verifyResponse,
      '09 - GET /api/tournaments/:id/players retourne JSON',
      `/api/tournaments/${tournamentId}/players`
    );

    if (result.ok && result.data) {
      const enrolledPlayers = (result.data as { players?: unknown[] }).players || result.data;
      if (Array.isArray(enrolledPlayers) && enrolledPlayers.length >= 6) {
        logResult({ step: `09.1 - ${enrolledPlayers.length} joueurs inscrits au tournoi`, status: 'OK' });
      } else {
        logResult({
          step: '09.1 - Au moins 6 joueurs inscrits',
          status: 'KO',
          details: `Seulement ${Array.isArray(enrolledPlayers) ? enrolledPlayers.length : 0} joueurs`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  test('10 - Démarrer le tournoi (si endpoint existe)', async () => {
    // Mettre à jour le status du tournoi à IN_PROGRESS
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

  test('11 - Enregistrer des éliminations (KO)', async () => {
    // Enregistrer 3 éliminations
    // Player 0 élimine Player 5
    // Player 1 élimine Player 4
    // Player 2 élimine Player 3

    const eliminations = [
      { eliminatorId: playerIds[0], eliminatedId: playerIds[5], level: 2, rank: 6 },
      { eliminatorId: playerIds[1], eliminatedId: playerIds[4], level: 3, rank: 5 },
      { eliminatorId: playerIds[2], eliminatedId: playerIds[3], level: 4, rank: 4 },
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

      await assertJsonResponse(
        response,
        `11.${i + 1} - POST élimination rank ${elim.rank}`,
        `/api/tournaments/${tournamentId}/eliminations`,
        [200, 201]
      );
    }
  });

  test('12 - Vérifier les éliminations enregistrées', async () => {
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
      if (Array.isArray(eliminations) && eliminations.length >= 3) {
        logResult({ step: `12.2 - ${eliminations.length} éliminations enregistrées`, status: 'OK' });
      } else {
        logResult({
          step: '12.2 - Au moins 3 éliminations',
          status: 'KO',
          details: `Seulement ${Array.isArray(eliminations) ? eliminations.length : 0} éliminations`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  test('13 - Terminer le tournoi', async () => {
    // Attribuer les rangs finaux aux 3 joueurs restants
    const finalRanks = [
      { playerId: playerIds[0], rank: 1 },
      { playerId: playerIds[1], rank: 2 },
      { playerId: playerIds[2], rank: 3 },
    ];

    for (const fr of finalRanks) {
      const tpResponse = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/players/${fr.playerId}`, {
        headers: { Cookie: sessionCookies },
      });

      if (tpResponse.status() === 200) {
        await apiContext.patch(`${BASE_URL}/api/tournaments/${tournamentId}/players/${fr.playerId}`, {
          headers: {
            Cookie: sessionCookies,
            'Content-Type': 'application/json',
          },
          data: { finalRank: fr.rank },
        });
      }
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

  test('14 - Vérifier les résultats du tournoi', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/tournaments/${tournamentId}/results`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '14.1 - GET /api/tournaments/:id/results retourne JSON',
      `/api/tournaments/${tournamentId}/results`
    );

    if (result.ok && result.data) {
      const data = result.data as { results?: Array<{ totalPoints?: number; eliminationPoints?: number; rankPoints?: number }> };
      const results = data.results || [];

      if (Array.isArray(results) && results.length > 0) {
        // Vérifier cohérence des points
        let coherent = true;
        for (const r of results) {
          const total = r.totalPoints || 0;
          const sum = (r.eliminationPoints || 0) + (r.rankPoints || 0);
          // Le total devrait être >= à la somme (peut inclure bonus/malus)
          if (total < sum - 100 || total > sum + 500) {
            coherent = false;
            break;
          }
        }

        logResult({
          step: '14.2 - Cohérence des points (totalPoints vs breakdown)',
          status: coherent ? 'OK' : 'KO',
          details: coherent ? undefined : 'Incohérence détectée dans les totaux',
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  test('15 - Vérifier le classement de la saison', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/seasons/${seasonId}/leaderboard`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '15.1 - GET /api/seasons/:id/leaderboard retourne JSON',
      `/api/seasons/${seasonId}/leaderboard`
    );

    if (result.ok && result.data) {
      const data = result.data as { leaderboard?: Array<{ totalPoints?: number; player?: { id?: string } }> };
      const leaderboard = data.leaderboard || [];

      if (Array.isArray(leaderboard) && leaderboard.length > 0) {
        logResult({ step: `15.2 - Classement avec ${leaderboard.length} entrées`, status: 'OK' });

        // Vérifier que les joueurs ont des points
        const withPoints = leaderboard.filter((e) => (e.totalPoints || 0) > 0);
        if (withPoints.length > 0) {
          logResult({ step: '15.3 - Joueurs avec points > 0 dans le classement', status: 'OK' });
        } else {
          logResult({
            step: '15.3 - Joueurs avec points > 0 dans le classement',
            status: 'KO',
            details: 'Aucun joueur avec des points positifs',
          });
        }
      } else {
        logResult({
          step: '15.2 - Classement non vide',
          status: 'KO',
          details: 'Leaderboard vide',
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  test('16 - Vérifier les statistiques globales', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/statistics`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '16.1 - GET /api/statistics retourne JSON',
      '/api/statistics'
    );

    if (result.ok && result.data) {
      const stats = result.data as {
        totalTournaments?: number;
        totalPlayers?: number;
        totalEliminations?: number;
      };

      if (stats.totalTournaments !== undefined && stats.totalTournaments > 0) {
        logResult({ step: '16.2 - totalTournaments > 0', status: 'OK' });
      } else {
        logResult({
          step: '16.2 - totalTournaments > 0',
          status: 'KO',
          details: `totalTournaments: ${stats.totalTournaments}`,
        });
      }
    }

    expect(result.ok).toBe(true);
  });

  test('17 - Vérifier les statistiques de la saison', async () => {
    const response = await apiContext.get(`${BASE_URL}/api/seasons/${seasonId}/eliminations`, {
      headers: { Cookie: sessionCookies },
    });

    const result = await assertJsonResponse(
      response,
      '17 - GET /api/seasons/:id/eliminations retourne JSON',
      `/api/seasons/${seasonId}/eliminations`
    );

    expect(result.ok).toBe(true);
  });

  test('18 - Vérification finale: aucun endpoint API ne retourne du HTML', async () => {
    // Liste d'endpoints critiques à vérifier
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

      if (body.trim().startsWith('<') || !contentType.includes('application/json')) {
        allJson = false;
        logResult({
          step: `18.X - ${endpoint} retourne HTML`,
          status: 'KO',
          details: `Content-Type: ${contentType}`,
          endpoint,
        });
      }
    }

    if (allJson) {
      logResult({ step: '18 - Tous les endpoints API retournent JSON', status: 'OK' });
    }

    expect(allJson).toBe(true);
  });
});
