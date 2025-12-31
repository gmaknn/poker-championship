/**
 * Test to verify canonical TV routing
 * The canonical /tv/[tournamentId] route should re-export the v3 component
 */

describe('TV Canonical Routing', () => {
  it('canonical TV route should re-export v3 component', async () => {
    // Import both modules
    const canonicalModule = await import('@/app/tv/[tournamentId]/page');
    const v3Module = await import('@/app/tv-v3/[tournamentId]/page');

    // The canonical route should export the same default as v3
    expect(canonicalModule.default).toBe(v3Module.default);
  });

  it('v3 module should have a default export (the page component)', async () => {
    const v3Module = await import('@/app/tv-v3/[tournamentId]/page');

    expect(v3Module.default).toBeDefined();
    expect(typeof v3Module.default).toBe('function');
  });
});
