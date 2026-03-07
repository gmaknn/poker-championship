import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { isSuperAdminMultiRole } from '@/lib/permissions';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * GET /api/tournaments/[id]/access-code
 * Vérifie si un code d'accès existe pour ce tournoi
 * Accessible aux SUPERADMIN uniquement
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const player = await getCurrentPlayer(request);
    if (!player) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!isSuperAdminMultiRole(player.role, player.additionalRoles)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        adminAccessCodeHash: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournoi non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      hasCode: !!tournament.adminAccessCodeHash,
      status: tournament.status,
    });
  } catch (error) {
    console.error('Error checking access code:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/tournaments/[id]/access-code
 * Régénère le code d'accès admin pour ce tournoi
 * SUPERADMIN uniquement, tournoi doit être IN_PROGRESS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const player = await getCurrentPlayer(request);
    if (!player) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!isSuperAdminMultiRole(player.role, player.additionalRoles)) {
      return NextResponse.json({ error: 'Accès refusé — SUPERADMIN requis' }, { status: 403 });
    }

    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournoi non trouvé' }, { status: 404 });
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Le code ne peut être généré que pour un tournoi en cours' },
        { status: 400 }
      );
    }

    // Générer un nouveau code 6 chars hex uppercase
    const accessCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const adminAccessCodeHash = await bcrypt.hash(accessCode, 10);

    await prisma.tournament.update({
      where: { id },
      data: { adminAccessCodeHash },
    });

    return NextResponse.json({
      success: true,
      accessCode, // Code en clair retourné une seule fois
    });
  } catch (error) {
    console.error('Error regenerating access code:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
