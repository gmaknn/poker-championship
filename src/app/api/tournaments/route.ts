import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for tournament creation
const tournamentSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  seasonId: z.string().min(1, 'La saison est requise'),
  date: z.string().datetime(),
  buyInAmount: z.number().min(0).default(10),
  startingChips: z.number().int().min(1000).default(5000),
  targetDuration: z.number().int().min(30).default(180),
  totalPlayers: z.number().int().min(2).optional(),
  status: z.enum(['DRAFT', 'PLANNED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).default('PLANNED'),
});

// GET all tournaments
export async function GET(request: Request) {
  try {
    // TODO: Add authentication check when NextAuth v5 is properly configured
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    const where = seasonId ? { seasonId } : {};

    const tournaments = await prisma.tournament.findMany({
      where,
      include: {
        season: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tournois' },
      { status: 500 }
    );
  }
}

// POST create new tournament
export async function POST(request: Request) {
  try {
    // TODO: Add authentication check when NextAuth v5 is properly configured
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const body = await request.json();
    const validatedData = tournamentSchema.parse(body);

    // Verify season exists
    const season = await prisma.season.findUnique({
      where: { id: validatedData.seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: 'Saison non trouvée' },
        { status: 404 }
      );
    }

    // Check if season is active
    const now = new Date();
    if (season.endDate && new Date(season.endDate) < now) {
      return NextResponse.json(
        { error: 'Cette saison est terminée' },
        { status: 400 }
      );
    }

    // Extract seasonId and prepare data for Prisma
    const { seasonId, ...tournamentData } = validatedData;

    const tournament = await prisma.tournament.create({
      data: {
        ...tournamentData,
        season: {
          connect: { id: seasonId }
        }
      },
      include: {
        season: {
          select: {
            id: true,
            name: true,
            year: true,
          },
        },
        _count: {
          select: {
            tournamentPlayers: true,
          },
        },
      },
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating tournament:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du tournoi' },
      { status: 500 }
    );
  }
}
