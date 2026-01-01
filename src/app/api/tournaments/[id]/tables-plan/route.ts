/**
 * GET /api/tournaments/[id]/tables-plan
 * Returns the table plan for TV display
 *
 * RBAC:
 * - 401: Not authenticated
 * - 403: PLAYER role (no access)
 * - 200: ADMIN or TD assigned to this tournament
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { isAdminMultiRole, isTournamentDirectorMultiRole } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // 1. Check authentication
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        status: true,
        createdById: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // 3. RBAC check
    const isAdmin = isAdminMultiRole(currentPlayer.role, currentPlayer.additionalRoles);
    const isTD = isTournamentDirectorMultiRole(currentPlayer.role, currentPlayer.additionalRoles);

    if (!isAdmin && !isTD) {
      // PLAYER role - no access
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    // If TD (not admin), check if assigned to this tournament or is creator
    if (!isAdmin && isTD) {
      const isCreator = tournament.createdById === currentPlayer.id;
      const isAssigned = await prisma.tournamentDirector.findUnique({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: currentPlayer.id,
          },
        },
      });

      if (!isCreator && !isAssigned) {
        return NextResponse.json(
          { error: 'Accès refusé - non assigné à ce tournoi' },
          { status: 403 }
        );
      }
    }

    // 4. Fetch table assignments with player info
    const assignments = await prisma.tableAssignment.findMany({
      where: {
        tournamentId,
        isActive: true,
      },
      orderBy: [{ tableNumber: 'asc' }, { seatNumber: 'asc' }],
    });

    // Get tournament players for enrichment
    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
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

    // Create player map
    const playerMap = new Map(
      tournamentPlayers.map((tp) => [
        tp.playerId,
        {
          ...tp.player,
          isEliminated: tp.finalRank !== null,
          finalRank: tp.finalRank,
        },
      ])
    );

    // Group by table
    const tableMap = new Map<
      number,
      Array<{
        seatNumber: number | null;
        playerId: string;
        nickname: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
        isEliminated: boolean;
      }>
    >();

    for (const assignment of assignments) {
      const playerInfo = playerMap.get(assignment.playerId);
      if (!playerInfo) continue;

      const tableSeats = tableMap.get(assignment.tableNumber) || [];
      tableSeats.push({
        seatNumber: assignment.seatNumber,
        playerId: assignment.playerId,
        nickname: playerInfo.nickname,
        firstName: playerInfo.firstName,
        lastName: playerInfo.lastName,
        avatar: playerInfo.avatar,
        isEliminated: playerInfo.isEliminated,
      });
      tableMap.set(assignment.tableNumber, tableSeats);
    }

    // Build response
    const tables = Array.from(tableMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([tableNumber, seats]) => ({
        tableNumber,
        seats: seats.sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)),
        activeCount: seats.filter((s) => !s.isEliminated).length,
        totalCount: seats.length,
      }));

    return NextResponse.json({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tournamentStatus: tournament.status,
      tables,
      totalTables: tables.length,
      totalActivePlayers: tables.reduce((sum, t) => sum + t.activeCount, 0),
      totalPlayers: tables.reduce((sum, t) => sum + t.totalCount, 0),
    });
  } catch (error) {
    console.error('Error fetching tables plan:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du plan des tables' },
      { status: 500 }
    );
  }
}
