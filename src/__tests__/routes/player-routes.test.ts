/**
 * Sentinel tests for player routes existence
 * Ensures /player/leaderboard and /player/live routes exist
 */

import fs from 'fs';
import path from 'path';

describe('Player Routes - Route Sentinel Tests', () => {
  const appDir = path.join(process.cwd(), 'src', 'app', 'player');

  describe('/player/leaderboard route', () => {
    const leaderboardDir = path.join(appDir, 'leaderboard');
    const leaderboardPage = path.join(leaderboardDir, 'page.tsx');

    it('should have leaderboard directory', () => {
      expect(fs.existsSync(leaderboardDir)).toBe(true);
    });

    it('should have leaderboard page.tsx', () => {
      expect(fs.existsSync(leaderboardPage)).toBe(true);
    });

    it('should export a default component', () => {
      const content = fs.readFileSync(leaderboardPage, 'utf-8');
      expect(content).toContain('export default function');
    });

    it('should be a client component', () => {
      const content = fs.readFileSync(leaderboardPage, 'utf-8');
      expect(content).toContain("'use client'");
    });

    it('should use public API endpoint (no auth required)', () => {
      const content = fs.readFileSync(leaderboardPage, 'utf-8');
      // Leaderboard is now public - uses /api/seasons endpoint without auth
      expect(content).toContain('/api/seasons');
    });
  });

  describe('/player/live route', () => {
    const liveDir = path.join(appDir, 'live');
    const livePage = path.join(liveDir, 'page.tsx');

    it('should have live directory', () => {
      expect(fs.existsSync(liveDir)).toBe(true);
    });

    it('should have live page.tsx', () => {
      expect(fs.existsSync(livePage)).toBe(true);
    });

    it('should export a default component', () => {
      const content = fs.readFileSync(livePage, 'utf-8');
      expect(content).toContain('export default function');
    });

    it('should be a client component', () => {
      const content = fs.readFileSync(livePage, 'utf-8');
      expect(content).toContain("'use client'");
    });

    it('should handle 401/403 auth errors', () => {
      const content = fs.readFileSync(livePage, 'utf-8');
      expect(content).toContain('401');
      expect(content).toContain('403');
    });
  });

  describe('/player page links', () => {
    const playerPage = path.join(appDir, 'page.tsx');

    it('should link to /player/leaderboard', () => {
      const content = fs.readFileSync(playerPage, 'utf-8');
      expect(content).toContain('/player/leaderboard');
    });

    it('should link to /player/live', () => {
      const content = fs.readFileSync(playerPage, 'utf-8');
      expect(content).toContain('/player/live');
    });
  });
});
