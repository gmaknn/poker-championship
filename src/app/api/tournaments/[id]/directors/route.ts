/**
 * API pour gérer les directeurs de tournoi assignés
 * GET - Liste des directeurs
 * POST - Ajouter un directeur
 * DELETE - Retirer un directeur
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requirePermission, getTournamentDirectors } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';

const addDirectorSchema = z.object({
  playerId: z.string().cuid(),
});

const removeDirectorSchema = z.object({
  playerId: z.string().cuid(),
});

// GET - Récupérer la liste des directeurs du tournoi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        createdById: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Récupérer les directeurs assignés
    const directors = await getTournamentDirectors(tournamentId);

    // Récupérer les directeurs disponibles (joueurs avec rôle TD ou ADMIN non encore assignés)
    const assignedPlayerIds = directors.map(d => d.playerId);

    const availableDirectors = await prisma.player.findMany({
      where: {
        OR: [
          { role: { in: ['TOURNAMENT_DIRECTOR', 'ADMIN'] } },
          { roles: { some: { role: { in: ['TOURNAMENT_DIRECTOR', 'ADMIN'] } } } }
        ],
        // Exclure les joueurs déjà assignés à ce tournoi
        NOT: assignedPlayerIds.length > 0 ? {
          id: { in: assignedPlayerIds }
        } : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        nickname: true,
        role: true,
        avatar: true,
      },
      orderBy: { nickname: 'asc' },
    });

    return NextResponse.json({
      tournamentId,
      createdBy: tournament.createdBy,
      directors: directors.map(d => ({
        id: d.id,
        playerId: d.playerId,
        player: d.player,
        assignedAt: d.assignedAt,
      })),
      availableDirectors,
    });
  } catch (error) {
    console.error('Error fetching tournament directors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament directors' },
      { status: 500 }
    );
  }
}

// POST - Ajouter un directeur au tournoi (ADMIN uniquement)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Seul ADMIN peut assigner des directeurs
    const permResult = await requirePermission(request, PERMISSIONS.EDIT_ALL_TOURNAMENTS);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const body = await request.json();
    const { playerId } = addDirectorSchema.parse(body);

    // Vérifier que le joueur existe et est TD ou Admin
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        roles: { select: { role: true } },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Vérifier que le joueur a le rôle TD ou est déjà Admin
    const isTD = player.role === 'TOURNAMENT_DIRECTOR' ||
      player.roles.some(r => r.role === 'TOURNAMENT_DIRECTOR');
    const isAdmin = player.role === 'ADMIN' ||
      player.roles.some(r => r.role === 'ADMIN');

    if (!isTD && !isAdmin) {
      return NextResponse.json(
        { error: 'Player must have TOURNAMENT_DIRECTOR or ADMIN role' },
        { status: 400 }
      );
    }

    // Vérifier si déjà assigné
    const existingAssignment = await prisma.tournamentDirector.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Player is already a director of this tournament' },
        { status: 409 }
      );
    }

    // Créer l'assignation
    const director = await prisma.tournamentDirector.create({
      data: {
        tournamentId,
        playerId,
        assignedById: permResult.player.id,
      },
      include: {
        player: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      director: {
        id: director.id,
        playerId: director.playerId,
        player: director.player,
        assignedAt: director.assignedAt,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error adding tournament director:', error);
    return NextResponse.json(
      { error: 'Failed to add tournament director' },
      { status: 500 }
    );
  }
}

// DELETE - Retirer un directeur du tournoi (ADMIN uniquement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Seul ADMIN peut retirer des directeurs
    const permResult = await requirePermission(request, PERMISSIONS.EDIT_ALL_TOURNAMENTS);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const body = await request.json();
    const { playerId } = removeDirectorSchema.parse(body);

    // Vérifier si l'assignation existe
    const existingAssignment = await prisma.tournamentDirector.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Player is not a director of this tournament' },
        { status: 404 }
      );
    }

    // Supprimer l'assignation
    await prisma.tournamentDirector.delete({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error removing tournament director:', error);
    return NextResponse.json(
      { error: 'Failed to remove tournament director' },
      { status: 500 }
    );
  }
}
