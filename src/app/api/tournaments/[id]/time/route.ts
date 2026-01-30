import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitToTournament } from '@/lib/socket';
import { requireTournamentPermission } from '@/lib/auth-helpers';

// POST - Activer ou annuler le "Time" (temps de réflexion)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action = 'start', duration } = body;

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', id);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier que le tournoi est en cours
    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Le tournoi n\'est pas en cours' },
        { status: 400 }
      );
    }

    if (action === 'start') {
      // Récupérer la durée par défaut depuis les settings si non fournie
      let timeDuration = duration;
      if (!timeDuration) {
        const settings = await prisma.settings.findFirst();
        timeDuration = settings?.defaultTimeDuration ?? 30;
      }

      // S'assurer que la durée est dans les limites
      timeDuration = Math.min(Math.max(timeDuration, 10), 120);

      // Émettre l'événement WebSocket pour démarrer le Time
      emitToTournament(id, 'tournament:time-called', {
        tournamentId: id,
        duration: timeDuration,
        startedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        action: 'started',
        duration: timeDuration,
      });
    } else if (action === 'cancel') {
      // Émettre l'événement WebSocket pour annuler le Time
      emitToTournament(id, 'tournament:time-cancelled', {
        tournamentId: id,
      });

      return NextResponse.json({
        success: true,
        action: 'cancelled',
      });
    } else {
      return NextResponse.json(
        { error: 'Action invalide. Utilisez "start" ou "cancel".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error handling time:', error);
    return NextResponse.json(
      { error: 'Failed to handle time' },
      { status: 500 }
    );
  }
}

// GET - Récupérer la durée par défaut du Time
export async function GET() {
  try {
    const settings = await prisma.settings.findFirst();
    return NextResponse.json({
      defaultTimeDuration: settings?.defaultTimeDuration ?? 30,
    });
  } catch (error) {
    console.error('Error fetching time settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time settings' },
      { status: 500 }
    );
  }
}
