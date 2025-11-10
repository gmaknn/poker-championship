import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/chip-denominations
 * Get all default chip denominations
 */
export async function GET() {
  try {
    const chips = await prisma.chipDenomination.findMany({
      where: { isDefault: true, tournamentId: null },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(chips);
  } catch (error) {
    console.error('Error fetching chip denominations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chip denominations' },
      { status: 500 }
    );
  }
}
