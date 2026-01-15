/**
 * App version utilities for deployment verification
 */

// Commit SHA injected at build time or from env
const APP_COMMIT = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  || process.env.FLY_IMAGE_REF
  || process.env.APP_COMMIT
  || 'dev';

// App name from Fly.io or fallback
const APP_NAME = process.env.FLY_APP_NAME || 'local';

/**
 * Get app version info
 */
export function getAppVersion(): string {
  // Return short commit sha (first 7 chars)
  const shortSha = APP_COMMIT.length > 7 ? APP_COMMIT.substring(0, 7) : APP_COMMIT;
  return `${APP_NAME}:${shortSha}`;
}

/**
 * Check if recipe diagnostics are enabled
 */
export function isDiagnosticsEnabled(): boolean {
  return process.env.RECIPE_DIAGNOSTICS === '1';
}

/**
 * Get diagnostic headers to add to responses
 */
export function getDiagnosticHeaders(): Record<string, string> {
  return {
    'X-App-Commit': getAppVersion(),
    'X-Recipe-Diagnostics': isDiagnosticsEnabled() ? 'on' : 'off',
  };
}
