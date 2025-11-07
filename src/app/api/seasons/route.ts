import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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
  leaderKillerBonus: z.number().int().default(25),

  // Malus de recave
  freeRebuysCount: z.number().int().default(2),
  rebuyPenaltyTier1: z.number().int().default(-50),
  rebuyPenaltyTier2: z.number().int().default(-100),
  rebuyPenaltyTier3: z.number().int().default(-150),

  // Système de meilleures performances
  totalTournamentsCount: z.number().int().optional().nullable(),
  bestTournamentsCount: z.number().int().optional().nullable(),
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
        leaderKillerBonus: validatedData.leaderKillerBonus,

        freeRebuysCount: validatedData.freeRebuysCount,
        rebuyPenaltyTier1: validatedData.rebuyPenaltyTier1,
        rebuyPenaltyTier2: validatedData.rebuyPenaltyTier2,
        rebuyPenaltyTier3: validatedData.rebuyPenaltyTier3,

        totalTournamentsCount: validatedData.totalTournamentsCount,
        bestTournamentsCount: validatedData.bestTournamentsCount,
      },
    });

    return NextResponse.json(season, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
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
