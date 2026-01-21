/**
 * GET/PUT /api/tournaments/[id]/prize-pool
 * Manage tournament prize pool distribution
 *
 * RBAC:
 * - 401: Not authenticated
 * - 403: PLAYER role or TD not assigned to this tournament
 * - 200: ADMIN or TD (creator/assigned)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireTournamentPermission } from '@/lib/auth-helpers';

type Params = {
  params: Promise<{ id: string }>;
};

// Validation schema for PUT (payout distribution in €)
const prizePoolSchema = z.object({
  payoutCount: z.number().int().min(1, 'Au moins 1 place payée'),
  amounts: z
    .array(z.number().min(0, 'Chaque montant doit être >= 0'))
    .min(1, 'Au moins 1 montant requis'),
  totalPrizePool: z.number().positive('Le prize pool doit être positif'),
}).refine(
  (data) => data.amounts.length === data.payoutCount,
  { message: 'Le nombre de montants doit correspondre au nombre de places payées' }
).refine(
  (data) => {
    const sum = data.amounts.reduce((a, b) => a + b, 0);
    return sum <= data.totalPrizePool + 0.01; // Allow small floating point errors
  },
  { message: 'Le total des allocations ne peut pas dépasser le prize pool disponible' }
);

// Validation schema for PATCH (adjustment)
const adjustmentSchema = z.object({
  adjustment: z.number().describe('Montant de l\'ajustement en € (positif ou négatif)'),
  reason: z.string().max(500).optional().describe('Motif de l\'ajustement'),
});

/**
 * GET /api/tournaments/[id]/prize-pool
 * Returns calculated prize pool and breakdown
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: tournamentId } = await params;

    // Fetch tournament with players data
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        buyInAmount: true,
        lightRebuyAmount: true,
        prizePool: true,
        prizePayoutCount: true,
        prizePayoutPercents: true,
        prizePayoutUpdatedAt: true,
        prizePoolAdjustment: true,
        prizePoolAdjustmentReason: true,
        createdById: true,
        tournamentPlayers: {
          select: {
            hasPaid: true,
            rebuysCount: true,
            lightRebuyUsed: true,
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // RBAC check - use 'manage' action for prize pool
    const permResult = await requireTournamentPermission(
      request,
      tournament.createdById,
      'manage',
      tournamentId
    );

    if (!permResult.success) {
      return NextResponse.json(
        { error: permResult.error },
        { status: permResult.status }
      );
    }

    // Calculate total prize pool from buy-ins and rebuys
    const paidPlayers = tournament.tournamentPlayers.filter(p => p.hasPaid);
    const totalBuyIns = paidPlayers.length * tournament.buyInAmount;

    const totalRebuys = tournament.tournamentPlayers.reduce((sum, p) => {
      return sum + (p.rebuysCount * tournament.buyInAmount);
    }, 0);

    const totalLightRebuys = tournament.tournamentPlayers.reduce((sum, p) => {
      return sum + (p.lightRebuyUsed ? tournament.lightRebuyAmount : 0);
    }, 0);

    const calculatedPrizePool = totalBuyIns + totalRebuys + totalLightRebuys;

    // Apply adjustment to calculated prize pool
    const adjustment = tournament.prizePoolAdjustment || 0;
    const adjustedPrizePool = calculatedPrizePool + adjustment;

    // Use stored prizePool if set, otherwise use calculated + adjustment
    const totalPrizePool = tournament.prizePool ?? adjustedPrizePool;

    // Build breakdown if payout amounts are configured (stored in prizePayoutPercents field)
    const amounts = tournament.prizePayoutPercents as number[] | null;
    const payoutCount = tournament.prizePayoutCount ?? 0;

    let breakdown: { rank: number; amount: number }[] = [];
    let totalAllocated = 0;

    if (amounts && Array.isArray(amounts) && amounts.length > 0) {
      breakdown = amounts.map((amount, index) => ({
        rank: index + 1,
        amount,
      }));
      totalAllocated = amounts.reduce((sum, a) => sum + a, 0);
    }

    const remaining = totalPrizePool - totalAllocated;

    return NextResponse.json({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      buyInAmount: tournament.buyInAmount,
      lightRebuyAmount: tournament.lightRebuyAmount,
      paidPlayersCount: paidPlayers.length,
      totalBuyIns,
      totalRebuys,
      totalLightRebuys,
      calculatedPrizePool,
      adjustment,
      adjustmentReason: tournament.prizePoolAdjustmentReason,
      adjustedPrizePool,
      totalPrizePool,
      payoutCount,
      amounts: amounts ?? [],
      totalAllocated,
      remaining,
      breakdown,
      updatedAt: tournament.prizePayoutUpdatedAt,
    });
  } catch (error) {
    console.error('Error fetching prize pool:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du prize pool' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tournaments/[id]/prize-pool
 * Update prize pool distribution
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id: tournamentId } = await params;

    // Fetch tournament for RBAC check
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // RBAC check
    const permResult = await requireTournamentPermission(
      request,
      tournament.createdById,
      'manage',
      tournamentId
    );

    if (!permResult.success) {
      return NextResponse.json(
        { error: permResult.error },
        { status: permResult.status }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = prizePoolSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { payoutCount, amounts, totalPrizePool } = validationResult.data;

    // Calculate totals for response
    const totalAllocated = amounts.reduce((sum, a) => sum + a, 0);
    const remaining = totalPrizePool - totalAllocated;

    // Update tournament (store amounts in prizePayoutPercents field)
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        prizePayoutCount: payoutCount,
        prizePayoutPercents: amounts, // Now stores amounts in € instead of %
        prizePayoutUpdatedAt: new Date(),
      },
      select: {
        id: true,
        prizePayoutCount: true,
        prizePayoutPercents: true,
        prizePayoutUpdatedAt: true,
      },
    });

    // Automatically update prizeAmount for each player based on their final rank
    // Get all tournament players with final rank
    const tournamentPlayers = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      select: {
        playerId: true,
        finalRank: true,
      },
    });

    // Update prizeAmount for each player
    const prizeUpdates = tournamentPlayers.map((tp) => {
      let prizeAmount: number | null = null;
      if (tp.finalRank !== null && tp.finalRank >= 1 && tp.finalRank <= amounts.length) {
        prizeAmount = amounts[tp.finalRank - 1];
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

    await Promise.all(prizeUpdates);

    return NextResponse.json({
      success: true,
      payoutCount: updated.prizePayoutCount,
      amounts: updated.prizePayoutPercents,
      totalAllocated,
      remaining,
      updatedAt: updated.prizePayoutUpdatedAt,
      playersUpdated: tournamentPlayers.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating prize pool:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du prize pool' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tournaments/[id]/prize-pool
 * Update prize pool adjustment (manual +/- amount)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: tournamentId } = await params;

    // Fetch tournament for RBAC check
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournoi non trouvé' },
        { status: 404 }
      );
    }

    // RBAC check
    const permResult = await requireTournamentPermission(
      request,
      tournament.createdById,
      'manage',
      tournamentId
    );

    if (!permResult.success) {
      return NextResponse.json(
        { error: permResult.error },
        { status: permResult.status }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = adjustmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Données invalides',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { adjustment, reason } = validationResult.data;

    // Update tournament
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        prizePoolAdjustment: adjustment,
        prizePoolAdjustmentReason: reason ?? null,
      },
      select: {
        id: true,
        prizePoolAdjustment: true,
        prizePoolAdjustmentReason: true,
      },
    });

    return NextResponse.json({
      success: true,
      adjustment: updated.prizePoolAdjustment,
      reason: updated.prizePoolAdjustmentReason,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating prize pool adjustment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'ajustement' },
      { status: 500 }
    );
  }
}
