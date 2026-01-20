import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev'
);

/**
 * POST /api/auth/player-login
 * Authenticate a player with email/password
 *
 * Returns player info and sets a session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Find player by email
    // Note: For PostgreSQL, use { equals: email, mode: 'insensitive' }
    // For SQLite (dev), we do a simple match
    const player = await prisma.player.findFirst({
      where: {
        email: email,
      },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        nickname: true,
        avatar: true,
        status: true,
        role: true,
      },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Check if player has a password set (account activated)
    if (!player.password) {
      return NextResponse.json(
        { error: 'Compte non activé. Vérifiez vos emails pour le lien d\'activation.' },
        { status: 401 }
      );
    }

    // Check player status
    if (player.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Votre compte est désactivé. Contactez un administrateur.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, player.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Create JWT token for player session
    const token = await new SignJWT({
      playerId: player.id,
      email: player.email,
      nickname: player.nickname,
      role: player.role,
      type: 'player', // Distinguish from admin sessions
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('player-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Also set a simple player-id cookie for backwards compatibility
    cookieStore.set('player-id', player.id, {
      httpOnly: false, // Readable by client
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      playerId: player.id,
      player: {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        nickname: player.nickname,
        avatar: player.avatar,
        role: player.role,
      },
    });
  } catch (error) {
    console.error('Player login error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue' },
      { status: 500 }
    );
  }
}
