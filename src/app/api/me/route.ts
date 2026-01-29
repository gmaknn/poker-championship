import { NextRequest, NextResponse } from 'next/server';
import { getCurrentActor } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/me
 * Retourne le Player courant (résolu depuis User NextAuth ou cookie player-id)
 * Si User NextAuth sans Player, en crée un automatiquement
 * Définit le cookie player-id si absent (unification dev-login / NextAuth)
 */
export async function GET(request: NextRequest) {
  try {
    // Utiliser getCurrentActor avec autoCreatePlayer=true
    const actor = await getCurrentActor(request, true);

    if (!actor) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { player } = actor;

    // Récupérer les rôles additionnels du player
    const playerWithRoles = await prisma.player.findUnique({
      where: { id: player.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        role: true,
        roles: { select: { role: true } },
      },
    });

    if (!playerWithRoles) {
      return NextResponse.json(
        { error: 'Joueur non trouvé' },
        { status: 404 }
      );
    }

    const additionalRoles = playerWithRoles.roles?.map(r => r.role) ?? [];

    // Construire la réponse
    const responseData = {
      id: playerWithRoles.id,
      role: playerWithRoles.role,
      additionalRoles,
      displayName: playerWithRoles.nickname || `${playerWithRoles.firstName} ${playerWithRoles.lastName}`.trim(),
    };

    // Vérifier si le cookie player-id est déjà défini
    const cookies = request.headers.get('cookie') || '';
    const hasPlayerIdCookie = cookies.includes('player-id=');

    const response = NextResponse.json(responseData);

    // Si pas de cookie player-id, le définir (unification avec dev-login)
    // SECURITY: httpOnly=true prevents XSS attacks from reading the cookie
    if (!hasPlayerIdCookie) {
      response.cookies.set('player-id', player.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 jours
      });
    }

    return response;
  } catch (error) {
    console.error('[GET /api/me] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
