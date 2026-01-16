import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { emitToTournament } from '@/lib/socket';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { areRecavesOpen, calculateEffectiveLevel } from '@/lib/tournament-utils';

const bustSchema = z.object({
  eliminatedId: z.string().cuid(), // playerId du joueur qui a perdu son tapis
  killerId: z.string().cuid().optional(), // playerId du killer (optionnel)
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
    if (!areRecavesOpen(tournament, effectiveLevel)) {
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

    // Vérifier le killer s'il est spécifié
    let killerPlayer = null;
    if (validatedData.killerId) {
      killerPlayer = tournament.tournamentPlayers.find(
        (tp) => tp.playerId === validatedData.killerId
      );

      if (!killerPlayer) {
        return NextResponse.json(
          { error: 'Killer is not enrolled in this tournament' },
          { status: 400 }
        );
      }
    }

    // === TRANSACTION ATOMIQUE ===
    const result = await prisma.$transaction(async (tx) => {
      // Créer le bust event avec le niveau effectif (pas la valeur DB)
      const bustEvent = await tx.bustEvent.create({
        data: {
          tournamentId,
          eliminatedId: eliminatedPlayer.id, // TournamentPlayer ID
          killerId: killerPlayer?.id || null, // TournamentPlayer ID
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

      // Incrémenter le nombre d'éliminations du killer s'il est spécifié
      if (killerPlayer) {
        await tx.tournamentPlayer.update({
          where: { id: killerPlayer.id },
          data: {
            eliminationsCount: { increment: 1 },
          },
        });
      }

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
