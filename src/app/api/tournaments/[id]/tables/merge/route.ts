import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';

const mergeSchema = z.object({
  tableToClose: z.number().int().min(1),
});

/**
 * POST — Fusionner/fermer une table manuellement.
 * Redistribue les joueurs de la table fermée vers les tables restantes (round-robin).
 * Émet `tables:merged` via Socket.IO.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, status: true, seatsPerTable: true, createdById: true },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Tournament is not in progress' }, { status: 400 });
    }

    const body = await request.json();
    const { tableToClose } = mergeSchema.parse(body);
    const seatsPerTable = tournament.seatsPerTable ?? 9;

    // Récupérer toutes les assignations actives
    const allAssignments = await prisma.tableAssignment.findMany({
      where: { tournamentId, isActive: true },
      orderBy: [{ tableNumber: 'asc' }, { seatNumber: 'asc' }],
    });

    // Grouper par table
    const tableMap = new Map<number, typeof allAssignments>();
    for (const a of allAssignments) {
      const list = tableMap.get(a.tableNumber) || [];
      list.push(a);
      tableMap.set(a.tableNumber, list);
    }

    const tableNumbers = Array.from(tableMap.keys()).sort((a, b) => a - b);

    // Vérifier que la table existe
    if (!tableMap.has(tableToClose)) {
      return NextResponse.json(
        { error: `Table ${tableToClose} has no active players` },
        { status: 400 }
      );
    }

    // Vérifier qu'il y a au moins 2 tables
    if (tableNumbers.length < 2) {
      return NextResponse.json(
        { error: 'Cannot merge: only 1 table remaining' },
        { status: 400 }
      );
    }

    const playersToMove = tableMap.get(tableToClose)!;
    const remainingTables = tableNumbers.filter((t) => t !== tableToClose);

    // Vérifier la capacité
    const remainingCapacity = remainingTables.length * seatsPerTable;
    const remainingPlayersCount = allAssignments.length - playersToMove.length;
    const totalAfterMerge = remainingPlayersCount + playersToMove.length;

    if (totalAfterMerge > remainingCapacity) {
      return NextResponse.json(
        { error: `Not enough capacity: ${totalAfterMerge} players for ${remainingTables.length} tables (${remainingCapacity} seats)` },
        { status: 400 }
      );
    }

    // Charger les noms des joueurs
    const players = await prisma.player.findMany({
      where: { id: { in: playersToMove.map((a) => a.playerId) } },
      select: { id: true, firstName: true, lastName: true, nickname: true },
    });
    const nameMap = new Map(
      players.map((p) => [p.id, p.nickname || `${p.firstName} ${p.lastName}`])
    );

    // Build free seats per remaining table + player counts
    const freeSeatsByTable = new Map<number, number[]>();
    const playerCountByTable = new Map<number, number>();
    for (const tableNum of remainingTables) {
      const tablePlayers = tableMap.get(tableNum) || [];
      playerCountByTable.set(tableNum, tablePlayers.length);
      const occupied = new Set(
        tablePlayers.map((p) => p.seatNumber).filter((s): s is number => s !== null)
      );
      const free: number[] = [];
      for (let s = 1; s <= seatsPerTable; s++) {
        if (!occupied.has(s)) {
          free.push(s);
        }
      }
      freeSeatsByTable.set(tableNum, free);
    }

    // Distribute players to least-loaded tables (round-robin)
    const movements: Array<{
      playerId: string;
      playerName: string;
      toTable: number;
      toSeat: number;
    }> = [];

    for (const assignment of playersToMove) {
      // Find least-loaded table
      let bestTable = remainingTables[0];
      let bestCount = playerCountByTable.get(bestTable) ?? Infinity;
      for (const tableNum of remainingTables) {
        const count = playerCountByTable.get(tableNum) ?? Infinity;
        if (count < bestCount) {
          bestCount = count;
          bestTable = tableNum;
        }
      }

      const freeSeats = freeSeatsByTable.get(bestTable) || [];
      if (freeSeats.length === 0) {
        return NextResponse.json(
          { error: `No free seat on Table ${bestTable}` },
          { status: 500 }
        );
      }

      const seatNumber = freeSeats.shift()!;
      playerCountByTable.set(bestTable, (playerCountByTable.get(bestTable) ?? 0) + 1);

      movements.push({
        playerId: assignment.playerId,
        playerName: nameMap.get(assignment.playerId) || 'Joueur',
        toTable: bestTable,
        toSeat: seatNumber,
      });
    }

    // Transaction atomique
    await prisma.$transaction(async (tx) => {
      // Désactiver toutes les assignations de la table fermée
      await tx.tableAssignment.updateMany({
        where: {
          tournamentId,
          tableNumber: tableToClose,
          isActive: true,
        },
        data: { isActive: false },
      });

      // Créer les nouvelles assignations
      for (const movement of movements) {
        await tx.tableAssignment.create({
          data: {
            tournamentId,
            playerId: movement.playerId,
            tableNumber: movement.toTable,
            seatNumber: movement.toSeat,
            isActive: true,
          },
        });
      }
    });

    // Émettre l'événement Socket.IO
    emitToTournament(tournamentId, 'tables:merged', {
      tournamentId,
      closedTable: tableToClose,
      movements,
    });

    console.log(
      `🔀 [merge] Table ${tableToClose} closed, ${movements.length} players redistributed to ${remainingTables.length} tables`
    );

    return NextResponse.json({
      success: true,
      closedTable: tableToClose,
      movements,
      remainingTables: remainingTables.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error merging tables:', error);
    return NextResponse.json({ error: 'Failed to merge tables' }, { status: 500 });
  }
}
