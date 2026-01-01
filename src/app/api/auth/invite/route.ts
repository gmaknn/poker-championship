/**
 * POST /api/auth/invite
 * Invite a player by sending an activation email
 *
 * RBAC: ADMIN only (optionally TD in future)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';
import { sendActivationEmail } from '@/lib/email';
import { createHash, randomBytes } from 'crypto';

const inviteSchema = z.object({
  playerId: z.string().min(1, 'Player ID requis'),
});

// Token expiration: 48 hours
const TOKEN_EXPIRATION_HOURS = 48;

/**
 * Generate a secure random token and its hash
 */
function generateToken(): { token: string; tokenHash: string } {
  // Generate 32 bytes of random data (256 bits of entropy)
  const token = randomBytes(32).toString('hex');

  // Hash the token with SHA-256 for storage
  const tokenHash = createHash('sha256').update(token).digest('hex');

  return { token, tokenHash };
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and ADMIN permission
    const permResult = await requirePermission(request, 'edit_player');

    if (!permResult.success) {
      return NextResponse.json(
        { error: permResult.error },
        { status: permResult.status }
      );
    }

    const body = await request.json();
    const { playerId } = inviteSchema.parse(body);

    // Find the player
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        email: true,
        status: true,
        password: true,
      },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Joueur non trouvé' },
        { status: 404 }
      );
    }

    // Check if player has an email
    if (!player.email) {
      return NextResponse.json(
        { error: 'Le joueur n\'a pas d\'adresse email' },
        { status: 400 }
      );
    }

    // Check if account is already activated (has password)
    if (player.password) {
      return NextResponse.json(
        { error: 'Ce compte est déjà activé' },
        { status: 400 }
      );
    }

    // Invalidate any existing unused tokens for this player
    await prisma.accountActivationToken.updateMany({
      where: {
        playerId: player.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Generate new token
    const { token, tokenHash } = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_HOURS * 60 * 60 * 1000);

    // Save token hash to database
    await prisma.accountActivationToken.create({
      data: {
        tokenHash,
        playerId: player.id,
        expiresAt,
      },
    });

    // Build activation link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const activationLink = `${baseUrl}/activate/${token}`;

    // Send activation email
    const playerName = `${player.firstName} ${player.lastName}`.trim() || player.nickname;
    const emailSent = await sendActivationEmail(player.email, activationLink, playerName);

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invitation envoyée à ${player.email}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'invitation' },
      { status: 500 }
    );
  }
}
