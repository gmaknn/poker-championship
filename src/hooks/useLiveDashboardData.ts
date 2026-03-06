import { useEffect, useState, useCallback, useRef } from 'react';
import { useTournamentEvent } from '@/contexts/SocketContext';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatar?: string | null;
};

type BlindLevel = {
  id: string;
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
  isBreak?: boolean;
};

export type TimerState = {
  tournamentId: string;
  status: string;
  isRunning: boolean;
  isPaused: boolean;
  currentLevel: number;
  currentLevelData: BlindLevel | null;
  totalElapsedSeconds: number;
  secondsIntoCurrentLevel: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  recavesOpen: boolean;
  isVoluntaryRebuyPeriod?: boolean;
};

export type TournamentPlayer = {
  id: string;
  playerId: string;
  finalRank: number | null;
  eliminationsCount: number;
  leaderKills: number;
  rebuysCount: number;
  lightRebuyUsed: boolean;
  voluntaryFullRebuyUsed: boolean;
  currentStack: number | null;
  player: Player;
};

export type Elimination = {
  id: string;
  rank: number;
  level: number;
  isLeaderKill: boolean;
  isAutoElimination?: boolean;
  isAbandonment?: boolean;
  createdAt: string;
  eliminated: Player;
  eliminator: Player | null;
};

export type BustEvent = {
  id: string;
  level: number;
  createdAt: string;
  recaveApplied: boolean;
  eliminated: {
    id: string;
    playerId: string;
    rebuysCount: number;
    player: Player;
  };
  killer: {
    player: Player;
  } | null;
};

export type TableSeat = {
  seatNumber: number | null;
  playerId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  isEliminated: boolean;
};

export type TablePlan = {
  tableNumber: number;
  seats: TableSeat[];
  activeCount: number;
  totalCount: number;
};

export type { BlindLevel };

export interface LiveDashboardData {
  timer: TimerState | null;
  tables: TablePlan[];
  players: TournamentPlayer[];
  busts: BustEvent[];
  eliminations: Elimination[];
  blindLevels: BlindLevel[];
  isLoading: boolean;
  localTime: number;
  refetch: () => void;
}

export function useLiveDashboardData(tournamentId: string): LiveDashboardData {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [tables, setTables] = useState<TablePlan[]>([]);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [busts, setBusts] = useState<BustEvent[]>([]);
  const [eliminations, setEliminations] = useState<Elimination[]>([]);
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localTime, setLocalTime] = useState(0);
  const mountedRef = useRef(true);

  const fetchTimer = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/timer`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) {
          setTimer(data);
          setLocalTime(data.secondsIntoCurrentLevel);
        }
      }
    } catch (e) {
      console.error('Error fetching timer:', e);
    }
  }, [tournamentId]);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/tables-plan`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setTables(data.tables || []);
      }
    } catch (e) {
      console.error('Error fetching tables:', e);
    }
  }, [tournamentId]);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setPlayers(data);
      }
    } catch (e) {
      console.error('Error fetching players:', e);
    }
  }, [tournamentId]);

  const fetchBusts = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/busts`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setBusts(data);
      }
    } catch (e) {
      console.error('Error fetching busts:', e);
    }
  }, [tournamentId]);

  const fetchEliminations = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/eliminations`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setEliminations(data);
      }
    } catch (e) {
      console.error('Error fetching eliminations:', e);
    }
  }, [tournamentId]);

  const fetchBlinds = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/blinds`);
      if (res.ok) {
        const data = await res.json();
        if (mountedRef.current) setBlindLevels(data);
      }
    } catch (e) {
      console.error('Error fetching blinds:', e);
    }
  }, [tournamentId]);

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchTimer(),
      fetchTables(),
      fetchPlayers(),
      fetchBusts(),
      fetchEliminations(),
      fetchBlinds(),
    ]);
    if (mountedRef.current) setIsLoading(false);
  }, [fetchTimer, fetchTables, fetchPlayers, fetchBusts, fetchEliminations, fetchBlinds]);

  // Initial fetch + polling every 5s
  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAll]);

  // Client-side timer interpolation (1s tick)
  useEffect(() => {
    if (!timer?.isRunning) return;
    const interval = setInterval(() => {
      setLocalTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.isRunning]);

  // Socket events → targeted refetch
  const refetchTablesAndPlayers = useCallback(() => {
    fetchTables();
    fetchPlayers();
  }, [fetchTables, fetchPlayers]);

  const refetchBustsAndPlayers = useCallback(() => {
    fetchBusts();
    fetchPlayers();
  }, [fetchBusts, fetchPlayers]);

  useTournamentEvent(tournamentId, 'elimination:player_out', useCallback(() => {
    refetchTablesAndPlayers();
    fetchEliminations();
  }, [refetchTablesAndPlayers, fetchEliminations]));

  useTournamentEvent(tournamentId, 'bust:player_busted', useCallback(() => {
    fetchBusts();
  }, [fetchBusts]));

  useTournamentEvent(tournamentId, 'bust:cancelled', useCallback(() => {
    refetchBustsAndPlayers();
  }, [refetchBustsAndPlayers]));

  useTournamentEvent(tournamentId, 'rebuy:applied', useCallback(() => {
    refetchBustsAndPlayers();
  }, [refetchBustsAndPlayers]));

  useTournamentEvent(tournamentId, 'rebuy:cancelled', useCallback(() => {
    refetchBustsAndPlayers();
  }, [refetchBustsAndPlayers]));

  useTournamentEvent(tournamentId, 'timer:level_change', useCallback(() => {
    fetchTimer();
  }, [fetchTimer]));

  useTournamentEvent(tournamentId, 'timer:paused', useCallback(() => {
    fetchTimer();
  }, [fetchTimer]));

  useTournamentEvent(tournamentId, 'timer:resumed', useCallback(() => {
    fetchTimer();
  }, [fetchTimer]));

  useTournamentEvent(tournamentId, 'tables:player-moved-manual', useCallback(() => {
    fetchTables();
  }, [fetchTables]));

  useTournamentEvent(tournamentId, 'tables:merged', useCallback(() => {
    fetchTables();
  }, [fetchTables]));

  useTournamentEvent(tournamentId, 'tables:rebalanced', useCallback(() => {
    fetchTables();
  }, [fetchTables]));

  return {
    timer,
    tables,
    players,
    busts,
    eliminations,
    blindLevels,
    isLoading,
    localTime,
    refetch: fetchAll,
  };
}
