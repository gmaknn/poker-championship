import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';

const movePlayerSchema = z.object({
  playerId: z.string().cuid(),
  toTable: z.number().int().min(1),
  toSeat: z.number().int().min(1),
});

/**
 * POST — Déplacer manuellement un joueur vers une autre table/siège.
 * Contrôle TD uniquement, pas d'événement Socket.IO (le frontend refetch après succès).
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
    const { playerId, toTable, toSeat } = movePlayerSchema.parse(body);

    if (toSeat > (tournament.seatsPerTable ?? 9)) {
      return NextResponse.json(
        { error: `Seat ${toSeat} exceeds seatsPerTable (${tournament.seatsPerTable ?? 9})` },
        { status: 400 }
      );
    }

    // Vérifier que le joueur a une assignation active (optionnel pour late registration)
    const currentAssignment = await prisma.tableAssignment.findFirst({
      where: { tournamentId, playerId, isActive: true },
    });

    // Vérifier que le siège cible est libre
    const seatOccupied = await prisma.tableAssignment.findFirst({
      where: { tournamentId, tableNumber: toTable, seatNumber: toSeat, isActive: true },
    });

    if (seatOccupied) {
      return NextResponse.json(
        { error: `Seat ${toSeat} at Table ${toTable} is already occupied` },
        { status: 400 }
      );
    }

    // Charger le nom du joueur pour l'event Socket.IO
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { firstName: true, lastName: true, nickname: true },
    });
    const playerName = player?.nickname || `${player?.firstName} ${player?.lastName}`;

    // Transaction : désactiver l'ancienne assignation (si existante), créer la nouvelle
    await prisma.$transaction(async (tx) => {
      if (currentAssignment) {
        await tx.tableAssignment.update({
          where: { id: currentAssignment.id },
          data: { isActive: false },
        });
      }

      await tx.tableAssignment.create({
        data: {
          tournamentId,
          playerId,
          tableNumber: toTable,
          seatNumber: toSeat,
          isActive: true,
        },
      });
    });

    // Émettre l'événement Socket.IO
    emitToTournament(tournamentId, 'tables:player-moved-manual', {
      tournamentId,
      playerId,
      playerName,
      fromTable: currentAssignment?.tableNumber ?? 0,
      toTable,
      seatNumber: toSeat,
    });

    console.log(
      currentAssignment
        ? `🔀 [move-player] ${playerName}: Table ${currentAssignment.tableNumber} Seat ${currentAssignment.seatNumber} → Table ${toTable} Seat ${toSeat}`
        : `🔀 [move-player] ${playerName}: (nouveau) → Table ${toTable} Seat ${toSeat}`
    );

    return NextResponse.json({
      success: true,
      fromTable: currentAssignment?.tableNumber ?? 0,
      fromSeat: currentAssignment?.seatNumber ?? 0,
      toTable,
      toSeat,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error moving player:', error);
    return NextResponse.json({ error: 'Failed to move player' }, { status: 500 });
  }
}
