import { NextRequest, NextResponse } from 'next/server';
import { calculateLeaderboard, LeaderboardResult } from '@/lib/leaderboard';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/seasons/[id]/leaderboard-public
 * Public leaderboard endpoint for TV mode display
 * Returns only essential data (top 10) without authentication
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

    // Return only top 10 for public display with limited player info
    const publicLeaderboard = result.leaderboard.slice(0, 10).map((player) => ({
      rank: player.rank,
      player: {
        id: player.player.id,
        firstName: player.player.firstName,
        lastName: player.player.lastName,
        nickname: player.player.nickname,
        avatar: player.player.avatar,
      },
      totalPoints: player.totalPoints,
      tournamentsPlayed: player.tournamentsPlayed,
      victories: player.victories,
      podiums: player.podiums,
    }));

    return NextResponse.json({
      season: result.season,
      leaderboard: publicLeaderboard,
    });
  } catch (error) {
    console.error('Error fetching public season leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season leaderboard' },
      { status: 500 }
    );
  }
}
