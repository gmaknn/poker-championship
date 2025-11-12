import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const rebuySchema = z.object({
  playerId: z.string().cuid(),
  type: z.enum(['STANDARD', 'LIGHT']),
});

// POST - Enregistrer une recave (standard ou light)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const validatedData = rebuySchema.parse(body);

    // Récupérer le tournoi avec la saison
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        season: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Vérifier que le tournoi est en cours
    if (tournament.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'Tournament is not in progress' },
        { status: 400 }
      );
    }

    // Vérifier que la période de recave n'est pas terminée
    if (tournament.rebuyEndLevel && tournament.currentLevel > tournament.rebuyEndLevel) {
      return NextResponse.json(
        { error: 'Rebuy period has ended' },
        { status: 400 }
      );
    }

    // Récupérer le joueur inscrit
    const tournamentPlayer = await prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId: validatedData.playerId,
        },
      },
    });

    if (!tournamentPlayer) {
      return NextResponse.json(
        { error: 'Player is not enrolled in this tournament' },
        { status: 404 }
      );
    }

    // Vérifier que le joueur n'est pas éliminé
    if (tournamentPlayer.finalRank !== null) {
      return NextResponse.json(
        { error: 'Player has been eliminated' },
        { status: 400 }
      );
    }

    // Vérifications spécifiques au light rebuy
    if (validatedData.type === 'LIGHT') {
      if (!tournament.lightRebuyEnabled) {
        return NextResponse.json(
          { error: 'Light rebuy is not enabled for this tournament' },
          { status: 400 }
        );
      }

      if (tournamentPlayer.lightRebuyUsed) {
        return NextResponse.json(
          { error: 'Player has already used their light rebuy' },
          { status: 400 }
        );
      }
    }

    // Calculer le nouveau nombre de recaves et les malus
    const newRebuysCount = tournamentPlayer.rebuysCount + (validatedData.type === 'STANDARD' ? 1 : 0);
    const lightRebuyUsed = validatedData.type === 'LIGHT' ? true : tournamentPlayer.lightRebuyUsed;

    // Calculer les malus de recave selon la saison
    let penaltyPoints = 0;
    if (tournament.season) {
      const totalRebuys = newRebuysCount;
      const freeRebuys = tournament.season.freeRebuysCount;

      if (totalRebuys > freeRebuys) {
        const paidRebuys = totalRebuys - freeRebuys;

        if (paidRebuys === 1) {
          penaltyPoints = tournament.season.rebuyPenaltyTier1; // 3e recave
        } else if (paidRebuys === 2) {
          penaltyPoints = tournament.season.rebuyPenaltyTier2; // 4e recave
        } else if (paidRebuys >= 3) {
          penaltyPoints = tournament.season.rebuyPenaltyTier3; // 5+ recaves
        }
      }
    }

    // Mettre à jour le joueur
    const updatedPlayer = await prisma.tournamentPlayer.update({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId: validatedData.playerId,
        },
      },
      data: {
        rebuysCount: newRebuysCount,
        lightRebuyUsed,
        penaltyPoints,
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

    return NextResponse.json({
      success: true,
      tournamentPlayer: updatedPlayer,
      rebuyType: validatedData.type,
      penaltyPoints,
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error processing rebuy:', error);
    return NextResponse.json(
      { error: 'Failed to process rebuy' },
      { status: 500 }
    );
  }
}
