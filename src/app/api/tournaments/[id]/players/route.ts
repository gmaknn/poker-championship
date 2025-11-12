import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const enrollPlayerSchema = z.object({
  playerId: z.string().cuid(),
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

// POST - Inscrire un joueur au tournoi
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = enrollPlayerSchema.parse(body);

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

    // Vérifier que le joueur existe et n'est pas archivé
    const player = await prisma.player.findUnique({
      where: { id: validatedData.playerId },
    });

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    if (player.status === 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Cannot enroll archived player' },
        { status: 400 }
      );
    }

    // Vérifier que le joueur n'est pas déjà inscrit
    const existingEnrollment = await prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: id,
          playerId: validatedData.playerId,
        },
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Player is already enrolled in this tournament' },
        { status: 409 }
      );
    }

    // Inscrire le joueur
    const tournamentPlayer = await prisma.tournamentPlayer.create({
      data: {
        tournamentId: id,
        playerId: validatedData.playerId,
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

    // Mettre à jour le nombre total de joueurs du tournoi
    await prisma.tournament.update({
      where: { id },
      data: {
        totalPlayers: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(tournamentPlayer, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error enrolling player:', error);
    return NextResponse.json(
      { error: 'Failed to enroll player' },
      { status: 500 }
    );
  }
}
