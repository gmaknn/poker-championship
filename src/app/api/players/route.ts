import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { PlayerRole } from '@prisma/client';
import { getCurrentPlayer, requirePermission } from '@/lib/auth-helpers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const playerSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  nickname: z.string().min(1, 'Le pseudo est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  avatar: z.string().nullable().optional(),
  role: z.nativeEnum(PlayerRole).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Tout le monde peut voir la liste des joueurs
    // Mais les infos sensibles (email, role) ne sont visibles que pour les admins
    const currentPlayer = await getCurrentPlayer(request);

    const players = await prisma.player.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      include: {
        _count: {
          select: {
            tournamentPlayers: true,
            eliminations: true,
          },
        },
      },
    });

    // Si pas connecté ou pas les permissions, masquer certaines infos
    const hasViewPermission = currentPlayer && hasPermission(currentPlayer.role, PERMISSIONS.VIEW_PLAYERS);

    if (!hasViewPermission) {
      return NextResponse.json(
        players.map(p => ({
          ...p,
          email: undefined, // Masquer l'email
          // role reste visible pour la page de connexion
        }))
      );
    }

    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification et la permission CREATE_PLAYER
    const permResult = await requirePermission(request, PERMISSIONS.CREATE_PLAYER);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const body = await request.json();
    console.log('POST /api/players - Body reçu:', JSON.stringify(body, null, 2));
    const validatedData = playerSchema.parse(body);
    console.log('POST /api/players - Données validées:', JSON.stringify(validatedData, null, 2));

    // Déterminer le rôle à attribuer
    let role = validatedData.role || PlayerRole.PLAYER; // Rôle par défaut : PLAYER

    // Si on veut créer un joueur avec un rôle élevé (TD ou Admin), vérifier les permissions
    if (role === PlayerRole.TOURNAMENT_DIRECTOR || role === PlayerRole.ADMIN) {
      if (!hasPermission(permResult.player.role, PERMISSIONS.MANAGE_PLAYER_ROLES)) {
        // Si pas de permission, forcer le rôle PLAYER
        console.warn(`Tentative de création d'un joueur avec rôle ${role} sans permission. Rôle forcé à PLAYER.`);
        role = PlayerRole.PLAYER;
      }
    }

    const player = await prisma.player.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        nickname: validatedData.nickname,
        email: validatedData.email || null,
        avatar: validatedData.avatar,
        role,
        status: 'ACTIVE', // Forcer ACTIVE à la création (override du default DB INACTIVE)
      },
    });

    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('POST /api/players - Erreur de validation:', error.issues);
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

    console.error('Error creating player:', error);
    return NextResponse.json(
      { error: 'Failed to create player' },
      { status: 500 }
    );
  }
}
