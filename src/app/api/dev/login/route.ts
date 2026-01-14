/**
 * DEV ONLY - Local admin login route
 *
 * SECURITY: This route is ONLY active when ALL conditions are met:
 * 1. NODE_ENV === "development"
 * 2. NEXT_PUBLIC_DEV_LOGIN === "1"
 * 3. Request origin is localhost or 127.0.0.1
 *
 * Returns 404 if any condition fails (does not reveal route existence)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signIn } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Dev admin credentials (only used in development)
const DEV_ADMIN_EMAIL = 'admin@local.test';
const DEV_ADMIN_PASSWORD = 'devadmin123';
const DEV_ADMIN_NAME = 'Admin Local';

/**
 * Vérifie que toutes les conditions de sécurité sont remplies
 */
function isDevLoginAllowed(request: NextRequest): boolean {
  // Condition 1: NODE_ENV must be development
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[DevLogin] Blocked: NODE_ENV is not development');
    return false;
  }

  // Condition 2: NEXT_PUBLIC_DEV_LOGIN must be "1"
  if (process.env.NEXT_PUBLIC_DEV_LOGIN !== '1') {
    console.warn('[DevLogin] Blocked: NEXT_PUBLIC_DEV_LOGIN is not "1"');
    return false;
  }

  // Condition 3: Request must come from localhost
  const host = request.headers.get('host') || '';
  const origin = request.headers.get('origin') || '';

  const isLocalHost =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');

  if (!isLocalHost) {
    console.warn('[DevLogin] Blocked: Request not from localhost');
    return false;
  }

  return true;
}

/**
 * POST /api/dev/login
 *
 * Creates or finds the dev admin user and returns credentials
 * for client-side signIn
 */
export async function POST(request: NextRequest) {
  // Security check - return 404 to hide route existence
  if (!isDevLoginAllowed(request)) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    // Upsert the dev admin user
    const hashedPassword = await bcrypt.hash(DEV_ADMIN_PASSWORD, 10);

    const user = await prisma.user.upsert({
      where: { email: DEV_ADMIN_EMAIL },
      update: {
        name: DEV_ADMIN_NAME,
        role: 'ADMIN',
        // Update password in case it changed
        password: hashedPassword,
      },
      create: {
        email: DEV_ADMIN_EMAIL,
        name: DEV_ADMIN_NAME,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    // Also ensure a corresponding Player exists for tournament operations
    // Use nickname as unique identifier since email is not unique in Player model
    await prisma.player.upsert({
      where: { nickname: 'AdminLocal' },
      update: {
        firstName: 'Admin',
        lastName: 'Local',
        email: DEV_ADMIN_EMAIL,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      create: {
        firstName: 'Admin',
        lastName: 'Local',
        nickname: 'AdminLocal',
        email: DEV_ADMIN_EMAIL,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    console.log('[DevLogin] Dev admin user ready:', user.email);

    // Return credentials for client-side signIn
    // The client will use these with the standard Auth.js signIn flow
    return NextResponse.json({
      success: true,
      credentials: {
        email: DEV_ADMIN_EMAIL,
        password: DEV_ADMIN_PASSWORD,
      },
      message: 'Dev admin ready. Use credentials with signIn.',
    });
  } catch (error) {
    console.error('[DevLogin] Error:', error);
    return NextResponse.json(
      { error: 'Failed to setup dev admin' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dev/login
 *
 * Returns info about the dev login (if allowed)
 */
export async function GET(request: NextRequest) {
  // Security check - return 404 to hide route existence
  if (!isDevLoginAllowed(request)) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({
    enabled: true,
    email: DEV_ADMIN_EMAIL,
    message: 'Dev login is enabled. POST to this endpoint to setup admin.',
  });
}
