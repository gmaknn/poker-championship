import { Server as SocketIOServer } from 'socket.io';

// Type definitions for WebSocket events
export interface TournamentEvents {
  // Tournament status events
  'tournament:status_change': {
    tournamentId: string;
    status: string;
    timestamp: Date;
  };
  'tournament:player_enrolled': {
    tournamentId: string;
    playerId: string;
    playerName: string;
  };
  'tournament:player_withdrawn': {
    tournamentId: string;
    playerId: string;
  };

  // Timer events
  'timer:started': {
    tournamentId: string;
    startedAt: Date;
    currentLevel: number;
  };
  'timer:paused': {
    tournamentId: string;
    pausedAt: Date;
    elapsedSeconds: number;
  };
  'timer:resumed': {
    tournamentId: string;
    resumedAt: Date;
  };
  'timer:level_change': {
    tournamentId: string;
    newLevel: number;
    smallBlind: number;
    bigBlind: number;
    ante?: number;
  };
  'timer:sync': {
    tournamentId: string;
    currentLevel: number;
    remainingSeconds: number;
    isRunning: boolean;
    elapsedSeconds: number;
  };

  // Table events
  'tables:generated': {
    tournamentId: string;
    tablesCount: number;
    totalPlayers: number;
  };
  'tables:rebalanced': {
    tournamentId: string;
    tablesCount: number;
  };
  'table:player_moved': {
    tournamentId: string;
    playerId: string;
    newTable: number;
    newSeat: number;
  };

  // Elimination events
  'elimination:player_out': {
    tournamentId: string;
    eliminatedId: string;
    eliminatedName: string;
    eliminatorId: string;
    eliminatorName: string;
    rank: number;
    level: number;
    isLeaderKill: boolean;
  };
  'elimination:tournament_complete': {
    tournamentId: string;
    winnerId: string;
    winnerName: string;
  };

  // Leaderboard events
  'leaderboard:updated': {
    tournamentId: string;
    timestamp: Date;
  };

  // Rebuy events
  'rebuy:recorded': {
    tournamentId: string;
    playerId: string;
    playerName: string;
    rebuyType: 'standard' | 'light';
  };

  // Bust events (pendant période de recaves)
  'bust:player_busted': {
    tournamentId: string;
    eliminatedId: string;
    eliminatedName: string;
    killerId: string | null;
    killerName: string | null;
    level: number;
  };

  // Bust cancelled event
  'bust:cancelled': {
    tournamentId: string;
    bustId: string;
    eliminatedName: string;
    killerName: string | null;
    recaveCancelled: boolean;
  };

  // Rebuy from bust events
  'rebuy:applied': {
    tournamentId: string;
    playerId: string;
    playerName: string;
    rebuysCount: number;
    fromBustId: string;
  };
  'rebuy:cancelled': {
    tournamentId: string;
    playerId: string;
    playerName: string;
    rebuysCount: number;
    fromBustId: string;
  };

  // Time (temps de réflexion) events
  'tournament:time-called': {
    tournamentId: string;
    duration: number; // durée en secondes
    startedAt: Date;
  };
  'tournament:time-ended': {
    tournamentId: string;
  };
  'tournament:time-cancelled': {
    tournamentId: string;
  };

  // Timer auto-resume event (after recave, timer resumes automatically)
  'tournament:timer-auto-resume': {
    tournamentId: string;
    delaySeconds: number;
  };
}

/**
 * Emit a WebSocket event to all clients in a tournament room
 */
export function emitToTournament<K extends keyof TournamentEvents>(
  tournamentId: string,
  event: K,
  data: TournamentEvents[K]
) {
  const io = getSocketIO();
  if (io) {
    const room = `tournament:${tournamentId}`;
    io.to(room).emit(event, data);
    console.log(`🔔 Emitted ${event} to ${room}`, data);
  } else {
    console.warn('⚠️ Socket.IO not initialized, cannot emit event:', event);
  }
}

/**
 * Get the Socket.IO server instance
 */
export function getSocketIO(): SocketIOServer | null {
  // @ts-ignore - Access global io instance
  return global.io || null;
}
