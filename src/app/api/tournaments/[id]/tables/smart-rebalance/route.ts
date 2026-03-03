import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';

// POST - Rééquilibrage intelligent des tables (même siège / siège le plus proche)
// Filet de sécurité : corrige les déséquilibres sans redistribuer tout le monde
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        status: true,
        createdById: true,
      },
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

    // Charger les noms des joueurs
    const players = await prisma.player.findMany({
      where: { tournamentPlayers: { some: { tournamentId } } },
      select: { id: true, firstName: true, lastName: true, nickname: true },
    });
    const playerNameMap = new Map(
      players.map((p) => [p.id, p.nickname || `${p.firstName} ${p.lastName}`])
    );

    const moves: Array<{
      playerName: string;
      fromTable: number;
      toTable: number;
      seatNumber: number;
    }> = [];

    // Boucle de rééquilibrage
    let iteration = 0;
    const MAX_ITERATIONS = 20; // Sécurité anti-boucle infinie
    while (iteration < MAX_ITERATIONS) {
      iteration++;

      const activeAssignments = await prisma.tableAssignment.findMany({
        where: { tournamentId, isActive: true },
      });

      if (activeAssignments.length === 0) {
        return NextResponse.json({ skipped: true, reason: 'No table assignments' });
      }

      // Grouper par table
      const tableCountMap = new Map<number, typeof activeAssignments>();
      for (const a of activeAssignments) {
        const existing = tableCountMap.get(a.tableNumber) || [];
        existing.push(a);
        tableCountMap.set(a.tableNumber, existing);
      }

      // Trouver min et max
      const sortedTableNumbers = Array.from(tableCountMap.keys()).sort((a, b) => a - b);
      let maxTable = -1;
      let maxCount = 0;
      let minTable = -1;
      let minCount = Infinity;

      for (const tableNum of sortedTableNumbers) {
        const count = tableCountMap.get(tableNum)!.length;
        if (count > maxCount) {
          maxCount = count;
          maxTable = tableNum;
        }
        if (count < minCount) {
          minCount = count;
          minTable = tableNum;
        }
      }

      const gap = maxCount - minCount;
      console.log(`🔄 [smart-rebalance] Iteration ${iteration} — Max: Table ${maxTable} (${maxCount}), Min: Table ${minTable} (${minCount}), Gap: ${gap}`);

      if (gap < 2) break;

      // Table source = la plus remplie, table cible = la moins remplie
      const sourceAssignments = tableCountMap.get(maxTable)!;
      const targetAssignments = tableCountMap.get(minTable)!;

      // Trouver un siège cible : le premier siège libre (1..9)
      const occupiedSeats = new Set(targetAssignments.map((a) => a.seatNumber));
      let targetSeatNumber: number | null = null;
      for (let s = 1; s <= 9; s++) {
        if (!occupiedSeats.has(s)) {
          targetSeatNumber = s;
          break;
        }
      }
      if (targetSeatNumber === null) targetSeatNumber = minCount + 1;

      // Trouver le joueur au siège le plus proche du targetSeat dans la source
      let bestAssignment = sourceAssignments[0];
      let bestDistance = Infinity;

      for (const a of sourceAssignments) {
        const seat = a.seatNumber ?? 1;
        const distance = Math.abs(seat - targetSeatNumber);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestAssignment = a;
        }
      }

      if (!bestAssignment) break;

      const playerName = playerNameMap.get(bestAssignment.playerId) || 'Joueur';
      console.log(`🔄 [smart-rebalance] Moving ${playerName} from Table ${maxTable} Seat ${bestAssignment.seatNumber} → Table ${minTable} Seat ${targetSeatNumber}`);

      // Transaction atomique
      await prisma.$transaction(async (tx) => {
        await tx.tableAssignment.update({
          where: { id: bestAssignment.id },
          data: { isActive: false },
        });
        await tx.tableAssignment.create({
          data: {
            tournamentId,
            playerId: bestAssignment.playerId,
            tableNumber: minTable,
            seatNumber: targetSeatNumber,
            isActive: true,
          },
        });
      });

      // Émettre l'événement Socket.IO
      emitToTournament(tournamentId, 'table:player_moved', {
        tournamentId,
        playerId: bestAssignment.playerId,
        playerName,
        fromTable: maxTable,
        toTable: minTable,
        seatNumber: targetSeatNumber,
      });

      moves.push({
        playerName,
        fromTable: maxTable,
        toTable: minTable,
        seatNumber: targetSeatNumber,
      });
    }

    if (moves.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'Tables already balanced' });
    }

    console.log(`🔄 [smart-rebalance] ✅ ${moves.length} move(s) completed for tournament ${tournamentId}`);

    return NextResponse.json({
      success: true,
      moves,
      totalMoves: moves.length,
    });
  } catch (error) {
    console.error('Error in smart-rebalance:', error);
    return NextResponse.json(
      { error: 'Failed to smart-rebalance tables' },
      { status: 500 }
    );
  }
}
