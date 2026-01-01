/**
 * Email Provider - Mockable email service for account activation
 *
 * DEV: console.log only (no real SMTP)
 * PROD: Ready to integrate with any SMTP provider (Resend, SendGrid, etc.)
 */

export interface EmailProvider {
  sendActivationEmail(to: string, activationLink: string, playerName: string): Promise<boolean>;
}

/**
 * Development email provider - logs to console
 */
class DevEmailProvider implements EmailProvider {
  async sendActivationEmail(to: string, activationLink: string, playerName: string): Promise<boolean> {
    console.log('========================================');
    console.log('[DEV EMAIL] Activation Email');
    console.log('========================================');
    console.log(`To: ${to}`);
    console.log(`Player: ${playerName}`);
    console.log(`Link: ${activationLink}`);
    console.log('========================================');
    return true;
  }
}

/**
 * Production email provider stub - to be implemented with real SMTP
 */
class ProductionEmailProvider implements EmailProvider {
  async sendActivationEmail(to: string, activationLink: string, playerName: string): Promise<boolean> {
    // TODO: Implement with Resend, SendGrid, or other SMTP provider
    // For now, fall back to dev behavior
    console.log(`[PROD EMAIL] Would send activation email to ${to}`);
    console.log(`Link: ${activationLink}`);
    return true;
  }
}

// Singleton instance based on environment
let emailProviderInstance: EmailProvider | null = null;

/**
 * Get the email provider instance
 * Can be overridden for testing via setEmailProvider
 */
export function getEmailProvider(): EmailProvider {
  if (!emailProviderInstance) {
    emailProviderInstance = process.env.NODE_ENV === 'production'
      ? new ProductionEmailProvider()
      : new DevEmailProvider();
  }
  return emailProviderInstance;
}

/**
 * Set a custom email provider (for testing)
 */
export function setEmailProvider(provider: EmailProvider | null): void {
  emailProviderInstance = provider;
}

/**
 * Convenience function to send activation email
 */
export async function sendActivationEmail(
  to: string,
  activationLink: string,
  playerName: string
): Promise<boolean> {
  const provider = getEmailProvider();
  return provider.sendActivationEmail(to, activationLink, playerName);
}

/**
 * Create a mock email provider for testing
 */
export function createMockEmailProvider(): EmailProvider & {
  calls: Array<{ to: string; activationLink: string; playerName: string }>;
  reset: () => void;
} {
  const calls: Array<{ to: string; activationLink: string; playerName: string }> = [];

  return {
    calls,
    reset() {
      calls.length = 0;
    },
    async sendActivationEmail(to: string, activationLink: string, playerName: string): Promise<boolean> {
      calls.push({ to, activationLink, playerName });
      return true;
    },
  };
}
