import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { isTokenExpired } from '@/lib/tokens'
import { sendPasswordChangedConfirmation } from '@/lib/email'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Le token est requis'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    // Trouver le joueur avec ce token de réinitialisation
    const player = await prisma.player.findUnique({
      where: { resetPasswordToken: validatedData.token },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Token de réinitialisation invalide' },
        { status: 400 }
      )
    }

    // Vérifier que le token n'a pas expiré
    if (isTokenExpired(player.resetPasswordTokenExpiry)) {
      return NextResponse.json(
        { error: 'Le token de réinitialisation a expiré' },
        { status: 400 }
      )
    }

    // Vérifier que le compte est activé
    if (!player.emailVerified) {
      return NextResponse.json(
        { error: 'Ce compte n\'est pas activé' },
        { status: 400 }
      )
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Mettre à jour le joueur
    const updatedPlayer = await prisma.player.update({
      where: { id: player.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
      },
    })

    // Envoyer un email de confirmation
    if (updatedPlayer.email) {
      try {
        await sendPasswordChangedConfirmation(
          updatedPlayer.email,
          updatedPlayer.firstName
        )
        console.log(`Email de confirmation envoyé à ${updatedPlayer.email}`)
      } catch (emailError) {
        console.error(
          'Erreur lors de l\'envoi de l\'email de confirmation:',
          emailError
        )
        // On ne bloque pas si l'email de confirmation échoue
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe' },
      { status: 500 }
    )
  }
}

// Route GET pour vérifier la validité d'un token de réinitialisation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    // Trouver le joueur avec ce token
    const player = await prisma.player.findUnique({
      where: { resetPasswordToken: token },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        resetPasswordTokenExpiry: true,
      },
    })

    if (!player) {
      return NextResponse.json(
        { valid: false, error: 'Token invalide' },
        { status: 400 }
      )
    }

    if (!player.emailVerified) {
      return NextResponse.json(
        { valid: false, error: 'Compte non activé' },
        { status: 400 }
      )
    }

    if (isTokenExpired(player.resetPasswordTokenExpiry)) {
      return NextResponse.json(
        { valid: false, error: 'Token expiré' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      player: {
        firstName: player.firstName,
        lastName: player.lastName,
        email: player.email,
      },
    })
  } catch (error) {
    console.error('Error validating reset token:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation du token' },
      { status: 500 }
    )
  }
}
