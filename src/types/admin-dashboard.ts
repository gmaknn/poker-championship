/**
 * Types for Admin Dashboard API response
 */

export interface AdminDashboardResponse {
  tournament: {
    id: string;
    status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED';
    currentLevel: number;
    rebuyEndLevel: number | null;
  };
  players: {
    registered: number;
    eliminated: number;
    remaining: number;
  };
  level: {
    currentLevel: number;
    blinds: {
      smallBlind: number;
      bigBlind: number;
      ante: number;
    };
    durationSeconds: number;
    secondsIntoCurrentLevel: number;
    remainingSeconds: number;
    isRunning: boolean;
    isPaused: boolean;
  };
  rebuys: {
    total: number;
    lightUsed: number;
  };
  alerts: {
    rebuyWindowClosed: boolean;
    noPlayersRemaining: boolean;
    finishedLeaderboardInconsistent: boolean;
  };
}
