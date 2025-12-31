/**
 * Test to verify canonical TV routing and shared component architecture
 */

describe('TV Canonical Routing', () => {
  it('shared TvV3Page component should exist and be a function', async () => {
    const sharedModule = await import('@/features/tv/TvV3Page');

    expect(sharedModule.TvV3Page).toBeDefined();
    expect(typeof sharedModule.TvV3Page).toBe('function');
  });

  it('canonical TV route should have a default export', async () => {
    const canonicalModule = await import('@/app/tv/[tournamentId]/page');

    expect(canonicalModule.default).toBeDefined();
    expect(typeof canonicalModule.default).toBe('function');
  });

  it('tv-v3 route should have a default export', async () => {
    const v3Module = await import('@/app/tv-v3/[tournamentId]/page');

    expect(v3Module.default).toBeDefined();
    expect(typeof v3Module.default).toBe('function');
  });

  it('tv-legacy route should have a default export', async () => {
    const legacyModule = await import('@/app/tv-legacy/[tournamentId]/page');

    expect(legacyModule.default).toBeDefined();
    expect(typeof legacyModule.default).toBe('function');
  });

  it('tv-v2 route should have a default export', async () => {
    const v2Module = await import('@/app/tv-v2/[tournamentId]/page');

    expect(v2Module.default).toBeDefined();
    expect(typeof v2Module.default).toBe('function');
  });
});
