import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev'
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: EmailOptions) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email (Development Mode):')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('HTML:', html)
    console.log('---')
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    return { success: true, data: result }
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error }
  }
}

export async function sendActivationEmail(
  email: string,
  firstName: string,
  token: string
) {
  const activationUrl = `${APP_URL}/activate?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1f2937;
            font-size: 24px;
            margin: 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .button {
            display: inline-block;
            background-color: #2563eb;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #1d4ed8;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #6b7280;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎰 Poker Championship</h1>
          </div>
          <div class="content">
            <h2>Bienvenue ${firstName} !</h2>
            <p>Un compte joueur a été créé pour vous sur notre plateforme Poker Championship.</p>
            <p>Pour activer votre compte et définir votre mot de passe, cliquez sur le bouton ci-dessous :</p>

            <div style="text-align: center;">
              <a href="${activationUrl}" class="button">Activer mon compte</a>
            </div>

            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 14px;">
              ${activationUrl}
            </p>

            <div class="warning">
              ⚠️ Ce lien d'activation expire dans 48 heures.
            </div>
          </div>
          <div class="footer">
            <p>Si vous n'avez pas demandé cette activation, vous pouvez ignorer cet email.</p>
            <p>© 2025 Poker Championship. Tous droits réservés.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Activez votre compte Poker Championship',
    html,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  token: string
) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1f2937;
            font-size: 24px;
            margin: 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .button {
            display: inline-block;
            background-color: #dc2626;
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #b91c1c;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #6b7280;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎰 Poker Championship</h1>
          </div>
          <div class="content">
            <h2>Réinitialisation de mot de passe</h2>
            <p>Bonjour ${firstName},</p>
            <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
            </div>

            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px; font-size: 14px;">
              ${resetUrl}
            </p>

            <div class="warning">
              ⚠️ Ce lien de réinitialisation expire dans 1 heure.
            </div>
          </div>
          <div class="footer">
            <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>
            <p>Votre mot de passe ne sera pas modifié tant que vous n'aurez pas cliqué sur le lien ci-dessus.</p>
            <p>© 2025 Poker Championship. Tous droits réservés.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    html,
  })
}

export async function sendPasswordChangedConfirmation(
  email: string,
  firstName: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 30px;
            border: 1px solid #e5e7eb;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1f2937;
            font-size: 24px;
            margin: 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #6b7280;
          }
          .success {
            background-color: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎰 Poker Championship</h1>
          </div>
          <div class="content">
            <h2>✅ Mot de passe modifié</h2>
            <p>Bonjour ${firstName},</p>
            <p>Votre mot de passe a été modifié avec succès.</p>

            <div class="success">
              ✓ Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </div>

            <p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'administrateur.</p>
          </div>
          <div class="footer">
            <p>© 2025 Poker Championship. Tous droits réservés.</p>
          </div>
        </div>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Confirmation de changement de mot de passe',
    html,
  })
}
