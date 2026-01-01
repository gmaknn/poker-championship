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

// Validation schema for PUT
const prizePoolSchema = z.object({
  payoutCount: z.number().int().min(1, 'Au moins 1 place payée'),
  percents: z
    .array(z.number().positive('Chaque pourcentage doit être > 0'))
    .min(1, 'Au moins 1 pourcentage requis'),
}).refine(
  (data) => data.percents.length === data.payoutCount,
  { message: 'Le nombre de pourcentages doit correspondre au nombre de places payées' }
).refine(
  (data) => {
    const sum = data.percents.reduce((a, b) => a + b, 0);
    return Math.abs(sum - 100) < 0.01; // Allow small floating point errors
  },
  { message: 'La somme des pourcentages doit être égale à 100' }
);

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

    // Use stored prizePool if set, otherwise use calculated
    const totalPrizePool = tournament.prizePool ?? calculatedPrizePool;

    // Build breakdown if payout percents are configured
    const percents = tournament.prizePayoutPercents as number[] | null;
    const payoutCount = tournament.prizePayoutCount ?? 0;

    let breakdown: { rank: number; percent: number; amount: number }[] = [];

    if (percents && Array.isArray(percents) && percents.length > 0) {
      breakdown = percents.map((percent, index) => ({
        rank: index + 1,
        percent,
        amount: Math.round((totalPrizePool * percent / 100) * 100) / 100,
      }));
    }

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
      totalPrizePool,
      payoutCount,
      percents: percents ?? [],
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

    const { payoutCount, percents } = validationResult.data;

    // Update tournament
    const updated = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        prizePayoutCount: payoutCount,
        prizePayoutPercents: percents,
        prizePayoutUpdatedAt: new Date(),
      },
      select: {
        id: true,
        prizePayoutCount: true,
        prizePayoutPercents: true,
        prizePayoutUpdatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      payoutCount: updated.prizePayoutCount,
      percents: updated.prizePayoutPercents,
      updatedAt: updated.prizePayoutUpdatedAt,
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
