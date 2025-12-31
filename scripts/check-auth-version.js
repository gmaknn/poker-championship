#!/usr/bin/env node
/**
 * Check that next-auth version is pinned to the expected version.
 * This script fails if the version doesn't match, preventing accidental upgrades.
 *
 * Usage: npm run check:auth-version
 */

const fs = require('fs');
const path = require('path');

const EXPECTED_VERSION = '5.0.0-beta.30';

function main() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageLockPath = path.join(__dirname, '..', 'package-lock.json');

  // Check package.json
  console.log('Checking next-auth version...\n');

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const declaredVersion = packageJson.dependencies?.['next-auth'];

  if (!declaredVersion) {
    console.error('ERROR: next-auth not found in package.json dependencies');
    process.exit(1);
  }

  // Check for exact version (no ^ or ~ prefix)
  if (declaredVersion !== EXPECTED_VERSION) {
    console.error(`ERROR: next-auth version mismatch in package.json`);
    console.error(`  Expected: "${EXPECTED_VERSION}" (exact, no ^/~)`);
    console.error(`  Found:    "${declaredVersion}"`);
    console.error('');
    console.error('To fix: Update package.json to use exact version:');
    console.error(`  "next-auth": "${EXPECTED_VERSION}"`);
    process.exit(1);
  }

  console.log(`package.json: "${declaredVersion}" OK`);

  // Check package-lock.json
  if (fs.existsSync(packageLockPath)) {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    const lockedVersion = packageLock.packages?.['node_modules/next-auth']?.version;

    if (lockedVersion && lockedVersion !== EXPECTED_VERSION) {
      console.error(`\nERROR: next-auth version mismatch in package-lock.json`);
      console.error(`  Expected: "${EXPECTED_VERSION}"`);
      console.error(`  Found:    "${lockedVersion}"`);
      console.error('');
      console.error('To fix: Run "npm install" to regenerate lockfile');
      process.exit(1);
    }

    if (lockedVersion) {
      console.log(`package-lock.json: "${lockedVersion}" OK`);
    }
  }

  console.log('\nAuth version check PASSED');
  console.log(`next-auth is pinned to ${EXPECTED_VERSION}`);
}

main();
