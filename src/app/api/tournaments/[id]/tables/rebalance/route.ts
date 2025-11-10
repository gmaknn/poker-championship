import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const rebalanceSchema = z.object({
  seatsPerTable: z.number().int().min(2).max(10),
  minPlayersToBreakTable: z.number().int().min(1).optional().default(3),
});

// POST - Rééquilibrer les tables après des éliminations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const validatedData = rebalanceSchema.parse(body);

    // Vérifier que le tournoi existe et est en cours
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Récupérer les joueurs actifs (non éliminés)
    const activePlayers = await prisma.tournamentPlayer.findMany({
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

    if (activePlayers.length === 0) {
      return NextResponse.json(
        { error: 'No active players in this tournament' },
        { status: 400 }
      );
    }

    const { seatsPerTable, minPlayersToBreakTable } = validatedData;
    const totalActivePlayers = activePlayers.length;

    // Calculer le nombre optimal de tables
    const optimalTables = Math.ceil(totalActivePlayers / seatsPerTable);

    // Si on a assez de joueurs pour remplir convenablement les tables
    let numberOfTables = optimalTables;
    const playersPerTable = Math.ceil(totalActivePlayers / numberOfTables);

    // Vérifier qu'aucune table ne sera trop vide
    if (playersPerTable < minPlayersToBreakTable && numberOfTables > 1) {
      numberOfTables = Math.floor(totalActivePlayers / minPlayersToBreakTable);
    }

    // Minimum 1 table
    numberOfTables = Math.max(1, numberOfTables);

    // Récupérer les assignations actuelles
    const currentAssignments = await prisma.tableAssignment.findMany({
      where: {
        tournamentId,
        isActive: true,
      },
      orderBy: [{ tableNumber: 'asc' }, { seatNumber: 'asc' }],
    });

    // Créer une map des assignations actuelles par joueur
    const currentTableMap = new Map(
      currentAssignments.map((a) => [a.playerId, a.tableNumber])
    );

    // Filtrer les joueurs actifs qui ont une assignation
    const activePlayerIds = new Set(activePlayers.map((p) => p.playerId));
    const playersToAssign = activePlayers.map((p) => ({
      playerId: p.playerId,
      currentTable: currentTableMap.get(p.playerId),
      player: p.player,
    }));

    // Algorithme de rééquilibrage équitable
    // On essaie de minimiser les déplacements tout en équilibrant les tables
    const newAssignments = [];
    let playerIndex = 0;

    // Mélanger légèrement les joueurs pour éviter de garder toujours la même distribution
    // mais préserver un peu l'ordre pour minimiser les déplacements
    const shuffledPlayers = [...playersToAssign].sort(() => Math.random() * 0.4 - 0.2);

    for (let tableNumber = 1; tableNumber <= numberOfTables; tableNumber++) {
      const playersForThisTable = Math.ceil(
        (totalActivePlayers - playerIndex) / (numberOfTables - tableNumber + 1)
      );

      for (let seatNumber = 1; seatNumber <= playersForThisTable; seatNumber++) {
        if (playerIndex < shuffledPlayers.length) {
          newAssignments.push({
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

    // Calculer les statistiques de rééquilibrage
    const movedPlayers = newAssignments.filter((assignment) => {
      const currentTable = currentTableMap.get(assignment.playerId);
      return currentTable !== undefined && currentTable !== assignment.tableNumber;
    });

    const brokenTables = new Set(
      currentAssignments
        .filter((a) => !activePlayerIds.has(a.playerId))
        .map((a) => a.tableNumber)
    );

    // Sauvegarder les nouvelles assignations dans une transaction
    await prisma.$transaction(async (tx) => {
      // Marquer toutes les anciennes assignations comme inactives
      await tx.tableAssignment.updateMany({
        where: { tournamentId },
        data: { isActive: false },
      });

      // Créer les nouvelles assignations
      if (newAssignments.length > 0) {
        await tx.tableAssignment.createMany({
          data: newAssignments,
        });
      }
    });

    // Récupérer les nouvelles assignations avec les infos complètes
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
    const playerMap = new Map(activePlayers.map((p) => [p.playerId, p.player]));

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
      movedPlayers: movedPlayers.length,
      brokenTables: brokenTables.size,
      seatsPerTable: validatedData.seatsPerTable,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error rebalancing tables:', error);
    return NextResponse.json(
      { error: 'Failed to rebalance tables' },
      { status: 500 }
    );
  }
}
