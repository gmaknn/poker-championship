import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { emitToTournament } from '@/lib/socket';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { areRecavesOpen, calculateEffectiveLevel } from '@/lib/tournament-utils';
import { pauseTimerForTournament } from '@/lib/timer-actions';

const bustSchema = z.object({
  eliminatedId: z.string().cuid(), // playerId du joueur qui a perdu son tapis
  killerId: z.string().cuid(), // playerId du killer (obligatoire)
});

// GET - Récupérer tous les busts du tournoi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const busts = await prisma.bustEvent.findMany({
      where: { tournamentId: id },
      include: {
        eliminated: {
          select: {
            id: true,
            playerId: true,
            rebuysCount: true,
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                nickname: true,
              },
            },
          },
        },
        killer: {
          include: {
            player: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                nickname: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(busts);
  } catch (error) {
    console.error('Error fetching busts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch busts' },
      { status: 500 }
    );
  }
}

// POST - Enregistrer un nouveau bust (perte de tapis pendant période de recaves)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Vérifier que le tournoi existe et est en cours
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        tournamentPlayers: {
          include: {
            player: true,
          },
        },
        blindLevels: {
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    const body = await request.json();
    const validatedData = bustSchema.parse(body);

    // Block mutations on finished tournaments
    if (tournament.status === 'FINISHED') {
      return NextResponse.json(
        { error: 'Tournament is finished' },
        { status: 400 }
      );
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Tournament is not in progress' },
        { status: 400 }
      );
    }

    // Calculer le niveau effectif basé sur le timer (pas la valeur DB qui n'est pas synchronisée)
    const effectiveLevel = calculateEffectiveLevel(tournament, tournament.blindLevels);

    // Les busts ne sont autorisés que pendant la période de recaves
    // (inclut la pause suivant "Fin recaves" pour permettre les recaves light)
    if (!areRecavesOpen(tournament, effectiveLevel, tournament.blindLevels)) {
      return NextResponse.json(
        { error: 'Période de recaves terminée. Utilisez l\'élimination définitive.' },
        { status: 400 }
      );
    }

    // Vérifier que le joueur éliminé est inscrit au tournoi
    const eliminatedPlayer = tournament.tournamentPlayers.find(
      (tp) => tp.playerId === validatedData.eliminatedId
    );

    if (!eliminatedPlayer) {
      return NextResponse.json(
        { error: 'Player is not enrolled in this tournament' },
        { status: 400 }
      );
    }

    // Vérifier que le joueur n'est pas déjà éliminé définitivement
    if (eliminatedPlayer.finalRank !== null) {
      return NextResponse.json(
        { error: 'Player has already been eliminated' },
        { status: 400 }
      );
    }

    // Vérifier le killer (obligatoire)
    const killerPlayer = tournament.tournamentPlayers.find(
      (tp) => tp.playerId === validatedData.killerId
    );

    if (!killerPlayer) {
      return NextResponse.json(
        { error: 'Killer is not enrolled in this tournament' },
        { status: 400 }
      );
    }

    // Vérifier que le killer n'est pas le joueur éliminé
    if (validatedData.killerId === validatedData.eliminatedId) {
      return NextResponse.json(
        { error: 'A player cannot eliminate themselves' },
        { status: 400 }
      );
    }

    // === TRANSACTION ATOMIQUE ===
    const result = await prisma.$transaction(async (tx) => {
      // Créer le bust event avec le niveau effectif (pas la valeur DB)
      const bustEvent = await tx.bustEvent.create({
        data: {
          tournamentId,
          eliminatedId: eliminatedPlayer.id, // TournamentPlayer ID
          killerId: killerPlayer.id, // TournamentPlayer ID (obligatoire)
          level: effectiveLevel,
        },
        include: {
          eliminated: {
            include: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  nickname: true,
                },
              },
            },
          },
          killer: {
            include: {
              player: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  nickname: true,
                },
              },
            },
          },
        },
      });

      // Incrémenter le nombre d'éliminations bust du killer
      // Note: bustEliminations sont les éliminations PENDANT la période de recaves
      // (pas les éliminations finales qui rapportent plus de points)
      await tx.tournamentPlayer.update({
        where: { id: killerPlayer.id },
        data: {
          bustEliminations: { increment: 1 },
        },
      });

      return bustEvent;
    });

    // Émettre l'événement de bust via WebSocket
    emitToTournament(tournamentId, 'bust:player_busted', {
      tournamentId,
      eliminatedId: validatedData.eliminatedId,
      eliminatedName: result.eliminated.player.nickname,
      killerId: validatedData.killerId || null,
      killerName: result.killer?.player.nickname || null,
      level: effectiveLevel,
    });

    // Auto-pause du timer lors d'un bust
    await pauseTimerForTournament(tournamentId);

    return NextResponse.json({
      success: true,
      bustEvent: result,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating bust:', error);
    return NextResponse.json(
      { error: 'Failed to create bust' },
      { status: 500 }
    );
  }
}
