/**
 * POST /api/auth/activate
 * Activate a player account using the token from email
 *
 * No auth required (public endpoint with token validation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const activateSchema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

// Password requirements
const PASSWORD_MIN_LENGTH = 8;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = activateSchema.parse(body);

    // Validate password strength
    if (password.length < PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        { error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères` },
        { status: 400 }
      );
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Find the token in database
    const activationToken = await prisma.accountActivationToken.findUnique({
      where: { tokenHash },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
            status: true,
            password: true,
          },
        },
      },
    });

    // Check if token exists
    if (!activationToken) {
      return NextResponse.json(
        { error: 'Token invalide ou expiré' },
        { status: 400 }
      );
    }

    // Check if token has already been used
    if (activationToken.usedAt) {
      return NextResponse.json(
        { error: 'Ce lien d\'activation a déjà été utilisé' },
        { status: 400 }
      );
    }

    // Check if token has expired
    if (new Date() > activationToken.expiresAt) {
      return NextResponse.json(
        { error: 'Ce lien d\'activation a expiré. Demandez un nouveau lien.' },
        { status: 400 }
      );
    }

    // Check if player account is already activated
    if (activationToken.player.password) {
      return NextResponse.json(
        { error: 'Ce compte est déjà activé' },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12);

    // Activate the account in a transaction
    await prisma.$transaction([
      // Update player: set password and status to ACTIVE
      prisma.player.update({
        where: { id: activationToken.playerId },
        data: {
          password: passwordHash,
          status: 'ACTIVE',
        },
      }),
      // Mark token as used
      prisma.accountActivationToken.update({
        where: { id: activationToken.id },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Compte activé avec succès',
      player: {
        id: activationToken.player.id,
        nickname: activationToken.player.nickname,
        firstName: activationToken.player.firstName,
        lastName: activationToken.player.lastName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error activating account:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'activation du compte' },
      { status: 500 }
    );
  }
}
