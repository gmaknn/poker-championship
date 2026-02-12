import { NextRequest, NextResponse } from 'next/server';
import { getCurrentActor } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { getJwtSecret } from '@/lib/jwt-secret';

/**
 * GET /api/me
 * Retourne le Player courant.
 *
 * PRIORITÉ D'AUTHENTIFICATION :
 * 1. Cookie player-session (JWT) — session joueur via /player/login
 * 2. NextAuth session — session admin/TD via /login
 *
 * Cette priorité est CRITIQUE : un cookie player-session valide doit
 * TOUJOURS retourner le joueur correspondant, même si une session
 * NextAuth existe en parallèle (ex: admin connecté sur le même navigateur).
 */
export async function GET(request: NextRequest) {
  try {
    // 1. PRIORITÉ : Vérifier le cookie player-session (JWT) EN PREMIER
    const playerSessionCookie = request.cookies.get('player-session')?.value;

    if (playerSessionCookie) {
      try {
        const { payload } = await jwtVerify(playerSessionCookie, getJwtSecret());
        const playerId = payload.playerId as string;

        if (playerId) {
          const playerWithRoles = await prisma.player.findUnique({
            where: { id: playerId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
              role: true,
              status: true,
              roles: { select: { role: true } },
            },
          });

          if (playerWithRoles && playerWithRoles.status === 'ACTIVE') {
            const additionalRoles = playerWithRoles.roles?.map(r => r.role) ?? [];

            return NextResponse.json({
              id: playerWithRoles.id,
              role: playerWithRoles.role,
              additionalRoles,
              displayName: playerWithRoles.nickname || `${playerWithRoles.firstName} ${playerWithRoles.lastName}`.trim(),
            });
          }
        }
      } catch (e) {
        // JWT invalide ou expiré — on continue vers NextAuth
        console.warn('[GET /api/me] Invalid player-session JWT:', e instanceof Error ? e.message : 'Unknown error');
      }
    }

    // 2. FALLBACK : Vérifier NextAuth (pour les admins/TD connectés via /login)
    const actor = await getCurrentActor(request, true);

    if (!actor) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { player } = actor;

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

    const responseData = {
      id: playerWithRoles.id,
      role: playerWithRoles.role,
      additionalRoles,
      displayName: playerWithRoles.nickname || `${playerWithRoles.firstName} ${playerWithRoles.lastName}`.trim(),
    };

    // Synchroniser le cookie player-id si absent
    const cookies = request.headers.get('cookie') || '';
    const hasPlayerIdCookie = cookies.includes('player-id=');

    const response = NextResponse.json(responseData);

    if (!hasPlayerIdCookie) {
      response.cookies.set('player-id', player.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
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
