import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireTournamentPermission } from '@/lib/auth-helpers';

const updatePlayerSchema = z.object({
  hasPaid: z.boolean().optional(),
  rebuysCount: z.number().int().min(0).optional(),
  lightRebuyUsed: z.boolean().optional(),
});

// GET - Récupérer les informations d'un joueur inscrit
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;

    const tournamentPlayer = await prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: id,
          playerId: playerId,
        },
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

    if (!tournamentPlayer) {
      return NextResponse.json(
        { error: 'Player enrollment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(tournamentPlayer);
  } catch (error) {
    console.error('Error fetching tournament player:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament player' },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour les informations d'un joueur inscrit
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;
    const body = await request.json();
    const validatedData = updatePlayerSchema.parse(body);

    // Vérifier que l'inscription existe
    const existingEnrollment = await prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: id,
          playerId: playerId,
        },
      },
    });

    if (!existingEnrollment) {
      return NextResponse.json(
        { error: 'Player enrollment not found' },
        { status: 404 }
      );
    }

    // Vérifier que le tournoi existe pour récupérer le créateur
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', id);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Mettre à jour l'inscription
    const updatedTournamentPlayer = await prisma.tournamentPlayer.update({
      where: {
        tournamentId_playerId: {
          tournamentId: id,
          playerId: playerId,
        },
      },
      data: validatedData,
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

    return NextResponse.json(updatedTournamentPlayer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating tournament player:', error);
    return NextResponse.json(
      { error: 'Failed to update tournament player' },
      { status: 500 }
    );
  }
}

// DELETE - Désinscrire un joueur du tournoi
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  try {
    const { id, playerId } = await params;

    // Vérifier que le tournoi n'est pas démarré
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    if (tournament.status !== 'PLANNED') {
      return NextResponse.json(
        { error: 'Cannot unenroll player from started or finished tournament' },
        { status: 400 }
      );
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', id);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier que l'inscription existe
    const existingEnrollment = await prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: id,
          playerId: playerId,
        },
      },
    });

    if (!existingEnrollment) {
      return NextResponse.json(
        { error: 'Player enrollment not found' },
        { status: 404 }
      );
    }

    // Supprimer l'inscription
    await prisma.tournamentPlayer.delete({
      where: {
        tournamentId_playerId: {
          tournamentId: id,
          playerId: playerId,
        },
      },
    });

    // Mettre à jour le nombre total de joueurs du tournoi
    await prisma.tournament.update({
      where: { id },
      data: {
        totalPlayers: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament player:', error);
    return NextResponse.json(
      { error: 'Failed to unenroll player' },
      { status: 500 }
    );
  }
}
