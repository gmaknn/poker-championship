import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/tournaments/[id]/chips
 * Get chips for a specific tournament (or default chips if none configured)
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    // First, try to get tournament-specific chips
    const tournamentChips = await prisma.chipDenomination.findMany({
      where: { tournamentId: id },
      orderBy: { order: 'asc' },
    });

    // If no tournament-specific chips, return default chips
    if (tournamentChips.length === 0) {
      const defaultChips = await prisma.chipDenomination.findMany({
        where: { isDefault: true, tournamentId: null },
        orderBy: { order: 'asc' },
      });
      return NextResponse.json({ chips: defaultChips, isDefault: true });
    }

    return NextResponse.json({ chips: tournamentChips, isDefault: false });
  } catch (error) {
    console.error('Error fetching tournament chips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tournament chips' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tournaments/[id]/chips
 * Copy default chips to tournament or update existing chips
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { chips } = body;

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return NextResponse.json(
        { error: 'Tournament not found' },
        { status: 404 }
      );
    }

    // Delete existing tournament chips
    await prisma.chipDenomination.deleteMany({
      where: { tournamentId: id },
    });

    // Create new chips for this tournament
    const createdChips = await Promise.all(
      chips.map((chip: any, index: number) =>
        prisma.chipDenomination.create({
          data: {
            tournamentId: id,
            value: chip.value,
            color: chip.color,
            colorSecondary: chip.colorSecondary || null,
            quantity: chip.quantity || null,
            order: chip.order || index + 1,
            isDefault: false,
          },
        })
      )
    );

    return NextResponse.json({ chips: createdChips });
  } catch (error) {
    console.error('Error creating tournament chips:', error);
    return NextResponse.json(
      { error: 'Failed to create tournament chips' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tournaments/[id]/chips
 * Delete tournament-specific chips (will revert to default chips)
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    await prisma.chipDenomination.deleteMany({
      where: { tournamentId: id },
    });

    return NextResponse.json({ message: 'Tournament chips deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament chips:', error);
    return NextResponse.json(
      { error: 'Failed to delete tournament chips' },
      { status: 500 }
    );
  }
}
