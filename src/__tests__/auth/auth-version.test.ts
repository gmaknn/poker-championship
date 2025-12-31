/**
 * Auth Version Drift Detection Test
 *
 * This test ensures next-auth version is exactly pinned to prevent
 * accidental upgrades that could break authentication.
 */

import * as fs from 'fs';
import * as path from 'path';

const EXPECTED_VERSION = '5.0.0-beta.30';

describe('Auth Version Guard', () => {
  it('should have next-auth pinned to exact version in package.json', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const version = packageJson.dependencies?.['next-auth'];

    expect(version).toBeDefined();
    expect(version).toBe(EXPECTED_VERSION);
    // Ensure no ^ or ~ prefix (exact version)
    expect(version.startsWith('^')).toBe(false);
    expect(version.startsWith('~')).toBe(false);
  });

  it('should have next-auth resolved to exact version in package-lock.json', () => {
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');

    if (!fs.existsSync(packageLockPath)) {
      // Skip if no lockfile (some CI environments)
      return;
    }

    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    const lockedVersion = packageLock.packages?.['node_modules/next-auth']?.version;

    expect(lockedVersion).toBe(EXPECTED_VERSION);
  });

  it('SENTINEL: version must never be @beta tag or semver range', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    const version = packageJson.dependencies?.['next-auth'];

    // Must not be a tag like "@beta"
    expect(version).not.toContain('@');
    // Must not be a semver range
    expect(version).not.toContain('>');
    expect(version).not.toContain('<');
    expect(version).not.toContain('||');
    expect(version).not.toContain(' ');
  });
});
