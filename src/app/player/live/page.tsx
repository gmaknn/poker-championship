'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowLeft, Calendar, Users, Trophy, LogIn, ChevronRight, RefreshCw, MapPin, X } from 'lucide-react';
import { useTournamentEvent } from '@/contexts/SocketContext';

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
  buyInAmount: number;
  totalPlayers: number;
  season: {
    name: string;
  } | null;
}

interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
  isBreak: boolean;
}

interface TimerData {
  isRunning: boolean;
  isPaused: boolean;
  currentLevel: number;
  currentLevelData: {
    level: number;
    smallBlind: number;
    bigBlind: number;
    ante: number;
    duration: number;
    isBreak?: boolean;
  } | null;
  secondsIntoCurrentLevel: number;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  recavesOpen: boolean;
}

interface LeaderboardEntry {
  player: {
    id: string;
    nickname: string;
  };
  currentPoints: number;
  currentRank: number;
  eliminationsCount: number;
  isEliminated: boolean;
  finalRank: number | null;
}

interface TournamentStats {
  totalPlayers: number;
  remainingPlayers: number;
  totalRebuys: number;
}

type AuthError = {
  type: 'unauthenticated' | 'inactive' | 'error';
  message: string;
};

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function PlayerLivePage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Timer state
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const timerFetchedAtRef = useRef<number>(0);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Blind levels (fetched once per tournament)
  const [blindLevels, setBlindLevels] = useState<BlindLevel[]>([]);

  // Player position
  const [playerPosition, setPlayerPosition] = useState<{
    tableNumber: number;
    seatNumber: number;
  } | null>(null);

  // Table move notification
  const [tableMoveAlert, setTableMoveAlert] = useState<{
    toTable: number;
    toSeat: number;
  } | null>(null);

  // Current player ID
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Tournament stats
  const [tournamentStats, setTournamentStats] = useState<TournamentStats | null>(null);

  // Starting chips (from tournament detail or leaderboard)
  const [startingChips, setStartingChips] = useState<number>(0);

  // Read player-id cookie
  useEffect(() => {
    const match = document.cookie.match(/player-id=([^;]+)/);
    if (match) setCurrentPlayerId(match[1]);
  }, []);

  // 1-second tick for countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate time remaining
  const remaining = useMemo(() => {
    if (!timerData?.currentLevelData) return null;
    const duration = timerData.currentLevelData.duration * 60;
    let elapsed = timerData.secondsIntoCurrentLevel;
    if (timerData.isRunning && !timerData.isPaused) {
      elapsed += Math.floor((currentTime - timerFetchedAtRef.current) / 1000);
    }
    return Math.max(0, duration - elapsed);
  }, [timerData, currentTime]);

  // Progress percentage for the bar
  const progressPct = useMemo(() => {
    if (!timerData?.currentLevelData || remaining === null) return 0;
    const duration = timerData.currentLevelData.duration * 60;
    if (duration === 0) return 0;
    return Math.min(100, ((duration - remaining) / duration) * 100);
  }, [timerData, remaining]);

  // Next level data
  const nextLevelData = useMemo(() => {
    if (!timerData || blindLevels.length === 0) return null;
    return blindLevels.find((bl) => bl.level === timerData.currentLevel + 1) || null;
  }, [timerData, blindLevels]);

  // Average stack
  const averageStack = useMemo(() => {
    if (!tournamentStats || !startingChips || tournamentStats.remainingPlayers === 0) return null;
    return Math.round(
      (startingChips * (tournamentStats.totalPlayers + tournamentStats.totalRebuys)) /
        tournamentStats.remainingPlayers
    );
  }, [tournamentStats, startingChips]);

  // Number of tables
  const tableCount = useMemo(() => {
    if (!tournamentStats || tournamentStats.remainingPlayers === 0) return 0;
    // Approximate — we'll get exact from tables API if available
    return Math.ceil(tournamentStats.remainingPlayers / 9);
  }, [tournamentStats]);

  // Current player rank & elimination status
  const currentPlayerEntry = useMemo(() => {
    if (!currentPlayerId) return null;
    return leaderboard.find((e) => e.player.id === currentPlayerId) || null;
  }, [currentPlayerId, leaderboard]);

  const fetchActiveTournaments = useCallback(async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        const activeTournaments = data.filter(
          (t: Tournament) => t.status === 'IN_PROGRESS' || t.status === 'REGISTRATION'
        );
        setTournaments(activeTournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  useEffect(() => {
    fetchActiveTournaments();
  }, [fetchActiveTournaments]);

  // Fetch blind levels + starting chips once when tournament selected
  const fetchTournamentDetails = useCallback(async (tournamentId: string) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.blindLevels) {
          setBlindLevels(data.blindLevels);
        }
        if (data.startingChips) {
          setStartingChips(data.startingChips);
        }
      }
    } catch (error) {
      console.error('Error fetching tournament details:', error);
    }
  }, []);

  // Fetch player position from tables API
  const fetchPlayerPosition = useCallback(
    async (tournamentId: string) => {
      if (!currentPlayerId) return;
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/tables`);
        if (res.ok) {
          const data = await res.json();
          for (const table of data.tables) {
            const seat = table.players.find(
              (p: { playerId: string; isEliminated: boolean }) =>
                p.playerId === currentPlayerId && !p.isEliminated
            );
            if (seat) {
              setPlayerPosition({
                tableNumber: table.tableNumber,
                seatNumber: seat.seatNumber,
              });
              return;
            }
          }
          setPlayerPosition(null);
        }
      } catch (error) {
        console.error('Error fetching player position:', error);
      }
    },
    [currentPlayerId]
  );

  const fetchLiveLeaderboard = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsLoadingLeaderboard(true);
    setAuthError(null);
    setTimerData(null);
    setBlindLevels([]);
    setPlayerPosition(null);
    setTableMoveAlert(null);
    setTournamentStats(null);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/live-leaderboard`);

      if (response.status === 401) {
        setAuthError({
          type: 'unauthenticated',
          message: 'Vous devez vous connecter pour voir le classement en direct.',
        });
        setIsLoadingLeaderboard(false);
        return;
      }

      if (response.status === 403) {
        setAuthError({
          type: 'inactive',
          message: 'Votre compte est inactif. Veuillez activer votre compte.',
        });
        setIsLoadingLeaderboard(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        if (data.stats) {
          setTournamentStats({
            totalPlayers: data.stats.totalPlayers,
            remainingPlayers: data.stats.remainingPlayers,
            totalRebuys: data.stats.totalRebuys,
          });
        }
        if (data.tournament?.startingChips) {
          setStartingChips(data.tournament.startingChips);
        }
      }
    } catch (error) {
      console.error('Error fetching live leaderboard:', error);
      setAuthError({
        type: 'error',
        message: 'Erreur lors du chargement du classement.',
      });
    } finally {
      setIsLoadingLeaderboard(false);
      setLastRefresh(new Date());
    }

    // Fetch extra data for IN_PROGRESS tournaments
    if (tournament.status === 'IN_PROGRESS') {
      fetchTournamentDetails(tournament.id);
      fetchPlayerPosition(tournament.id);
    }
  };

  // Silent refresh for leaderboard (no loading spinner)
  const silentRefreshLeaderboard = useCallback(async () => {
    if (!selectedTournament) return;
    try {
      const response = await fetch(`/api/tournaments/${selectedTournament.id}/live-leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        if (data.stats) {
          setTournamentStats({
            totalPlayers: data.stats.totalPlayers,
            remainingPlayers: data.stats.remainingPlayers,
            totalRebuys: data.stats.totalRebuys,
          });
        }
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    }
  }, [selectedTournament]);

  // Timer polling (5 seconds) for IN_PROGRESS tournaments
  useEffect(() => {
    if (!selectedTournament || selectedTournament.status !== 'IN_PROGRESS') return;
    const fetchTimer = async () => {
      try {
        const res = await fetch(`/api/tournaments/${selectedTournament.id}/timer`);
        if (res.ok) {
          const data = await res.json();
          setTimerData(data);
          timerFetchedAtRef.current = Date.now();
        }
      } catch (error) {
        console.error('Error fetching timer:', error);
      }
    };
    fetchTimer();
    const interval = setInterval(fetchTimer, 5000);
    return () => clearInterval(interval);
  }, [selectedTournament]);

  // Auto-refresh leaderboard every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedTournament) {
        silentRefreshLeaderboard();
      } else {
        fetchActiveTournaments();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedTournament, silentRefreshLeaderboard, fetchActiveTournaments]);

  // Socket: table broken
  useTournamentEvent(selectedTournament?.id ?? null, 'tables:broken', useCallback((data: {
    movements: Array<{ playerId: string; toTable: number; toSeat: number }>;
  }) => {
    if (!currentPlayerId) return;
    const myMove = data.movements.find((m) => m.playerId === currentPlayerId);
    if (myMove) {
      setTableMoveAlert({ toTable: myMove.toTable, toSeat: myMove.toSeat });
      setPlayerPosition({ tableNumber: myMove.toTable, seatNumber: myMove.toSeat });
    }
  }, [currentPlayerId]));

  // Socket: player moved (rebalance)
  useTournamentEvent(selectedTournament?.id ?? null, 'table:player_moved', useCallback((data: {
    playerId: string; toTable: number; seatNumber: number;
  }) => {
    if (data.playerId === currentPlayerId) {
      setTableMoveAlert({ toTable: data.toTable, toSeat: data.seatNumber });
      setPlayerPosition({ tableNumber: data.toTable, seatNumber: data.seatNumber });
    }
  }, [currentPlayerId]));

  // Socket: leaderboard updated
  useTournamentEvent(selectedTournament?.id ?? null, 'leaderboard:updated', useCallback(() => {
    silentRefreshLeaderboard();
  }, [silentRefreshLeaderboard]));

  // Socket: timer events — refetch timer state
  const refetchTimer = useCallback(() => {
    if (!selectedTournament) return;
    fetch(`/api/tournaments/${selectedTournament.id}/timer`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setTimerData(data);
          timerFetchedAtRef.current = Date.now();
        }
      })
      .catch(() => {});
  }, [selectedTournament]);

  useTournamentEvent(selectedTournament?.id ?? null, 'timer:paused', useCallback(() => {
    refetchTimer();
  }, [refetchTimer]));

  useTournamentEvent(selectedTournament?.id ?? null, 'timer:resumed', useCallback(() => {
    refetchTimer();
  }, [refetchTimer]));

  useTournamentEvent(selectedTournament?.id ?? null, 'timer:level_change', useCallback(() => {
    refetchTimer();
  }, [refetchTimer]));

  const handleBack = () => {
    if (selectedTournament) {
      setSelectedTournament(null);
      setLeaderboard([]);
      setAuthError(null);
      setTimerData(null);
      setBlindLevels([]);
      setPlayerPosition(null);
      setTableMoveAlert(null);
      setTournamentStats(null);
    } else {
      router.push('/player');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Auth error state (when viewing leaderboard)
  if (authError && selectedTournament) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-lg mx-auto pt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Zap className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold">Accès restreint</h2>
                <p className="text-muted-foreground">{authError.message}</p>
                <div className="flex flex-col gap-2 pt-4">
                  {authError.type === 'unauthenticated' && (
                    <Button onClick={() => router.push('/player/login')}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Se connecter
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Leaderboard view (enriched)
  if (selectedTournament) {
    const isInProgress = selectedTournament.status === 'IN_PROGRESS';
    const isBreak = timerData?.currentLevelData?.isBreak;
    const isPaused = timerData?.isPaused && !isBreak;

    return (
      <div className="min-h-screen p-4 pb-20">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold truncate">{selectedTournament.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedTournament.season?.name || 'Hors saison'}
              </p>
            </div>
            <Badge variant={isInProgress ? 'default' : 'secondary'}>
              {isInProgress ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  En cours
                </span>
              ) : (
                'Inscription'
              )}
            </Badge>
          </div>

          {/* Timer + Blinds (only for IN_PROGRESS) */}
          {isInProgress && (
            <>
              {/* Timer Card */}
              <Card>
                <CardContent className="pt-6 pb-4">
                  {timerData?.currentLevelData ? (
                    <div className="space-y-3">
                      {/* Countdown */}
                      <div className="text-center">
                        <p className="text-5xl font-mono font-bold tracking-wider text-white">
                          {remaining !== null ? formatTime(remaining) : '--:--'}
                        </p>
                        {isPaused && (
                          <Badge className="mt-2 bg-red-500 text-white animate-pulse">
                            EN PAUSE
                          </Badge>
                        )}
                        {isBreak && (
                          <Badge className="mt-2 bg-blue-500 text-white">
                            PAUSE TOURNOI
                          </Badge>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      {/* Blinds info */}
                      {!isBreak ? (
                        <div className="text-center space-y-1">
                          <p className="text-base font-semibold">
                            Niveau {timerData.currentLevel} — {timerData.currentLevelData.smallBlind}/{timerData.currentLevelData.bigBlind}
                            {timerData.currentLevelData.ante > 0 && (
                              <span className="text-muted-foreground"> (ante {timerData.currentLevelData.ante})</span>
                            )}
                          </p>
                          {nextLevelData && (
                            <p className="text-sm text-muted-foreground">
                              {nextLevelData.isBreak ? (
                                'Prochain : Pause tournoi'
                              ) : (
                                <>
                                  Prochain : {nextLevelData.smallBlind}/{nextLevelData.bigBlind}
                                  {nextLevelData.ante > 0 && ` (ante ${nextLevelData.ante})`}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-base font-semibold text-blue-400">
                            Pause tournoi
                          </p>
                          {nextLevelData && !nextLevelData.isBreak && (
                            <p className="text-sm text-muted-foreground">
                              Prochain : Niveau {nextLevelData.level} — {nextLevelData.smallBlind}/{nextLevelData.bigBlind}
                              {nextLevelData.ante > 0 && ` (ante ${nextLevelData.ante})`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Skeleton loading for timer */
                    <div className="space-y-3 animate-pulse">
                      <div className="text-center">
                        <div className="h-12 w-32 bg-white/10 rounded mx-auto" />
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10" />
                      <div className="h-5 w-48 bg-white/10 rounded mx-auto" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats bar */}
              {tournamentStats && (
                <div className="flex items-center justify-around text-sm px-2">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {tournamentStats.remainingPlayers}/{tournamentStats.totalPlayers}
                  </span>
                  {averageStack !== null && (
                    <span>
                      Moy: {averageStack.toLocaleString('fr-FR')}
                    </span>
                  )}
                  {tableCount > 0 && (
                    <span>
                      {tableCount}T
                    </span>
                  )}
                </div>
              )}

              {/* Player position card */}
              {currentPlayerId && currentPlayerEntry && (
                <Card className="border-primary/50 bg-primary/5">
                  <CardContent className="pt-4 pb-4">
                    {currentPlayerEntry.isEliminated ? (
                      <div className="flex items-center gap-3">
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold">
                            Éliminé — Rang #{currentPlayerEntry.finalRank || currentPlayerEntry.currentRank}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {currentPlayerEntry.currentPoints} pts
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          {playerPosition ? (
                            <p className="font-semibold">
                              Table {playerPosition.tableNumber} — Siège {playerPosition.seatNumber}
                            </p>
                          ) : (
                            <p className="font-semibold text-muted-foreground">
                              Position en chargement...
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Rang #{currentPlayerEntry.currentRank} ({currentPlayerEntry.currentPoints} pts)
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Classement Live
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={silentRefreshLeaderboard}
                  aria-label="Rafraîchir"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mis à jour à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · auto-refresh 30s
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingLeaderboard ? (
                <div className="p-6 text-center">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Aucun classement disponible.
                </div>
              ) : (
                <div className="divide-y">
                  {leaderboard.slice(0, 20).map((entry) => {
                    const isCurrentPlayer = entry.player.id === currentPlayerId;
                    return (
                      <div
                        key={entry.player.id}
                        className={`flex items-center gap-3 p-3 ${isCurrentPlayer ? 'bg-primary/10' : ''}`}
                      >
                        {/* Rank */}
                        <div className="w-8 text-center">
                          {entry.currentRank <= 3 ? (
                            <Trophy className={`h-5 w-5 mx-auto ${
                              entry.currentRank === 1 ? 'text-yellow-500' :
                              entry.currentRank === 2 ? 'text-gray-400' : 'text-amber-600'
                            }`} />
                          ) : (
                            <span className="font-mono text-muted-foreground">{entry.currentRank}</span>
                          )}
                        </div>

                        {/* Player Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isCurrentPlayer ? 'text-primary' : ''}`}>
                            {entry.player.nickname}
                            {isCurrentPlayer && ' (vous)'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {entry.eliminationsCount} elimination{entry.eliminationsCount !== 1 ? 's' : ''}
                          </p>
                        </div>

                        {/* Points */}
                        <div className="text-right">
                          <p className="font-bold text-lg">{entry.currentPoints}</p>
                          <p className="text-sm text-muted-foreground">pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Table move notification */}
        {tableMoveAlert && (
          <div className="fixed bottom-24 inset-x-4 z-50 bg-amber-500 text-black rounded-2xl p-6 shadow-2xl max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-lg">CHANGEMENT DE TABLE !</p>
                <p className="mt-1">
                  Rendez-vous Table {tableMoveAlert.toTable} — Siège {tableMoveAlert.toSeat}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-black hover:bg-amber-600 shrink-0"
                onClick={() => setTableMoveAlert(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-3 flex justify-end">
              <Button
                variant="outline"
                className="bg-black/10 border-black/20 text-black hover:bg-black/20"
                onClick={() => setTableMoveAlert(null)}
              >
                OK, compris
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tournament list view
  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/player')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-orange-500" />
              Classements Live
            </h1>
          </div>
        </div>

        {/* Tournament Cards */}
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Aucun tournoi actif</h3>
                <p className="text-sm text-muted-foreground">
                  Revenez plus tard pour suivre les tournois en cours.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => {
              const isInProgress = tournament.status === 'IN_PROGRESS';

              return (
                <Card
                  key={tournament.id}
                  className={`cursor-pointer hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    isInProgress ? 'border-orange-500/50' : ''
                  }`}
                  onClick={() => fetchLiveLeaderboard(tournament)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLiveLeaderboard(tournament)}
                  role="button"
                  tabIndex={0}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{tournament.name}</CardTitle>
                        <CardDescription>{tournament.season?.name || 'Hors saison'}</CardDescription>
                      </div>
                      <Badge variant={isInProgress ? 'default' : 'secondary'}>
                        {isInProgress ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            En cours
                          </span>
                        ) : (
                          'Inscription'
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(tournament.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {tournament.totalPlayers}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
