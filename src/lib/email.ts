/**
 * Email Provider - Resend integration for account activation
 *
 * DEV: console.log only (no real emails)
 * PROD: Uses Resend API
 */

import { Resend } from 'resend';

export interface EmailProvider {
  sendActivationEmail(to: string, activationLink: string, playerName: string): Promise<boolean>;
}

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email sender address (must be verified in Resend)
const FROM_EMAIL = process.env.EMAIL_FROM || 'WPT Villelaure <noreply@wpt-villelaure.fly.dev>';

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
 * Production email provider using Resend
 */
class ResendEmailProvider implements EmailProvider {
  async sendActivationEmail(to: string, activationLink: string, playerName: string): Promise<boolean> {
    if (!resend) {
      console.error('[EMAIL] Resend API key not configured');
      // Fallback to console log in case of missing config
      console.log(`[FALLBACK EMAIL] Activation email for ${to}: ${activationLink}`);
      return true;
    }

    try {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: 'Bienvenue sur WPT Villelaure - Activez votre compte',
        html: this.getActivationEmailHtml(playerName, activationLink),
        text: this.getActivationEmailText(playerName, activationLink),
      });

      if (error) {
        console.error('[EMAIL] Resend error:', error);
        return false;
      }

      console.log(`[EMAIL] Activation email sent to ${to}`);
      return true;
    } catch (err) {
      console.error('[EMAIL] Failed to send email:', err);
      return false;
    }
  }

  private getActivationEmailHtml(playerName: string, activationLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Activez votre compte WPT Villelaure</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #18181b; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                WPT Villelaure
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Championnat de Poker Texas Hold'em
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; color: #fafafa; font-size: 22px;">
                Bienvenue ${playerName} !
              </h2>
              <p style="margin: 0 0 24px 0; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                Vous avez été invité(e) à rejoindre le championnat de poker WPT Villelaure.
                Cliquez sur le bouton ci-dessous pour activer votre compte et définir votre mot de passe.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <a href="${activationLink}"
                       style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Activer mon compte
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Ce lien est valable pendant <strong style="color: #a1a1aa;">48 heures</strong>.
                Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
              </p>

              <!-- Fallback link -->
              <p style="margin: 24px 0 0 0; color: #52525b; font-size: 12px; word-break: break-all;">
                Si le bouton ne fonctionne pas, copiez ce lien :<br>
                <a href="${activationLink}" style="color: #10b981;">${activationLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0a0a; padding: 24px 32px; text-align: center; border-top: 1px solid #27272a;">
              <p style="margin: 0; color: #52525b; font-size: 12px;">
                WPT Villelaure - Le Cyclope<br>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private getActivationEmailText(playerName: string, activationLink: string): string {
    return `
Bienvenue sur WPT Villelaure !

Bonjour ${playerName},

Vous avez été invité(e) à rejoindre le championnat de poker WPT Villelaure.

Pour activer votre compte et définir votre mot de passe, cliquez sur le lien suivant :
${activationLink}

Ce lien est valable pendant 48 heures.

Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.

---
WPT Villelaure - Le Cyclope
    `.trim();
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
    // Use Resend in production if API key is configured, otherwise dev mode
    if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
      emailProviderInstance = new ResendEmailProvider();
    } else {
      emailProviderInstance = new DevEmailProvider();
    }
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
