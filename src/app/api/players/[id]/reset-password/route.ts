import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/players/[id]/reset-password
 * Reset a player's password (admin only)
 *
 * Only works for players who have an active account (with password)
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    // Check admin permission
    const permissionResult = await requirePermission(request, PERMISSIONS.EDIT_PLAYER);
    if (!permissionResult.success) {
      return NextResponse.json(
        { error: permissionResult.error },
        { status: permissionResult.status }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { newPassword } = validation.data;

    // Find the player
    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        password: true,
        status: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Joueur non trouvé' },
        { status: 404 }
      );
    }

    // Check if player has an active account (with password)
    if (!player.password) {
      return NextResponse.json(
        { error: 'Ce joueur n\'a pas de compte actif. Utilisez l\'activation manuelle.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the player's password
    await prisma.player.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    const identifier = player.email || player.phone;
    console.log(`[ADMIN] Password reset for player ${player.firstName} ${player.lastName} (${identifier})`);

    return NextResponse.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation du mot de passe' },
      { status: 500 }
    );
  }
}
