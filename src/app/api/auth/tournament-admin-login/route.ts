import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/jwt-secret';

const loginSchema = z.object({
  code: z.string().length(6, 'Le code doit contenir 6 caractères'),
});

/**
 * POST /api/auth/tournament-admin-login
 * Authentifie un admin temporaire de tournoi via le code d'accès 6 chars.
 *
 * Cherche parmi les tournois IN_PROGRESS celui dont le hash correspond.
 * Retourne un JWT scopé au tournoi avec type: 'tournament-admin'.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code } = validation.data;
    const upperCode = code.toUpperCase();

    // Récupérer tous les tournois IN_PROGRESS avec un code d'accès
    const tournaments = await prisma.tournament.findMany({
      where: {
        status: 'IN_PROGRESS',
        adminAccessCodeHash: { not: null },
      },
      select: {
        id: true,
        name: true,
        adminAccessCodeHash: true,
      },
    });

    // Chercher le tournoi correspondant au code
    let matchedTournament: { id: string; name: string | null } | null = null;

    for (const tournament of tournaments) {
      if (tournament.adminAccessCodeHash) {
        const isMatch = await bcrypt.compare(upperCode, tournament.adminAccessCodeHash);
        if (isMatch) {
          matchedTournament = { id: tournament.id, name: tournament.name };
          break;
        }
      }
    }

    if (!matchedTournament) {
      return NextResponse.json(
        { error: 'Code invalide ou tournoi non trouvé' },
        { status: 401 }
      );
    }

    // Créer un JWT scopé au tournoi
    const token = await new SignJWT({
      type: 'tournament-admin',
      tournamentId: matchedTournament.id,
      role: 'ADMIN',
      displayName: 'Admin Tournoi',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h') // Session limitée à 12h
      .sign(getJwtSecret());

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('player-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12, // 12 heures
      path: '/',
    });

    return NextResponse.json({
      success: true,
      tournamentId: matchedTournament.id,
      tournamentName: matchedTournament.name,
    });
  } catch (error) {
    console.error('Tournament admin login error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
