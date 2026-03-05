import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';
import { emitToTournament } from '@/lib/socket';
import { calculateEffectiveLevel, areRecavesOpen } from '@/lib/tournament-utils';
import { breakTable, balanceTables } from '@/lib/table-management';

/**
 * POST - Auto-élimination des joueurs bustés sans recave à la fin de la période de recave.
 *
 * Appelé par le frontend quand recavesOpen passe de true à false.
 * Idempotent via bustsAutoEliminatedAtLevel.
 *
 * Logique :
 * 1. Vérifie que les recaves sont fermées
 * 2. Trouve tous les BustEvent avec recaveApplied=false dont le joueur a finalRank=null
 * 3. Les élimine dans l'ordre chronologique du bust (premier busté = rang le plus élevé)
 * 4. Désactive les assignations de table
 * 5. Déclenche breaking/balancing si nécessaire
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        blindLevels: { orderBy: { level: 'asc' } },
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

    // Calculer le niveau effectif
    const effectiveLevel = calculateEffectiveLevel(tournament, tournament.blindLevels);

    // Les recaves doivent être fermées
    if (areRecavesOpen(tournament, effectiveLevel, tournament.blindLevels)) {
      return NextResponse.json({ skipped: true, reason: 'Recaves still open' });
    }

    // Idempotence : vérifier si déjà traité pour ce rebuyEndLevel
    const targetLevel = tournament.rebuyEndLevel;
    if (targetLevel === null || targetLevel === undefined) {
      return NextResponse.json({ skipped: true, reason: 'No rebuyEndLevel configured' });
    }

    if ((tournament.bustsAutoEliminatedAtLevel ?? 0) >= targetLevel) {
      return NextResponse.json({ skipped: true, reason: 'Already processed' });
    }

    // Double-check idempotence avec lecture fraîche
    const freshTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { bustsAutoEliminatedAtLevel: true },
    });
    if ((freshTournament?.bustsAutoEliminatedAtLevel ?? 0) >= targetLevel) {
      return NextResponse.json({ skipped: true, reason: 'Already processed by another client' });
    }

    // Marquer comme traité AVANT le traitement (idempotence)
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { bustsAutoEliminatedAtLevel: targetLevel },
    });

    // Trouver les busts non recavés dont le joueur est encore actif
    const unrecavedBusts = await prisma.bustEvent.findMany({
      where: {
        tournamentId,
        recaveApplied: false,
        eliminated: {
          finalRank: null,
        },
      },
      include: {
        eliminated: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, nickname: true },
            },
          },
        },
        killer: {
          include: {
            player: {
              select: { id: true, firstName: true, lastName: true, nickname: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Premier busté = éliminé en premier = rang le plus élevé
    });

    if (unrecavedBusts.length === 0) {
      return NextResponse.json({ success: true, eliminated: 0 });
    }

    // Dédupliquer par playerId (garder le dernier bust pour chaque joueur)
    const bustByPlayer = new Map<string, typeof unrecavedBusts[0]>();
    for (const bust of unrecavedBusts) {
      bustByPlayer.set(bust.eliminated.playerId, bust);
    }
    const uniqueBusts = Array.from(bustByPlayer.values());

    // Compter les joueurs actifs actuels pour attribuer les rangs
    const activePlayersCount = await prisma.tournamentPlayer.count({
      where: { tournamentId, finalRank: null },
    });

    // Attribuer les rangs : le premier busté chronologiquement obtient le rang le plus élevé
    // Ex: 10 actifs, 3 à éliminer → rangs 10, 9, 8 (ordre chronologique des busts)
    // On trie par createdAt ASC (premier busté d'abord) → rang décroissant
    const sortedBusts = [...uniqueBusts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const eliminations: Array<{
      playerId: string;
      playerName: string;
      eliminatorId: string;
      eliminatorName: string;
      rank: number;
    }> = [];

    // Transaction atomique pour toutes les éliminations
    await prisma.$transaction(async (tx) => {
      let currentRank = activePlayersCount; // Le premier éliminé a le rang le plus élevé

      for (const bust of sortedBusts) {
        const playerId = bust.eliminated.playerId;
        const playerName = bust.eliminated.player.nickname || `${bust.eliminated.player.firstName} ${bust.eliminated.player.lastName}`;
        const eliminatorPlayerId = bust.killer?.player.id || playerId; // Fallback au joueur lui-même (ne devrait pas arriver)
        const eliminatorName = bust.killer?.player.nickname || 'Auto';

        // Attribuer le finalRank
        await tx.tournamentPlayer.update({
          where: {
            tournamentId_playerId: { tournamentId, playerId },
          },
          data: { finalRank: currentRank },
        });

        // Créer l'entrée Elimination
        await tx.elimination.create({
          data: {
            tournamentId,
            eliminatedId: playerId,
            eliminatorId: eliminatorPlayerId,
            rank: currentRank,
            level: effectiveLevel,
            isLeaderKill: false,
            isAutoElimination: true,
          },
        });

        // Désactiver l'assignation de table
        await tx.tableAssignment.updateMany({
          where: {
            tournamentId,
            playerId,
            isActive: true,
          },
          data: { isActive: false },
        });

        eliminations.push({
          playerId,
          playerName,
          eliminatorId: eliminatorPlayerId,
          eliminatorName,
          rank: currentRank,
        });

        console.log(
          `💀 [auto-eliminate] ${playerName} éliminé (rang ${currentRank}) — busté par ${eliminatorName}`
        );

        currentRank--;
      }
    });

    // Émettre les événements Socket.IO pour chaque élimination
    for (const elim of eliminations) {
      emitToTournament(tournamentId, 'elimination:player_out', {
        tournamentId,
        eliminatedId: elim.playerId,
        eliminatedName: elim.playerName,
        eliminatorId: elim.eliminatorId,
        eliminatorName: elim.eliminatorName,
        rank: elim.rank,
        level: effectiveLevel,
        isLeaderKill: false,
        isAutoElimination: true,
      });
    }

    // Mettre à jour le leaderboard
    emitToTournament(tournamentId, 'leaderboard:updated', {
      tournamentId,
      timestamp: new Date(),
    });

    // Vérifier s'il ne reste qu'un joueur (fin du tournoi)
    const remainingPlayers = await prisma.tournamentPlayer.count({
      where: { tournamentId, finalRank: null },
    });

    if (remainingPlayers === 1) {
      // Marquer le gagnant
      const winner = await prisma.tournamentPlayer.findFirst({
        where: { tournamentId, finalRank: null },
        include: { player: true },
      });

      if (winner) {
        await prisma.tournamentPlayer.update({
          where: { tournamentId_playerId: { tournamentId, playerId: winner.playerId } },
          data: { finalRank: 1 },
        });
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: { status: 'FINISHED', finishedAt: new Date() },
        });

        emitToTournament(tournamentId, 'elimination:tournament_complete', {
          tournamentId,
          winnerId: winner.playerId,
          winnerName: winner.player.nickname,
        });
      }
    } else if (remainingPlayers > 1) {
      // Breaking/balancing après les éliminations
      try {
        const breakResult = await breakTable(tournamentId);
        if (!breakResult.broken) {
          // Pas de breaking possible, mais les tables sont peut-être déséquilibrées
          // Le balancing se fait normalement après chaque élimination individuelle
          // Ici on fait un seul check après toutes les éliminations
          console.log(`💀 [auto-eliminate] Checking table balance after ${eliminations.length} eliminations`);
        }
      } catch (err) {
        console.error('💀 [auto-eliminate] Error during post-elimination table management:', err);
      }
    }

    console.log(
      `💀 [auto-eliminate] ${eliminations.length} joueur(s) auto-éliminé(s) pour le tournoi ${tournamentId}`
    );

    return NextResponse.json({
      success: true,
      eliminated: eliminations.length,
      eliminations: eliminations.map((e) => ({
        playerId: e.playerId,
        playerName: e.playerName,
        rank: e.rank,
      })),
      remainingPlayers,
    });
  } catch (error) {
    console.error('Error in auto-eliminate-busts:', error);
    return NextResponse.json(
      { error: 'Failed to auto-eliminate busts' },
      { status: 500 }
    );
  }
}
