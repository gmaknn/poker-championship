import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentPlayer, requireTournamentPermission } from '@/lib/auth-helpers';
import { canDeleteTournament } from '@/lib/permissions';

const updateTournamentSchema = z.object({
  name: z.string().min(1).optional(),
  seasonId: z.string().optional(),
  date: z.string().datetime().optional(),
  buyIn: z.number().int().min(0).optional(),
  startingChips: z.number().int().min(1000).optional(),
  estimatedDuration: z.number().int().min(30).optional(),
  maxPlayers: z.number().int().optional(),
  status: z.enum(['PLANNED', 'REGISTRATION', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  prizePool: z.number().optional(),
  prizeDistribution: z.record(z.string(), z.number()).optional(), // Prize distribution by position
  actualDuration: z.number().int().optional(),
  completedAt: z.string().datetime().optional(),
});

// GET single tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        season: true,
        tournamentPlayers: {
          include: {
            player: true,
          },
          orderBy: {
            finalRank: 'asc',
          },
        },
        blindLevels: {
          orderBy: {
            level: 'asc',
          },
        },
        eliminations: {
          include: {
            eliminated: true,
            eliminator: true,
          },
        },
        tableAssignments: true,
        _count: {
          select: {
            tournamentPlayers: true,
            blindLevels: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du tournoi' },
      { status: 500 }
    );
  }
}

// PATCH update tournament
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if tournament exists first
    const existingTournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!existingTournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier les permissions (utilise requireTournamentPermission pour support TD assignés)
    const permResult = await requireTournamentPermission(
      request,
      existingTournament.createdById,
      'edit',
      id
    );

    if (!permResult.success) {
      return NextResponse.json(
        { error: permResult.error || 'Vous n\'avez pas la permission de modifier ce tournoi' },
        { status: permResult.status }
      );
    }

    const body = await request.json();
    const validatedData = updateTournamentSchema.parse(body);

    // Prevent editing completed tournaments (except prize pool and distribution)
    if (existingTournament.status === 'FINISHED') {
      // Allow updating only prizePool and prizeDistribution for finished tournaments
      const allowedFields = ['prizePool', 'prizeDistribution'];
      const hasDisallowedChanges = Object.keys(validatedData).some(
        key => !allowedFields.includes(key)
      );

      if (hasDisallowedChanges) {
        return NextResponse.json(
          { error: 'Impossible de modifier un tournoi terminé (seule la distribution du prize pool peut être modifiée)' },
          { status: 400 }
        );
      }
    }

    // If changing season, verify it exists
    if (validatedData.seasonId) {
      const season = await prisma.season.findUnique({
        where: { id: validatedData.seasonId },
      });

      if (!season) {
        return NextResponse.json(
          { error: 'Saison non trouvée' },
          { status: 404 }
        );
      }
    }

    // Extract seasonId and prepare data for Prisma
    const { seasonId, ...updateData } = validatedData;
    const prismaData = seasonId
      ? {
          ...updateData,
          season: {
            connect: { id: seasonId }
          }
        }
      : updateData;

    const tournament = await prisma.tournament.update({
      where: { id },
      data: prismaData,
      include: {
        season: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
          },
        },
      },
    });

    return NextResponse.json(tournament);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating tournament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du tournoi' },
      { status: 500 }
    );
  }
}

// DELETE tournament
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'utilisateur actuel
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            tournamentPlayers: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    if (!canDeleteTournament(currentPlayer.role, tournament.createdById, currentPlayer.id)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer ce tournoi' },
        { status: 403 }
      );
    }

    // Prevent deletion of tournaments with players registered
    if (tournament._count.tournamentPlayers > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un tournoi avec des joueurs inscrits' },
        { status: 400 }
      );
    }

    // Prevent deletion of completed tournaments
    if (tournament.status === 'FINISHED') {
      return NextResponse.json(
        { error: 'Impossible de supprimer un tournoi terminé' },
        { status: 400 }
      );
    }

    await prisma.tournament.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du tournoi' },
      { status: 500 }
    );
  }
}
