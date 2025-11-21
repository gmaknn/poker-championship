import crypto from 'crypto'

/**
 * Génère un token aléatoire sécurisé
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Crée une date d'expiration pour un token
 * @param hours Nombre d'heures avant expiration
 */
export function getTokenExpiry(hours: number): Date {
  const expiry = new Date()
  expiry.setHours(expiry.getHours() + hours)
  return expiry
}

/**
 * Vérifie si un token est expiré
 */
export function isTokenExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return true
  return new Date() > expiryDate
}
