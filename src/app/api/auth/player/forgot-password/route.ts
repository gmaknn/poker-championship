import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateSecureToken, getTokenExpiry } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@/lib/email'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)

    // Trouver le joueur avec cet email
    const player = await prisma.player.findFirst({
      where: {
        email: validatedData.email,
        status: 'ACTIVE',
      },
    })

    // Pour des raisons de sécurité, on renvoie toujours un message de succès
    // même si l'email n'existe pas (pour éviter l'énumération d'emails)
    if (!player) {
      return NextResponse.json({
        success: true,
        message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
      })
    }

    // Vérifier que le compte est activé
    if (!player.emailVerified) {
      return NextResponse.json(
        {
          error:
            'Ce compte n\'est pas encore activé. Veuillez d\'abord activer votre compte.',
        },
        { status: 400 }
      )
    }

    // Générer un token de réinitialisation
    const resetToken = generateSecureToken()
    const resetTokenExpiry = getTokenExpiry(1) // 1 heure

    // Mettre à jour le joueur avec le token
    await prisma.player.update({
      where: { id: player.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpiry: resetTokenExpiry,
      },
    })

    // Envoyer l'email de réinitialisation
    try {
      await sendPasswordResetEmail(
        player.email!,
        player.firstName,
        resetToken
      )
      console.log(`Email de réinitialisation envoyé à ${player.email}`)
    } catch (emailError) {
      console.error(
        'Erreur lors de l\'envoi de l\'email de réinitialisation:',
        emailError
      )
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message:
        'Un email de réinitialisation a été envoyé à votre adresse email.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Email invalide', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error processing password reset request:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la demande de réinitialisation' },
      { status: 500 }
    )
  }
}
