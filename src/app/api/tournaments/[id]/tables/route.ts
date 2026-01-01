import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireTournamentPermission } from '@/lib/auth-helpers';

const generateTablesSchema = z.object({
  seatsPerTable: z.number().int().min(2).max(10),
});

// GET - Récupérer la distribution actuelle des tables
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Récupérer les assignations de tables avec les infos des joueurs
    const assignments = await prisma.tableAssignment.findMany({
      where: {
        tournamentId,
        isActive: true,
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: [{ tableNumber: 'asc' }, { seatNumber: 'asc' }],
    });

    // Récupérer les infos des joueurs inscrits
    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
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
    });

    // Créer une map pour récupérer facilement les infos joueur
    const playerMap = new Map(
      tournamentPlayers.map((tp) => [tp.playerId, tp])
    );

    // Enrichir les assignations avec les infos des joueurs
    const enrichedAssignments = assignments.map((assignment) => {
      const tournamentPlayer = playerMap.get(assignment.playerId);
      return {
        ...assignment,
        player: tournamentPlayer?.player,
        isEliminated: tournamentPlayer?.finalRank !== null,
      };
    });

    // Regrouper par table
    const tableMap = new Map<number, typeof enrichedAssignments>();
    enrichedAssignments.forEach((assignment) => {
      const table = tableMap.get(assignment.tableNumber) || [];
      table.push(assignment);
      tableMap.set(assignment.tableNumber, table);
    });

    const tables = Array.from(tableMap.entries()).map(([tableNumber, players]) => ({
      tableNumber,
      players,
      activePlayers: players.filter((p) => !p.isEliminated).length,
      totalPlayers: players.length,
    }));

    return NextResponse.json({
      tables,
      totalTables: tables.length,
      totalPlayers: enrichedAssignments.length,
      activePlayers: enrichedAssignments.filter((a) => !a.isEliminated).length,
    });
  } catch (error) {
    console.error('Error fetching table assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table assignments' },
      { status: 500 }
    );
  }
}

// POST - Générer la distribution des tables
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const validatedData = generateTablesSchema.parse(body);

    // Vérifier que le tournoi existe
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
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

    // Récupérer les joueurs inscrits (non éliminés)
    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: {
        tournamentId,
        finalRank: null, // Seulement les joueurs actifs
      },
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
    });

    if (tournamentPlayers.length === 0) {
      return NextResponse.json(
        { error: 'No active players enrolled in this tournament' },
        { status: 400 }
      );
    }

    // Vérifier s'il y a déjà des assignations actives
    const existingAssignments = await prisma.tableAssignment.count({
      where: {
        tournamentId,
        isActive: true,
      },
    });

    if (existingAssignments > 0) {
      return NextResponse.json(
        {
          error:
            'Table assignments already exist. Delete existing assignments first or use rebalance endpoint.',
        },
        { status: 400 }
      );
    }

    // Algorithme de distribution
    const { seatsPerTable } = validatedData;
    const totalPlayers = tournamentPlayers.length;
    const numberOfTables = Math.ceil(totalPlayers / seatsPerTable);

    // Mélanger les joueurs aléatoirement
    const shuffledPlayers = [...tournamentPlayers].sort(() => Math.random() - 0.5);

    // Créer les assignations
    const assignments: Array<{
      tournamentId: string;
      playerId: string;
      tableNumber: number;
      seatNumber: number;
      isActive: boolean;
    }> = [];
    let playerIndex = 0;

    for (let tableNumber = 1; tableNumber <= numberOfTables; tableNumber++) {
      const playersForThisTable = Math.ceil(
        (totalPlayers - playerIndex) / (numberOfTables - tableNumber + 1)
      );

      for (let seatNumber = 1; seatNumber <= playersForThisTable; seatNumber++) {
        if (playerIndex < shuffledPlayers.length) {
          assignments.push({
            tournamentId,
            playerId: shuffledPlayers[playerIndex].playerId,
            tableNumber,
            seatNumber,
            isActive: true,
          });
          playerIndex++;
        }
      }
    }

    // Sauvegarder les assignations dans une transaction
    await prisma.$transaction(async (tx) => {
      // Marquer toutes les anciennes assignations comme inactives
      await tx.tableAssignment.updateMany({
        where: { tournamentId },
        data: { isActive: false },
      });

      // Créer les nouvelles assignations
      await tx.tableAssignment.createMany({
        data: assignments,
      });
    });

    // Récupérer les assignations créées avec les infos complètes
    const createdAssignments = await prisma.tableAssignment.findMany({
      where: {
        tournamentId,
        isActive: true,
      },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ tableNumber: 'asc' }, { seatNumber: 'asc' }],
    });

    // Enrichir avec les infos des joueurs
    const playerMap = new Map(
      tournamentPlayers.map((tp) => [tp.playerId, tp.player])
    );

    const enrichedAssignments = createdAssignments.map((assignment) => ({
      ...assignment,
      player: playerMap.get(assignment.playerId),
    }));

    // Regrouper par table
    const tableMap = new Map<number, typeof enrichedAssignments>();
    enrichedAssignments.forEach((assignment) => {
      const table = tableMap.get(assignment.tableNumber) || [];
      table.push(assignment);
      tableMap.set(assignment.tableNumber, table);
    });

    const tables = Array.from(tableMap.entries()).map(([tableNumber, players]) => ({
      tableNumber,
      players,
      activePlayers: players.length,
      totalPlayers: players.length,
    }));

    return NextResponse.json({
      success: true,
      tables,
      totalTables: tables.length,
      totalPlayers: enrichedAssignments.length,
      seatsPerTable: validatedData.seatsPerTable,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error generating table assignments:', error);
    return NextResponse.json(
      { error: 'Failed to generate table assignments' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer toutes les assignations de tables
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Vérifier que le tournoi existe pour récupérer le créateur
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    // Marquer toutes les assignations comme inactives
    await prisma.tableAssignment.updateMany({
      where: { tournamentId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table assignments:', error);
    return NextResponse.json(
      { error: 'Failed to delete table assignments' },
      { status: 500 }
    );
  }
}
