import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { PlayerRole } from '@prisma/client';
import { requirePermission } from '@/lib/auth-helpers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Helper to normalize phone number (remove spaces, dashes, dots)
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\.]/g, '');
}

const playerSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  nickname: z.string().min(1, 'Le pseudo est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  avatar: z.string().nullable().optional(),
  role: z.nativeEnum(PlayerRole).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const player = await prisma.player.findUnique({
      where: { id },
      include: {
        tournamentPlayers: {
          include: {
            tournament: true,
          },
          orderBy: {
            tournament: {
              date: 'desc',
            },
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
            eliminations: true,
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification et la permission EDIT_PLAYER
    const permResult = await requirePermission(request, PERMISSIONS.EDIT_PLAYER);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = playerSchema.parse(body);

    // Normalize phone if provided
    const phone = validatedData.phone ? normalizePhone(validatedData.phone) : null;

    // Préparer les données de mise à jour
    const updateData: any = {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      nickname: validatedData.nickname,
      email: validatedData.email || null,
      phone: phone || null,
      avatar: validatedData.avatar,
    };

    // Seuls les utilisateurs avec MANAGE_PLAYER_ROLES peuvent modifier les rôles vers TD ou Admin
    if (validatedData.role !== undefined) {
      // Si on essaie de mettre un rôle élevé, vérifier les permissions
      if ((validatedData.role === PlayerRole.TOURNAMENT_DIRECTOR || validatedData.role === PlayerRole.ADMIN)) {
        if (!hasPermission(permResult.player.role, PERMISSIONS.MANAGE_PLAYER_ROLES)) {
          console.warn(`Tentative de modification du rôle vers ${validatedData.role} sans permission. Ignorée.`);
          // On ignore simplement le changement de rôle au lieu de retourner une erreur
        } else {
          updateData.role = validatedData.role;
        }
      } else {
        // Si c'est un changement vers PLAYER, toujours autoriser
        updateData.role = validatedData.role;
      }
    }

    const player = await prisma.player.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(player);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ce pseudo est déjà utilisé' },
        { status: 409 }
      );
    }

    console.error('Error updating player:', error);
    return NextResponse.json(
      { error: 'Failed to update player' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification et la permission DELETE_PLAYER
    const permResult = await requirePermission(request, PERMISSIONS.DELETE_PLAYER);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const { id } = await params;

    // Archive instead of delete to preserve history
    const player = await prisma.player.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error archiving player:', error);
    return NextResponse.json(
      { error: 'Failed to archive player' },
      { status: 500 }
    );
  }
}
