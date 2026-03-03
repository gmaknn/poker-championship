import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';
import { rebalanceTablesBetweenExisting } from '@/lib/table-rebalance';

// POST - Rééquilibrage automatique des tables en fin de niveau (idempotent via lastRebalancedAtLevel)
// Conserve les tables existantes, déplace les joueurs un par un entre tables
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

    // Vérification d'idempotence dans une transaction avant le rééquilibrage
    const freshTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { lastRebalancedAtLevel: true },
    });

    if ((freshTournament?.lastRebalancedAtLevel ?? 0) >= pendingLevel.level) {
      return NextResponse.json({ skipped: true, reason: 'Already rebalanced by another client' });
    }

    // Marquer le niveau comme traité AVANT le rééquilibrage (idempotence)
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { lastRebalancedAtLevel: pendingLevel.level },
    });

    // Rééquilibrer entre les tables existantes (pas de redistribution complète)
    const moves = await rebalanceTablesBetweenExisting(tournamentId, {
      emitSocketEvents: true,
    });

    // Compter les tables actuelles
    const tableAssignments = await prisma.tableAssignment.findMany({
      where: { tournamentId, isActive: true },
      select: { tableNumber: true },
    });
    const uniqueTables = new Set(tableAssignments.map((a) => a.tableNumber));

    // Émettre l'événement Socket.IO global avec les joueurs déplacés
    emitToTournament(tournamentId, 'tables:rebalanced', {
      tournamentId,
      tablesCount: uniqueTables.size,
      movedPlayerIds: moves.map((m) => m.playerId),
    });

    console.log(
      `🔄 Auto-rebalance for tournament ${tournamentId} at level ${pendingLevel.level}: ` +
      `${moves.length} move(s), ${uniqueTables.size} tables preserved`
    );

    return NextResponse.json({
      success: true,
      autoRebalanced: true,
      forLevel: pendingLevel.level,
      totalTables: uniqueTables.size,
      moves,
      totalMoves: moves.length,
    });
  } catch (error) {
    console.error('Error in auto-rebalance:', error);
    return NextResponse.json(
      { error: 'Failed to auto-rebalance tables' },
      { status: 500 }
    );
  }
}
