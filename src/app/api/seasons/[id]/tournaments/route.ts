import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json(
        { error: 'Season ID is required' },
        { status: 400 }
      );
    }

    // Fetch all tournaments for the season with player data
    const tournaments = await prisma.tournament.findMany({
      where: {
        seasonId: seasonId,
      },
      include: {
        tournamentPlayers: {
          include: {
            player: {
              select: {
                id: true,
                nickname: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error('Error fetching season tournaments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' },
      { status: 500 }
    );
  }
}
