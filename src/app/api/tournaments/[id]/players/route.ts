import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const enrollPlayerSchema = z.object({
  playerId: z.string().cuid().optional(),
  playerIds: z.array(z.string().cuid()).optional(),
}).refine(data => data.playerId || (data.playerIds && data.playerIds.length > 0), {
  message: "Either playerId or playerIds must be provided",
});

// GET - Récupérer la liste des joueurs inscrits au tournoi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId: id },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(tournamentPlayers);
  } catch (error) {
    console.error('Error fetching tournament players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament players' },
      { status: 500 }
    );
  }
}

// POST - Inscrire un ou plusieurs joueurs au tournoi
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = enrollPlayerSchema.parse(body);

    // Convertir en tableau pour traiter de manière uniforme
    const playerIdsToEnroll = validatedData.playerIds || [validatedData.playerId!];

    // Vérifier que le tournoi existe et n'est pas terminé
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status === 'FINISHED' || tournament.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Cannot enroll player in finished or cancelled tournament' },
        { status: 400 }
      );
    }

    // Vérifier tous les joueurs
    const players = await prisma.player.findMany({
      where: {
        id: { in: playerIdsToEnroll },
      },
    });

    if (players.length !== playerIdsToEnroll.length) {
      return NextResponse.json(
        { error: 'One or more players not found' },
        { status: 404 }
      );
    }

    const archivedPlayers = players.filter(p => p.status === 'ARCHIVED');
    if (archivedPlayers.length > 0) {
      return NextResponse.json(
        { error: `Cannot enroll archived players: ${archivedPlayers.map(p => p.nickname).join(', ')}` },
        { status: 400 }
      );
    }

    // Vérifier les inscriptions existantes
    const existingEnrollments = await prisma.tournamentPlayer.findMany({
      where: {
        tournamentId: id,
        playerId: { in: playerIdsToEnroll },
      },
    });

    if (existingEnrollments.length > 0) {
      const alreadyEnrolled = await prisma.player.findMany({
        where: { id: { in: existingEnrollments.map(e => e.playerId) } },
        select: { nickname: true },
      });
      return NextResponse.json(
        { error: `Players already enrolled: ${alreadyEnrolled.map(p => p.nickname).join(', ')}` },
        { status: 409 }
      );
    }

    // Inscrire tous les joueurs en une transaction
    const tournamentPlayers = await prisma.$transaction(async (tx) => {
      const enrolled = await tx.tournamentPlayer.createMany({
        data: playerIdsToEnroll.map(playerId => ({
          tournamentId: id,
          playerId,
        })),
      });

      // Mettre à jour le nombre total de joueurs
      await tx.tournament.update({
        where: { id },
        data: {
          totalPlayers: {
            increment: playerIdsToEnroll.length,
          },
        },
      });

      // Récupérer les joueurs inscrits avec leurs infos
      return tx.tournamentPlayer.findMany({
        where: {
          tournamentId: id,
          playerId: { in: playerIdsToEnroll },
        },
        include: {
          player: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              nickname: true,
              email: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      enrolled: tournamentPlayers,
      count: tournamentPlayers.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error enrolling player(s):', error);
    return NextResponse.json(
      { error: 'Failed to enroll player(s)' },
      { status: 500 }
    );
  }
}
