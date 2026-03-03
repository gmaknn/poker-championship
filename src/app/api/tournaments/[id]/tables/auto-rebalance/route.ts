import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';

const SEATS_PER_TABLE = 9;
const MIN_PLAYERS_TO_BREAK_TABLE = 3;

// POST - Rééquilibrage automatique des tables (idempotent via lastRebalancedAtLevel)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    // Récupérer le tournoi avec ses blind levels
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        status: true,
        createdById: true,
        timerStartedAt: true,
        timerPausedAt: true,
        timerElapsedSeconds: true,
        lastRebalancedAtLevel: true,
        blindLevels: {
          orderBy: { level: 'asc' },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }

    // Vérifier les permissions (ADMIN ou TD du tournoi)
    const permResult = await requireTournamentPermission(request, tournament.createdById, 'manage', tournamentId);
    if (!permResult.success) {
      return NextResponse.json({ error: permResult.error }, { status: permResult.status });
    }

    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Tournament is not in progress' }, { status: 400 });
    }

    // Recalculer le niveau courant (même logique que timer/route.ts)
    let currentElapsedSeconds = tournament.timerElapsedSeconds;
    if (tournament.timerStartedAt && !tournament.timerPausedAt) {
      const now = new Date();
      const startTime = new Date(tournament.timerStartedAt);
      const additionalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      currentElapsedSeconds += additionalSeconds;
    }

    let calculatedLevel = 1;
    let timeIntoCurrentLevel = currentElapsedSeconds;
    for (const level of tournament.blindLevels) {
      const levelDuration = level.duration * 60;
      if (timeIntoCurrentLevel >= levelDuration) {
        timeIntoCurrentLevel -= levelDuration;
        calculatedLevel = level.level + 1;
      } else {
        calculatedLevel = level.level;
        break;
      }
    }
    const maxLevel = tournament.blindLevels[tournament.blindLevels.length - 1]?.level || 1;
    if (calculatedLevel > maxLevel) {
      calculatedLevel = maxLevel;
    }

    // Trouver le premier niveau complété avec rebalanceTables non encore traité
    const lastRebalanced = tournament.lastRebalancedAtLevel ?? 0;
    const pendingLevel = tournament.blindLevels.find(
      (level) =>
        level.level < calculatedLevel &&
        level.rebalanceTables &&
        level.level > lastRebalanced
    );

    if (!pendingLevel) {
      return NextResponse.json({ skipped: true, reason: 'No pending rebalance' });
    }

    // Récupérer les joueurs actifs
    const activePlayers = await prisma.tournamentPlayer.findMany({
      where: {
        tournamentId,
        finalRank: null,
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
      return NextResponse.json({ skipped: true, reason: 'No active players' });
    }

    const totalActivePlayers = activePlayers.length;

    // Calculer le nombre optimal de tables
    const optimalTables = Math.ceil(totalActivePlayers / SEATS_PER_TABLE);
    let numberOfTables = Math.max(1, optimalTables);
    const playersPerTable = Math.ceil(totalActivePlayers / numberOfTables);

    if (playersPerTable < MIN_PLAYERS_TO_BREAK_TABLE && numberOfTables > 1) {
      numberOfTables = Math.max(1, Math.floor(totalActivePlayers / MIN_PLAYERS_TO_BREAK_TABLE));
    }

    // Récupérer les assignations actuelles
    const currentAssignments = await prisma.tableAssignment.findMany({
      where: { tournamentId, isActive: true },
      orderBy: [{ tableNumber: 'asc' }, { seatNumber: 'asc' }],
    });

    const currentTableMap = new Map(
      currentAssignments.map((a) => [a.playerId, a.tableNumber])
    );

    // Algorithme de rééquilibrage (même que rebalance/route.ts)
    const playersToAssign = activePlayers.map((p) => ({
      playerId: p.playerId,
      currentTable: currentTableMap.get(p.playerId),
      player: p.player,
    }));

    const shuffledPlayers = [...playersToAssign].sort(() => Math.random() * 0.4 - 0.2);

    const newAssignments: Array<{
      tournamentId: string;
      playerId: string;
      tableNumber: number;
      seatNumber: number;
      isActive: boolean;
    }> = [];
    let playerIndex = 0;

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

    // Statistiques
    const movedPlayers = newAssignments.filter((assignment) => {
      const currentTable = currentTableMap.get(assignment.playerId);
      return currentTable !== undefined && currentTable !== assignment.tableNumber;
    });

    // Transaction atomique : rééquilibrage + mise à jour lastRebalancedAtLevel
    await prisma.$transaction(async (tx) => {
      // Vérification d'idempotence dans la transaction
      const freshTournament = await tx.tournament.findUnique({
        where: { id: tournamentId },
        select: { lastRebalancedAtLevel: true },
      });

      if ((freshTournament?.lastRebalancedAtLevel ?? 0) >= pendingLevel.level) {
        // Déjà traité par un autre client
        return;
      }

      await tx.tableAssignment.updateMany({
        where: { tournamentId },
        data: { isActive: false },
      });

      if (newAssignments.length > 0) {
        await tx.tableAssignment.createMany({
          data: newAssignments,
        });
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { lastRebalancedAtLevel: pendingLevel.level },
      });
    });

    // Émettre l'événement Socket.IO
    emitToTournament(tournamentId, 'tables:rebalanced', {
      tournamentId,
      tablesCount: numberOfTables,
    });

    console.log(
      `🔄 Auto-rebalance for tournament ${tournamentId} at level ${pendingLevel.level}: ` +
      `${totalActivePlayers} players → ${numberOfTables} tables, ${movedPlayers.length} moved`
    );

    return NextResponse.json({
      success: true,
      autoRebalanced: true,
      forLevel: pendingLevel.level,
      totalTables: numberOfTables,
      totalPlayers: totalActivePlayers,
      movedPlayers: movedPlayers.length,
    });
  } catch (error) {
    console.error('Error in auto-rebalance:', error);
    return NextResponse.json(
      { error: 'Failed to auto-rebalance tables' },
      { status: 500 }
    );
  }
}
