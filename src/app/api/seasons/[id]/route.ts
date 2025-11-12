import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getCurrentPlayer } from '@/lib/auth-helpers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

const seasonSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  year: z.number().int().min(2020).max(2100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),

  pointsFirst: z.number().int().default(1500),
  pointsSecond: z.number().int().default(1000),
  pointsThird: z.number().int().default(700),
  pointsFourth: z.number().int().default(500),
  pointsFifth: z.number().int().default(400),
  pointsSixth: z.number().int().default(300),
  pointsSeventh: z.number().int().default(200),
  pointsEighth: z.number().int().default(200),
  pointsNinth: z.number().int().default(200),
  pointsTenth: z.number().int().default(200),
  pointsEleventh: z.number().int().default(100),
  pointsSixteenth: z.number().int().default(50),

  eliminationPoints: z.number().int().default(50),
  leaderKillerBonus: z.number().int().default(25),

  freeRebuysCount: z.number().int().default(2),
  rebuyPenaltyTier1: z.number().int().default(-50),
  rebuyPenaltyTier2: z.number().int().default(-100),
  rebuyPenaltyTier3: z.number().int().default(-150),

  totalTournamentsCount: z.number().int().optional().nullable(),
  bestTournamentsCount: z.number().int().optional().nullable(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        tournaments: {
          orderBy: { date: 'desc' },
        },
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 });
    }

    return NextResponse.json(season);
  } catch (error) {
    console.error('Error fetching season:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier les permissions - seuls les ADMIN peuvent modifier des saisons
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer || !hasPermission(currentPlayer.role, PERMISSIONS.EDIT_SEASON)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de modifier des saisons' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = seasonSchema.parse(body);

    const season = await prisma.season.update({
      where: { id },
      data: {
        name: validatedData.name,
        year: validatedData.year,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,

        pointsFirst: validatedData.pointsFirst,
        pointsSecond: validatedData.pointsSecond,
        pointsThird: validatedData.pointsThird,
        pointsFourth: validatedData.pointsFourth,
        pointsFifth: validatedData.pointsFifth,
        pointsSixth: validatedData.pointsSixth,
        pointsSeventh: validatedData.pointsSeventh,
        pointsEighth: validatedData.pointsEighth,
        pointsNinth: validatedData.pointsNinth,
        pointsTenth: validatedData.pointsTenth,
        pointsEleventh: validatedData.pointsEleventh,
        pointsSixteenth: validatedData.pointsSixteenth,

        eliminationPoints: validatedData.eliminationPoints,
        leaderKillerBonus: validatedData.leaderKillerBonus,

        freeRebuysCount: validatedData.freeRebuysCount,
        rebuyPenaltyTier1: validatedData.rebuyPenaltyTier1,
        rebuyPenaltyTier2: validatedData.rebuyPenaltyTier2,
        rebuyPenaltyTier3: validatedData.rebuyPenaltyTier3,

        totalTournamentsCount: validatedData.totalTournamentsCount,
        bestTournamentsCount: validatedData.bestTournamentsCount,
      },
    });

    return NextResponse.json(season);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating season:', error);
    return NextResponse.json(
      { error: 'Failed to update season' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier les permissions - seuls les ADMIN peuvent supprimer des saisons
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer || !hasPermission(currentPlayer.role, PERMISSIONS.DELETE_SEASON)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de supprimer des saisons' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Archive instead of delete
    const season = await prisma.season.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return NextResponse.json(season);
  } catch (error) {
    console.error('Error archiving season:', error);
    return NextResponse.json(
      { error: 'Failed to archive season' },
      { status: 500 }
    );
  }
}
