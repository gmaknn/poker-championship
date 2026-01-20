import { NextRequest, NextResponse } from 'next/server';
import { calculateLeaderboard } from '@/lib/leaderboard';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/seasons/[id]/leaderboard
 * Get the season leaderboard with "best performances" system
 *
 * PUBLIC ACCESS - No authentication required
 * Only exposes public data: name, nickname, avatar, stats
 * No sensitive data (email, etc.) is returned
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const result = await calculateLeaderboard(id);

    if (!result) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching season leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season leaderboard' },
      { status: 500 }
    );
  }
}
