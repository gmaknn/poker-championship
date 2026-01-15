/**
 * App version utilities for deployment verification
 */

// App name from Fly.io or fallback
const APP_NAME = process.env.FLY_APP_NAME || 'local';

/**
 * Extract deployment ID from FLY_IMAGE_REF
 * Format: registry.fly.io/app-name:deployment-XXXX
 * Returns the deployment ID (last 12 chars for readability)
 */
function extractDeploymentId(): string | null {
  const imageRef = process.env.FLY_IMAGE_REF;
  if (!imageRef) return null;

  const match = imageRef.match(/:deployment-([A-Z0-9]+)$/);
  if (match && match[1]) {
    // Return last 12 chars of deployment ID for readability
    const deployId = match[1];
    return deployId.length > 12 ? deployId.slice(-12) : deployId;
  }
  return null;
}

/**
 * Get the best available version identifier
 * Priority: Git SHA > Fly deployment ID > dev
 */
function getVersionIdentifier(): string {
  // 1. Explicit git SHA (set at build time)
  if (process.env.APP_COMMIT_SHA) {
    return process.env.APP_COMMIT_SHA.substring(0, 7);
  }

  // 2. Vercel git SHA
  if (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA) {
    return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  }

  // 3. Fly deployment ID (extracted from image ref)
  const deployId = extractDeploymentId();
  if (deployId) {
    return `d-${deployId}`;
  }

  // 4. Fly machine version as fallback
  if (process.env.FLY_MACHINE_VERSION) {
    return `m-${process.env.FLY_MACHINE_VERSION.slice(-8)}`;
  }

  return 'dev';
}

/**
 * Get app version info
 */
export function getAppVersion(): string {
  return `${APP_NAME}:${getVersionIdentifier()}`;
}

/**
 * Get Fly release/machine info for additional context
 */
export function getReleaseInfo(): string {
  const machineId = process.env.FLY_MACHINE_ID;
  const machineVersion = process.env.FLY_MACHINE_VERSION;

  if (machineId && machineVersion) {
    return `${machineId.slice(-6)}/${machineVersion.slice(-8)}`;
  }
  return 'unknown';
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
    'X-App-Version': getAppVersion(),
    'X-App-Release': getReleaseInfo(),
    'X-Recipe-Diagnostics': isDiagnosticsEnabled() ? 'on' : 'off',
  };
}
