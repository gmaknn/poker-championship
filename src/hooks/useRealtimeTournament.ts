import { useEffect, useState, useCallback } from 'react';
import { useTournamentEvent } from '@/contexts/SocketContext';

/**
 * Hook to get real-time tournament updates via WebSocket
 */
export function useRealtimeTournament(tournamentId: string | null) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Listen to timer events
  useTournamentEvent(tournamentId, 'timer:started', (data) => {
    console.log('Timer started:', data);
    setLastUpdate(new Date());
  });

  useTournamentEvent(tournamentId, 'timer:paused', (data) => {
    console.log('Timer paused:', data);
    setLastUpdate(new Date());
  });

  useTournamentEvent(tournamentId, 'timer:resumed', (data) => {
    console.log('Timer resumed:', data);
    setLastUpdate(new Date());
  });

  useTournamentEvent(tournamentId, 'timer:level_change', (data) => {
    console.log('Level changed:', data);
    setLastUpdate(new Date());
  });

  // Listen to elimination events
  useTournamentEvent(tournamentId, 'elimination:player_out', (data) => {
    console.log('Player eliminated:', data);
    setLastUpdate(new Date());
  });

  useTournamentEvent(tournamentId, 'elimination:tournament_complete', (data) => {
    console.log('Tournament complete! Winner:', data.winnerName);
    setLastUpdate(new Date());
  });

  // Listen to leaderboard updates
  useTournamentEvent(tournamentId, 'leaderboard:updated', (data) => {
    console.log('Leaderboard updated:', data);
    setLastUpdate(new Date());
  });

  // Listen to tournament status changes
  useTournamentEvent(tournamentId, 'tournament:status_change', (data) => {
    console.log('Tournament status changed:', data.status);
    setLastUpdate(new Date());
  });

  return { lastUpdate };
}
