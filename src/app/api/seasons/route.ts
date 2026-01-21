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

  // Paramètres de scoring
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
  bustEliminationBonus: z.number().int().default(25),
  leaderKillerBonus: z.number().int().default(25),

  // Malus de recave
  freeRebuysCount: z.number().int().default(2),
  rebuyPenaltyTier1: z.number().int().default(-50),
  rebuyPenaltyTier2: z.number().int().default(-100),
  rebuyPenaltyTier3: z.number().int().default(-150),

  // Nouveau: paliers dynamiques (optionnel, prioritaire sur les champs legacy)
  recavePenaltyTiers: z.array(z.object({
    fromRecaves: z.number().int().min(1),
    penaltyPoints: z.number().int().max(0),
  })).optional().nullable(),

  // Système de meilleures performances
  totalTournamentsCount: z.number().int().optional().nullable(),
  bestTournamentsCount: z.number().int().optional().nullable(),

  // Barème de points détaillé (optionnel - prioritaire sur les champs individuels)
  detailedPointsConfig: z.object({
    type: z.literal('DETAILED'),
    byRank: z.record(z.string(), z.number().int().min(0)),
    rank19Plus: z.number().int().min(0),
  }).optional().nullable(),
});

export async function GET() {
  try {
    const seasons = await prisma.season.findMany({
      orderBy: { year: 'desc' },
      include: {
        _count: {
          select: {
            tournaments: true,
          },
        },
      },
    });

    return NextResponse.json(seasons);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seasons' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier les permissions - seuls les ADMIN peuvent créer des saisons
    const currentPlayer = await getCurrentPlayer(request);

    if (!currentPlayer || !hasPermission(currentPlayer.role, PERMISSIONS.CREATE_SEASON)) {
      return NextResponse.json(
        { error: 'Vous n\'avez pas la permission de créer des saisons' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = seasonSchema.parse(body);

    const season = await prisma.season.create({
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
        bustEliminationBonus: validatedData.bustEliminationBonus,
        leaderKillerBonus: validatedData.leaderKillerBonus,

        freeRebuysCount: validatedData.freeRebuysCount,
        rebuyPenaltyTier1: validatedData.rebuyPenaltyTier1,
        rebuyPenaltyTier2: validatedData.rebuyPenaltyTier2,
        rebuyPenaltyTier3: validatedData.rebuyPenaltyTier3,
        recavePenaltyTiers: validatedData.recavePenaltyTiers ?? undefined,

        totalTournamentsCount: validatedData.totalTournamentsCount,
        bestTournamentsCount: validatedData.bestTournamentsCount,

        detailedPointsConfig: validatedData.detailedPointsConfig ?? undefined,
      },
    });

    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating season:', error);
    return NextResponse.json(
      { error: 'Failed to create season' },
      { status: 500 }
    );
  }
}
