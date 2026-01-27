/**
 * Shared helpers for recipe tests (PROD-SAFE)
 */
import type { Page, APIRequestContext } from '@playwright/test';

// ============================================================================
// Configuration
// ============================================================================
export const CONFIG = {
  BASE_URL: process.env.RECIPE_BASE_URL || 'http://localhost:3003',
  ADMIN_EMAIL: process.env.RECIPE_ADMIN_EMAIL || 'admin@wpt-villelaure.fr',
  ADMIN_PASSWORD: process.env.RECIPE_ADMIN_PASSWORD || 'Admin123!',
};

export function makePrefix(suffix = ''): string {
  return `RECIPE_${suffix}${Date.now()}`;
}

// ============================================================================
// Reporter
// ============================================================================
export interface StepResult {
  step: string;
  status: 'OK' | 'FAIL';
  details?: string;
  data?: Record<string, unknown>;
}

export class Reporter {
  private results: StepResult[] = [];
  hasFailure = false;

  log(result: StepResult): void {
    this.results.push(result);
    const icon = result.status === 'OK' ? '\u2705' : '\u274C';
    console.log(`${icon} ${result.step}`);
    if (result.details) console.log(`   \u2514\u2500 ${result.details}`);
    if (result.data) console.log(`   \u2514\u2500 ${JSON.stringify(result.data)}`);
    if (result.status === 'FAIL') this.hasFailure = true;
  }

  ok(step: string, details?: string, data?: Record<string, unknown>): void {
    this.log({ step, status: 'OK', details, data });
  }

  fail(step: string, details?: string, data?: Record<string, unknown>): void {
    this.log({ step, status: 'FAIL', details, data });
  }

  banner(title: string, info: Record<string, string>): void {
    const width = 65;
    console.log('\n' + '\u2554' + '\u2550'.repeat(width) + '\u2557');
    console.log('\u2551  ' + title.padEnd(width - 2) + '\u2551');
    console.log('\u2560' + '\u2550'.repeat(width) + '\u2563');
    for (const [k, v] of Object.entries(info)) {
      console.log('\u2551  ' + `${k}: ${v}`.padEnd(width - 2) + '\u2551');
    }
    console.log('\u255A' + '\u2550'.repeat(width) + '\u255D\n');
  }

