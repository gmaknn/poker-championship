'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentPlayer } from '@/components/layout/player-nav';

/**
 * Stats page - redirects to player profile page which contains all stats
 * If not logged in, redirects to login
 */
export default function PlayerStatsPage() {
  const router = useRouter();
  const { currentPlayer, isLoading } = useCurrentPlayer();

  useEffect(() => {
    if (!isLoading) {
      if (currentPlayer) {
        // Redirect to player profile page with all stats
        router.replace(`/player/${currentPlayer.id}`);
      } else {
        // Not logged in, redirect to login
        router.replace('/player/login');
      }
    }
  }, [currentPlayer, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground">Chargement de vos statistiques...</p>
      </div>
    </div>
  );
}
