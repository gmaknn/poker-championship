import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Récupérer les tables où le joueur est Directeur de Table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playerId } = await params;

    // Récupérer les assignations où le joueur est DT, actives, avec tournoi IN_PROGRESS
    const assignments = await prisma.tableAssignment.findMany({
      where: {
        playerId,
        isActive: true,
        isTableDirector: true,
        tournament: {
          status: 'IN_PROGRESS',
        },
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
    });

    // Pour chaque assignation, compter les joueurs actifs à la table
    const tableDirectorAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        const activePlayersCount = await prisma.tableAssignment.count({
          where: {
            tournamentId: assignment.tournamentId,
            tableNumber: assignment.tableNumber,
            isActive: true,
          },
        });

        // Compter les joueurs éliminés (finalRank != null)
        const eliminatedCount = await prisma.tournamentPlayer.count({
          where: {
            tournamentId: assignment.tournamentId,
            finalRank: { not: null },
            playerId: {
              in: (
                await prisma.tableAssignment.findMany({
                  where: {
                    tournamentId: assignment.tournamentId,
                    tableNumber: assignment.tableNumber,
                    isActive: true,
                  },
                  select: { playerId: true },
                })
              ).map((a) => a.playerId),
            },
          },
        });

        return {
          tournamentId: assignment.tournamentId,
          tournamentName: assignment.tournament.name,
          tableNumber: assignment.tableNumber,
          activePlayersCount: activePlayersCount - eliminatedCount,
          tournamentStatus: assignment.tournament.status,
        };
      })
    );

    return NextResponse.json({ tableDirectorAssignments });
  } catch (error) {
    console.error('Error fetching table director assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table director assignments' },
      { status: 500 }
    );
  }
}