  summary(verdictOk: string, verdictFail: string): void {
    const okCount = this.results.filter(r => r.status === 'OK').length;
    const failCount = this.results.filter(r => r.status === 'FAIL').length;

    console.log('\n\u2550'.repeat(67));
    console.log(`Resultats: ${okCount} OK / ${failCount} FAIL`);

    if (failCount > 0) {
      console.log('\nEtapes en echec:');
      this.results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  \u274C ${r.step}${r.details ? ': ' + r.details : ''}`);
      });
    }

    console.log('\n' + '\u2550'.repeat(67));
    console.log(this.hasFailure ? `\u274C ${verdictFail}` : `\u2705 ${verdictOk}`);
    console.log('\u2550'.repeat(67) + '\n');
  }

  get stats() {
    return {
      ok: this.results.filter(r => r.status === 'OK').length,
      fail: this.results.filter(r => r.status === 'FAIL').length,
    };
  }
}

// ============================================================================
// API Client
// ============================================================================
export class RecipeClient {
  constructor(
    private api: APIRequestContext,
    private cookies: string,
    private reporter: Reporter
  ) {}

  async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown
  ): Promise<{ status: number; data: unknown }> {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    const opts: { headers: Record<string, string>; data?: unknown } = {
      headers: { Cookie: this.cookies, 'Content-Type': 'application/json' },
    };
    if (body) opts.data = body;

    const res = await (method === 'GET' ? this.api.get(url, opts) :
                       method === 'POST' ? this.api.post(url, opts) :
                       method === 'PATCH' ? this.api.patch(url, opts) :
                       this.api.delete(url, opts));

    const raw = await res.text();
    let data: unknown;
    try { data = JSON.parse(raw); } catch { data = raw; }
    return { status: res.status(), data };
  }

  async assertOk(
    step: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    endpoint: string,
    body?: unknown,
    expectedStatuses = [200, 201]
  ): Promise<{ ok: boolean; data: unknown }> {
    const { status, data } = await this.request(method, endpoint, body);
    const ok = expectedStatuses.includes(status);

    if (ok) {
      this.reporter.ok(step);
    } else {
      const errData = data as { error?: string };
      this.reporter.fail(step, `HTTP ${status}${errData?.error ? ' - ' + errData.error : ''}`, data as Record<string, unknown>);
    }

    return { ok, data };
  }

  async get(endpoint: string) { return this.request('GET', endpoint); }
  async post(endpoint: string, body: unknown) { return this.request('POST', endpoint, body); }
  async patch(endpoint: string, body: unknown) { return this.request('PATCH', endpoint, body); }
}

// ============================================================================
// Auth
// ============================================================================
export async function loginAdmin(
  page: Page,
  reporter: Reporter
): Promise<string> {
  await page.goto(`${CONFIG.BASE_URL}/login`);
  await page.fill('input#email', CONFIG.ADMIN_EMAIL);
  await page.fill('input[type="password"]', CONFIG.ADMIN_PASSWORD);

  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 15000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);

  const cookies = await page.context().cookies();
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  reporter.ok('Login admin');
  return cookieStr;
}

// ============================================================================
// Sandbox Factory
// ============================================================================
export interface SandboxIds {
  seasonId: string;
  tournamentId: string;
  playerIds: string[];
}

export async function createSandbox(
  client: RecipeClient,
  reporter: Reporter,
  prefix: string,
  playerCount = 4
): Promise<SandboxIds> {
  // Season
  const { data: seasonData } = await client.assertOk(
    'Create sandbox season',
    'POST', '/api/seasons',
    { name: `${prefix}_Season`, year: 2099, startDate: new Date().toISOString(), status: 'ACTIVE' }
  );
  const seasonId = (seasonData as { id: string }).id;

  // Tournament
  const { data: tournamentData } = await client.assertOk(
    'Create sandbox tournament',
    'POST', '/api/tournaments',
    { seasonId, name: `${prefix}_Tournament`, date: new Date().toISOString(), buyInAmount: 10, startingChips: 5000, levelDuration: 12 }
  );
  const tournamentId = (tournamentData as { id: string }).id;

  // Players
  const playerIds: string[] = [];
  for (let i = 1; i <= playerCount; i++) {
    const { data } = await client.post('/api/players', {
      firstName: `P${i}`, lastName: prefix, nickname: `${prefix}_P${i}`, status: 'ACTIVE',
    });
    const id = (data as { id?: string }).id;
    if (id) playerIds.push(id);
  }
  reporter.log({
    step: `Create ${playerCount} sandbox players`,
    status: playerIds.length === playerCount ? 'OK' : 'FAIL',
    details: playerIds.length !== playerCount ? `${playerIds.length}/${playerCount}` : undefined,
  });

  // Enroll
  let enrolled = 0;
  for (const playerId of playerIds) {
    const { status } = await client.post(`/api/tournaments/${tournamentId}/players`, { playerId });
    if (status === 200 || status === 201) enrolled++;
  }
  reporter.log({
    step: 'Enroll players in tournament',
    status: enrolled === playerCount ? 'OK' : 'FAIL',
    details: enrolled !== playerCount ? `${enrolled}/${playerCount}` : undefined,
  });

  return { seasonId, tournamentId, playerIds };
}

// ============================================================================
// Tournament Actions
// ============================================================================
export async function startTournament(client: RecipeClient, tournamentId: string): Promise<boolean> {
  const { ok } = await client.assertOk('Start tournament (IN_PROGRESS)', 'PATCH', `/api/tournaments/${tournamentId}`, { status: 'IN_PROGRESS' });
  return ok;
}

export async function patchAndAssert<T>(
  client: RecipeClient,
  reporter: Reporter,
  step: string,
  endpoint: string,
  body: unknown,
  assertFn: (data: T) => { ok: boolean; details?: string }
): Promise<boolean> {
  await client.assertOk(`PATCH ${step}`, 'PATCH', endpoint, body);

  const { data } = await client.get(endpoint);
  const result = assertFn(data as T);

  if (result.ok) {
    reporter.ok(`Verify ${step}`, undefined, data as Record<string, unknown>);
  } else {
    reporter.fail(`Verify ${step}`, result.details, data as Record<string, unknown>);
  }
  return result.ok;
}

export async function finishTournament(
  client: RecipeClient,
  reporter: Reporter,
  tournamentId: string,
  playerIds: string[],
  winnerIdx: number,
  secondIdx: number
): Promise<boolean> {
  // Set final ranks for remaining players
  await client.patch(`/api/tournaments/${tournamentId}/players/${playerIds[winnerIdx]}`, { finalRank: 1 });
  reporter.ok(`Set finalRank=1 for P${winnerIdx + 1}`);

  await client.patch(`/api/tournaments/${tournamentId}/players/${playerIds[secondIdx]}`, { finalRank: 2 });
  reporter.ok(`Set finalRank=2 for P${secondIdx + 1}`);

  // Finish tournament
  const { ok, data } = await client.assertOk('PATCH status=FINISHED', 'PATCH', `/api/tournaments/${tournamentId}`, { status: 'FINISHED' });

  if (!ok) {
    reporter.fail('Tournament finish failed', (data as { error?: string }).error);
  }

  return ok;
}
