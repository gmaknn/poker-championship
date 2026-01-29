/**
 * JWT Secret utility - Centralized and secure JWT secret management
 *
 * SECURITY: This replaces hardcoded fallback secrets that were a security risk.
 * In production, NEXTAUTH_SECRET MUST be defined.
 */

let cachedSecret: Uint8Array | null = null;
let warningLogged = false;

/**
 * Get the JWT secret for signing/verifying tokens.
 *
 * - In production: Throws an error if NEXTAUTH_SECRET is not defined
 * - In development: Uses a dev-only fallback with a warning
 *
 * @returns TextEncoder encoded secret for use with jose library
 * @throws Error if NEXTAUTH_SECRET is not defined in production
 */
export function getJwtSecret(): Uint8Array {
  // Return cached secret if available
  if (cachedSecret) {
    return cachedSecret;
  }

  const secret = process.env.NEXTAUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL SECURITY ERROR: NEXTAUTH_SECRET must be defined in production. ' +
        'Generate a secure secret with: openssl rand -base64 32'
      );
    }

    // Development only - log warning once
    if (!warningLogged) {
      console.warn(
        '\n⚠️  WARNING: NEXTAUTH_SECRET not defined, using development fallback.\n' +
        '   This is NOT secure for production. Set NEXTAUTH_SECRET in your .env file.\n' +
        '   Generate a secret with: openssl rand -base64 32\n'
      );
      warningLogged = true;
    }

    // Dev-only fallback - clearly marked as unsafe
    cachedSecret = new TextEncoder().encode('dev-only-secret-do-not-use-in-prod');
    return cachedSecret;
  }

  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

/**
 * Clear the cached secret (useful for testing)
 */
export function clearJwtSecretCache(): void {
  cachedSecret = null;
  warningLogged = false;
}
