'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentPlayer } from '@/components/layout/player-nav';

/**
 * Redirect to the main leaderboard page.
 * The actual leaderboard is displayed on /player/leaderboard which shows the active season.
 * For specific season leaderboard, we redirect to the dashboard version for now.
 */
export default function PlayerSeasonLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const { currentPlayer, isLoading } = useCurrentPlayer();
  const seasonId = params.id as string;

  useEffect(() => {
    if (!isLoading) {
      if (!currentPlayer) {
        router.push('/player/login');
      } else if (currentPlayer.role !== 'ANIMATOR' && currentPlayer.role !== 'ADMIN') {
        router.push('/player');
      } else {
        // Redirect to the player leaderboard with season context
        // For now, we'll just show the general leaderboard
        router.push('/player/leaderboard');
      }
    }
  }, [currentPlayer, isLoading, router, seasonId]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground">Redirection...</p>
      </div>
    </div>
  );
}
