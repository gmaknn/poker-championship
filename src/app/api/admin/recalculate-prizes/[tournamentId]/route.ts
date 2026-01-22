/**
 * GET /api/admin/recalculate-prizes/[tournamentId]
 * Force recalculation of prize amounts for all players in a tournament
 * Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-helpers';
import { PERMISSIONS } from '@/lib/permissions';

type Params = {
  params: Promise<{ tournamentId: string }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Check admin permission
    const permResult = await requirePermission(request, PERMISSIONS.VIEW_PLAYERS);
    if (!permResult.success) {
      return NextResponse.json(
        { error: permResult.error },
        { status: permResult.status }
      );
    }

    const { tournamentId } = await params;

    // Get tournament with prize pool config
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        prizePayoutPercents: true,
        prizePayoutCount: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // Get prize amounts (stored as JSON array)
    const prizeAmounts = (tournament.prizePayoutPercents as number[] | null) || [];

    if (prizeAmounts.length === 0) {
      return NextResponse.json(
        { error: 'Aucun prize pool configuré pour ce tournoi' },
        { status: 400 }
      );
    }

    // Get all tournament players
    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      select: {
        playerId: true,
        finalRank: true,
      },
    });

    // Update prizeAmount for each player based on their final rank
    const updates = tournamentPlayers.map((tp) => {
      let prizeAmount: number | null = null;
      if (tp.finalRank !== null && tp.finalRank >= 1 && tp.finalRank <= prizeAmounts.length) {
        prizeAmount = prizeAmounts[tp.finalRank - 1];
      }

      return prisma.tournamentPlayer.update({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: tp.playerId,
          },
        },
        data: { prizeAmount },
      });
    });

    await Promise.all(updates);

    // Get updated results
    const updatedPlayers = await prisma.tournamentPlayer.findMany({
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
      orderBy: { finalRank: 'asc' },
    });

    const playersWithPrizes = updatedPlayers.filter(p => p.prizeAmount && p.prizeAmount > 0);

    return NextResponse.json({
      success: true,
      tournament: tournament.name,
      prizeAmounts,
      totalPlayersUpdated: tournamentPlayers.length,
      playersWithPrizes: playersWithPrizes.map(p => ({
        rank: p.finalRank,
        name: p.player.nickname || `${p.player.firstName} ${p.player.lastName}`,
        prizeAmount: p.prizeAmount,
      })),
    });
  } catch (error) {
    console.error('Error recalculating prizes:', error);
    return NextResponse.json(
      { error: 'Erreur lors du recalcul des gains' },
      { status: 500 }
    );
  }
}
