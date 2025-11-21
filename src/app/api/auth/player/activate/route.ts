import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { isTokenExpired } from '@/lib/tokens'

const activateSchema = z.object({
  token: z.string().min(1, 'Le token est requis'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = activateSchema.parse(body)

    // Trouver le joueur avec ce token d'activation
    const player = await prisma.player.findUnique({
      where: { activationToken: validatedData.token },
    })

    if (!player) {
      return NextResponse.json(
        { error: 'Token d\'activation invalide' },
        { status: 400 }
      )
    }

    // Vérifier que le token n'a pas expiré
    if (isTokenExpired(player.activationTokenExpiry)) {
      return NextResponse.json(
        { error: 'Le token d\'activation a expiré' },
        { status: 400 }
      )
    }

    // Vérifier que le compte n'est pas déjà activé
    if (player.emailVerified) {
      return NextResponse.json(
        { error: 'Ce compte est déjà activé' },
        { status: 400 }
      )
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Mettre à jour le joueur
    const updatedPlayer = await prisma.player.update({
      where: { id: player.id },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
        activationToken: null,
        activationTokenExpiry: null,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Compte activé avec succès',
        player: {
          id: updatedPlayer.id,
          email: updatedPlayer.email,
          firstName: updatedPlayer.firstName,
          lastName: updatedPlayer.lastName,
          nickname: updatedPlayer.nickname,
        },
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

    console.error('Error activating account:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'activation du compte' },
      { status: 500 }
    )
  }
}

// Route GET pour vérifier la validité d'un token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token manquant' },
        { status: 400 }
      )
    }

    // Trouver le joueur avec ce token
    const player = await prisma.player.findUnique({
      where: { activationToken: token },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailVerified: true,
        activationTokenExpiry: true,
      },
    })

    if (!player) {
      return NextResponse.json(
        { valid: false, error: 'Token invalide' },
        { status: 400 }
      )
    }

    if (player.emailVerified) {
      return NextResponse.json(
        { valid: false, error: 'Compte déjà activé' },
        { status: 400 }
      )
    }

    if (isTokenExpired(player.activationTokenExpiry)) {
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
    console.error('Error validating token:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la validation du token' },
      { status: 500 }
    )
  }
}
