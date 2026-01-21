import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const activateSchema = z.object({
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
});

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/players/[id]/activate
 * Manually activate a player account (admin only)
 *
 * Sets the password and status to ACTIVE
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
    const validation = activateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { password } = validation.data;

    // Find the player
    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
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

    // Check if player has an email
    if (!player.email) {
      return NextResponse.json(
        { error: 'Ce joueur n\'a pas d\'email configuré' },
        { status: 400 }
      );
    }

    // Check if already activated
    if (player.password && player.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Ce compte est déjà activé' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update the player
    await prisma.player.update({
      where: { id },
      data: {
        password: hashedPassword,
        status: 'ACTIVE',
      },
    });

    console.log(`[ADMIN] Player ${player.firstName} ${player.lastName} (${player.email}) manually activated`);

    return NextResponse.json({
      success: true,
      message: 'Compte activé avec succès',
    });
  } catch (error) {
    console.error('Error activating player:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'activation' },
      { status: 500 }
    );
  }
}
