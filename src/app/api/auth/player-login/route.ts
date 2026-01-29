import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { getJwtSecret } from '@/lib/jwt-secret';

// Helper to normalize phone number (remove spaces, dashes, dots)
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\.]/g, '');
}

// Helper to detect if input is a phone number
function isPhoneNumber(input: string): boolean {
  const normalized = normalizePhone(input);
  // French phone format: 10 digits starting with 0
  return /^0[1-9]\d{8}$/.test(normalized);
}

const loginSchema = z.object({
  identifier: z.string().min(1, 'Téléphone ou email requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});

/**
 * POST /api/auth/player-login
 * Authenticate a player with phone/email and password
 *
 * Returns player info and sets a session cookie
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both old 'email' field and new 'identifier' field for backwards compatibility
    const identifier = body.identifier || body.email;
    const password = body.password;

    // Validate input
    const validation = loginSchema.safeParse({ identifier, password });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    // Determine if identifier is phone or email
    const isPhone = isPhoneNumber(identifier);

    let player;
    if (isPhone) {
      // Search by phone (normalized)
      const normalizedPhone = normalizePhone(identifier);
      player = await prisma.player.findFirst({
        where: {
          phone: normalizedPhone,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          password: true,
          firstName: true,
          lastName: true,
          nickname: true,
          avatar: true,
          status: true,
          role: true,
        },
      });
    } else {
      // Search by email
      player = await prisma.player.findFirst({
        where: {
          email: identifier,
        },
        select: {
          id: true,
          email: true,
          phone: true,
          password: true,
          firstName: true,
          lastName: true,
          nickname: true,
          avatar: true,
          status: true,
          role: true,
        },
      });
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Identifiant ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Check if player has a password set (account activated)
    if (!player.password) {
      return NextResponse.json(
        { error: 'Compte non activé. Contactez un administrateur.' },
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
        { error: 'Identifiant ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Create JWT token for player session
    const token = await new SignJWT({
      playerId: player.id,
      email: player.email,
      phone: player.phone,
      nickname: player.nickname,
      role: player.role,
      type: 'player', // Distinguish from admin sessions
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getJwtSecret());

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
    // SECURITY: httpOnly prevents XSS attacks from reading the cookie
    cookieStore.set('player-id', player.id, {
      httpOnly: true,
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
