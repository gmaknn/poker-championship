import { NextRequest, NextResponse } from 'next/server';
import { calculateLeaderboard } from '@/lib/leaderboard';
import { requireActivePlayer } from '@/lib/auth-helpers';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/seasons/[id]/leaderboard
 * Get the season leaderboard with "best performances" system
 *
 * RBAC:
 * - 401: Not authenticated
 * - 403: INACTIVE status
 * - 200: ACTIVE status (PLAYER or higher)
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Check authentication and ACTIVE status
    const authResult = await requireActivePlayer(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

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
