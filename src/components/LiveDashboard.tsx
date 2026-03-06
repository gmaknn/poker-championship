'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Skull,
  Users,
  Trophy,
  Target,
  Undo2,
  ChevronDown,
  ChevronUp,
  LogOut,
  RefreshCw,
  ArrowRightLeft,
  Merge,
  Shuffle,
  UserPlus,
  Coins,
  Coffee,
  Play,
  Pause,
} from 'lucide-react';
import { CircularTimer } from '@/components/CircularTimer';
import {
  useLiveDashboardData,
  type TournamentPlayer,
  type BustEvent,
  type TablePlan,
  type BlindLevel,
} from '@/hooks/useLiveDashboardData';

type TournamentStatus = 'PLANNED' | 'REGISTRATION' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

type Tournament = {
  id: string;
  name: string | null;
  status: TournamentStatus;
  buyInAmount: number;
  lightRebuyAmount: number;
  startingChips: number;
  totalPlayers?: number | null;
  seatsPerTable?: number;
  _count: {
    tournamentPlayers: number;
    blindLevels: number;
  };
};

type AllPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
};

type Props = {
  tournamentId: string;
  tournament: Tournament;
  onUpdate?: () => void;
};

// Last action for undo
type LastAction =
  | { type: 'bust'; bustId: string; playerName: string }
  | { type: 'recave'; bustId: string; playerName: string }
  | { type: 'elimination'; eliminationId: string; playerName: string };

export default function LiveDashboard({ tournamentId, tournament, onUpdate }: Props) {
  const {
    timer,
    tables,
    players,
    busts,
    eliminations,
    blindLevels,
    isLoading,
    localTime,
    refetch,
  } = useLiveDashboardData(tournamentId);

  // Action states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bustRecaveSubmitting, setBustRecaveSubmitting] = useState<string | null>(null);

  // Mobile player action dialog
  const [selectedPlayerAction, setSelectedPlayerAction] = useState<{
    player: TournamentPlayer;
    tableNumber: number;
  } | null>(null);

  // FAB dialog (bust during recaves, elimination otherwise)
  const [fabDialogOpen, setFabDialogOpen] = useState(false);
  const [fabEliminated, setFabEliminated] = useState('');
  const [fabKiller, setFabKiller] = useState('');

  // Bust dialog (killer selector for inline bust action)
  const [bustDialog, setBustDialog] = useState<{
    eliminatedId: string;
    playerName: string;
  } | null>(null);
  const [bustKiller, setBustKiller] = useState('');

  // Elimination dialog (killer selector)
  const [eliminationDialog, setEliminationDialog] = useState<{
    eliminatedId: string;
    playerName: string;
  } | null>(null);
  const [eliminationKiller, setEliminationKiller] = useState('');

  // Abandon confirm
  const [abandonDialog, setAbandonDialog] = useState<{
    playerId: string;
    playerName: string;
  } | null>(null);

  // History collapsed
  const [historyOpen, setHistoryOpen] = useState(false);

  // Mobile accordion — track which table is open
  const [openTable, setOpenTable] = useState<number | null>(null);

  // Move player dialog
  const [moveDialog, setMoveDialog] = useState<{
    playerId: string;
    playerName: string;
    fromTable: number;
  } | null>(null);
  const [moveToTable, setMoveToTable] = useState('');
  const [moveToSeat, setMoveToSeat] = useState('');

  // Merge table dialog
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeTableToClose, setMergeTableToClose] = useState('');

  // Rebalance confirm
  const [rebalanceConfirm, setRebalanceConfirm] = useState(false);

  // Late registration dialog
  const [lateRegOpen, setLateRegOpen] = useState(false);
  const [lateRegPlayerId, setLateRegPlayerId] = useState('');
  const [allPlayers, setAllPlayers] = useState<AllPlayer[]>([]);
  const [allPlayersLoading, setAllPlayersLoading] = useState(false);

  // Undo state
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  // Timer toggle animation
  const [timerPressed, setTimerPressed] = useState(false);

  // Computed values
  const activePlayers = players.filter((p) => p.finalRank === null);
  const totalPlayers = players.length;
  const totalRebuys = players.reduce((sum, p) => sum + p.rebuysCount, 0);
  const eliminatedPlayers = players.filter((p) => p.finalRank !== null);
  const seatsPerTable = tournament.seatsPerTable ?? 9;

  // Recave period includes voluntary rebuy pause (pause after rebuy end)
  const canBust = !!(timer?.recavesOpen || timer?.isVoluntaryRebuyPeriod);

  // Pending busts (not recaved, not eliminated)
  const truePendingBusts = busts.filter((b) => {
    if (b.recaveApplied) return false;
    const player = players.find((p) => p.playerId === b.eliminated.playerId);
    return player && player.finalRank === null;
  });

  // Pot total
  const potTotal = (totalPlayers * tournament.buyInAmount) + (totalRebuys * tournament.buyInAmount);

  // Timer computed
  const timeRemaining = timer?.currentLevelData
    ? Math.max(0, timer.currentLevelData.duration * 60 - localTime)
    : 0;
  const totalDuration = timer?.currentLevelData
    ? timer.currentLevelData.duration * 60
    : 0;

  // Next break computation
  const nextBreakInfo = (() => {
    if (!timer || !blindLevels.length) return null;
    if (timer.isPaused && timer.currentLevelData?.isBreak) return { label: 'En pause' };

    const currentLevel = timer.currentLevel;
    const nextBreak = blindLevels.find(
      (bl) => bl.level > currentLevel && bl.isBreak
    );
    if (!nextBreak) return null;

    // Sum durations of levels between current and break
    let secondsUntilBreak = timeRemaining; // remaining in current level
    for (const bl of blindLevels) {
      if (bl.level > currentLevel && bl.level < nextBreak.level) {
        secondsUntilBreak += bl.duration * 60;
      }
    }
    return { label: `Pause dans ${formatTimeFn(secondsUntilBreak)}` };
  })();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayerName = (p: { nickname: string; firstName: string; lastName: string }) => {
    return p.nickname || `${p.firstName} ${p.lastName}`;
  };

  // Build player map for quick lookup
  const playerMap = new Map(players.map((p) => [p.playerId, p]));

  // Build player-to-table/seat map
  const playerTableMap = new Map<string, { tableNumber: number; seatNumber: number | null }>();
  tables.forEach((table) => {
    table.seats.forEach((seat) => {
      if (!seat.isEliminated) {
        playerTableMap.set(seat.playerId, {
          tableNumber: table.tableNumber,
          seatNumber: seat.seatNumber,
        });
      }
    });
  });

  // Build killer options — same table only (Part A)
  const getKillerOptions = (eliminatedId: string) => {
    const eliminatedTable = playerTableMap.get(eliminatedId);
    const candidates = activePlayers.filter((p) => p.playerId !== eliminatedId);

    const formatPlayer = (p: TournamentPlayer) => {
      const info = playerTableMap.get(p.playerId);
      const suffix = info?.seatNumber != null ? ` (S${info.seatNumber})` : '';
      return getPlayerName(p.player) + suffix;
    };

    if (!eliminatedTable) {
      return candidates.map((p) => (
        <option key={p.playerId} value={p.playerId}>
          {formatPlayer(p)}
        </option>
      ));
    }

    const sameTable = candidates.filter(
      (p) => playerTableMap.get(p.playerId)?.tableNumber === eliminatedTable.tableNumber
    );

    return sameTable.map((p) => (
      <option key={p.playerId} value={p.playerId}>
        {formatPlayer(p)}
      </option>
    ));
  };

  // Get free seats for a given table
  const getFreeSeatNumbers = (tableNumber: number): number[] => {
    const table = tables.find((t) => t.tableNumber === tableNumber);
    if (!table) return [];
    const occupied = new Set(table.seats.filter((s) => !s.isEliminated).map((s) => s.seatNumber));
    const free: number[] = [];
    for (let i = 1; i <= seatsPerTable; i++) {
      if (!occupied.has(i)) free.push(i);
    }
    return free;
  };

  // --- Actions ---

  const handleBust = async (eliminatedId: string, killerId?: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/busts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminatedId,
          killerId: killerId || undefined,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const pName = players.find((p) => p.playerId === eliminatedId);
        toast.success('Bust enregistré');
        if (data.id) setLastAction({ type: 'bust', bustId: data.id, playerName: pName ? getPlayerName(pName.player) : '?' });
        refetch();
        onUpdate?.();
        setFabDialogOpen(false);
        setFabEliminated('');
        setFabKiller('');
        setBustDialog(null);
        setSelectedPlayerAction(null);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors du bust');
      }
    } catch {
      toast.error('Erreur lors du bust');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleElimination = async (eliminatedId: string, eliminatorId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/eliminations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminatedId,
          eliminatorId,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const pName = players.find((p) => p.playerId === eliminatedId);
        toast.success('Élimination enregistrée');
        if (data.elimination?.id) setLastAction({ type: 'elimination', eliminationId: data.elimination.id, playerName: pName ? getPlayerName(pName.player) : '?' });
        refetch();
        onUpdate?.();
        setEliminationDialog(null);
        setEliminationKiller('');
        setFabDialogOpen(false);
        setFabEliminated('');
        setFabKiller('');
        setSelectedPlayerAction(null);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de l\'élimination');
      }
    } catch {
      toast.error('Erreur lors de l\'élimination');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbandon = async (playerId: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/eliminations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminatedId: playerId,
          isAbandonment: true,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Abandon enregistré (rang #${data.elimination.rank})`);
        if (data.elimination?.id) {
          const pName = players.find((p) => p.playerId === playerId);
          setLastAction({ type: 'elimination', eliminationId: data.elimination.id, playerName: pName ? getPlayerName(pName.player) : '?' });
        }
        refetch();
        onUpdate?.();
        setAbandonDialog(null);
        setSelectedPlayerAction(null);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de l\'abandon');
      }
    } catch {
      toast.error('Erreur lors de l\'abandon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBustRecave = async (bustId: string) => {
    setBustRecaveSubmitting(bustId);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/busts/${bustId}/recave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const bust = busts.find((b) => b.id === bustId);
        toast.success('Recave appliquée');
        if (bust) setLastAction({ type: 'recave', bustId, playerName: getPlayerName(bust.eliminated.player) });
        refetch();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur recave');
      }
    } catch {
      toast.error('Erreur recave');
    } finally {
      setBustRecaveSubmitting(null);
    }
  };

  const handleBustEliminate = async (bust: BustEvent) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/eliminations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminatedId: bust.eliminated.playerId,
          eliminatorId: bust.killer?.player?.id || undefined,
          forceDuringRecave: true,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success('Joueur éliminé');
        if (data.elimination?.id) setLastAction({ type: 'elimination', eliminationId: data.elimination.id, playerName: getPlayerName(bust.eliminated.player) });
        refetch();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur élimination');
      }
    } catch {
      toast.error('Erreur élimination');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Part G — Undo
  const handleUndo = async () => {
    if (!lastAction) return;
    setIsSubmitting(true);
    try {
      let response: Response;
      if (lastAction.type === 'bust') {
        response = await fetch(`/api/tournaments/${tournamentId}/busts/last`, { method: 'DELETE' });
      } else if (lastAction.type === 'recave') {
        response = await fetch(`/api/tournaments/${tournamentId}/busts/${lastAction.bustId}/recave`, { method: 'DELETE' });
      } else {
        response = await fetch(`/api/tournaments/${tournamentId}/eliminations/${lastAction.eliminationId}`, { method: 'DELETE' });
      }
      if (response.ok) {
        toast.success('Action annulée');
        setLastAction(null);
        refetch();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur annulation');
      }
    } catch {
      toast.error('Erreur annulation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Part C — Timer toggle
  const handleTimerToggle = async () => {
    setTimerPressed(true);
    setTimeout(() => setTimerPressed(false), 200);
    try {
      const endpoint = timer?.isPaused
        ? `/api/tournaments/${tournamentId}/timer/resume`
        : `/api/tournaments/${tournamentId}/timer/pause`;
      const response = await fetch(endpoint, { method: 'POST' });
      if (response.ok) {
        refetch();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur timer');
      }
    } catch {
      toast.error('Erreur timer');
    }
  };

  // Part B — Move player
  const handleMovePlayer = async () => {
    if (!moveDialog || !moveToTable || !moveToSeat) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables/move-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: moveDialog.playerId,
          toTable: parseInt(moveToTable),
          toSeat: parseInt(moveToSeat),
        }),
      });
      if (response.ok) {
        toast.success(`${moveDialog.playerName} déplacé à T${moveToTable} S${moveToSeat}`);
        setMoveDialog(null);
        setMoveToTable('');
        setMoveToSeat('');
        refetch();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur déplacement');
      }
    } catch {
      toast.error('Erreur déplacement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Part B — Merge tables
  const handleMerge = async () => {
    if (!mergeTableToClose) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableToClose: parseInt(mergeTableToClose) }),
      });
      if (response.ok) {
        const data = await response.json();
        toast.success(`Table ${mergeTableToClose} fermée, ${data.movements?.length || 0} joueur(s) déplacé(s)`);
        setMergeDialogOpen(false);
        setMergeTableToClose('');
        refetch();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur fusion');
      }
    } catch {
      toast.error('Erreur fusion');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Part B — Rebalance
  const handleRebalance = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables/auto-rebalance`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.skipped) {
          toast.info(data.reason || 'Redistribution non nécessaire');
        } else {
          toast.success(`${data.totalMoves || 0} joueur(s) redistribué(s)`);
        }
        setRebalanceConfirm(false);
        refetch();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur redistribution');
      }
    } catch {
      toast.error('Erreur redistribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Part F — Fetch all players for late registration
  const fetchAllPlayers = useCallback(async () => {
    setAllPlayersLoading(true);
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setAllPlayers(data);
      }
    } catch {
      console.error('Error fetching all players');
    } finally {
      setAllPlayersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lateRegOpen) fetchAllPlayers();
  }, [lateRegOpen, fetchAllPlayers]);

  const enrolledPlayerIds = new Set(players.map((p) => p.playerId));
  const availablePlayers = allPlayers.filter((p) => !enrolledPlayerIds.has(p.id));

  // Part F — Late registration
  const handleLateRegister = async () => {
    if (!lateRegPlayerId) return;
    setIsSubmitting(true);
    try {
      // 1. Enroll player
      const enrollRes = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: lateRegPlayerId }),
      });
      if (!enrollRes.ok) {
        const data = await enrollRes.json();
        toast.error(data.error || 'Erreur inscription');
        return;
      }

      // 2. Find least full table and first free seat
      let bestTable: TablePlan | null = null;
      let bestFreeCount = 0;
      for (const t of tables) {
        const freeCount = seatsPerTable - t.seats.filter((s) => !s.isEliminated).length;
        if (freeCount > bestFreeCount) {
          bestFreeCount = freeCount;
          bestTable = t;
        }
      }

      if (bestTable && bestFreeCount > 0) {
        const freeSeats = getFreeSeatNumbers(bestTable.tableNumber);
        if (freeSeats.length > 0) {
          await fetch(`/api/tournaments/${tournamentId}/tables/move-player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: lateRegPlayerId,
              toTable: bestTable.tableNumber,
              toSeat: freeSeats[0],
            }),
          });
          const p = allPlayers.find((ap) => ap.id === lateRegPlayerId);
          toast.success(`${p ? getPlayerName(p) : 'Joueur'} inscrit et placé à Table ${bestTable.tableNumber}, Siège ${freeSeats[0]}`);
        }
      } else {
        toast.success('Joueur inscrit (aucune place libre, assignez manuellement)');
      }

      setLateRegOpen(false);
      setLateRegPlayerId('');
      refetch();
      onUpdate?.();
    } catch {
      toast.error('Erreur inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get player actions available for a given player
  const getPlayerActions = (player: TournamentPlayer, tableNumber: number) => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
      action: () => void;
      condition: boolean;
    }> = [];

    if (player.finalRank !== null) return actions;

    // Bust (during rebuy period)
    if (canBust) {
      actions.push({
        label: 'Bust',
        icon: <Skull className="h-4 w-4" />,
        variant: 'destructive',
        action: () => {
          setBustDialog({
            eliminatedId: player.playerId,
            playerName: getPlayerName(player.player),
          });
          setBustKiller('');
        },
        condition: true,
      });
    }

    // Eliminate (after rebuy period)
    if (!canBust && activePlayers.length > 1) {
      actions.push({
        label: 'Éliminer',
        icon: <Target className="h-4 w-4" />,
        variant: 'destructive',
        action: () => {
          setEliminationDialog({
            eliminatedId: player.playerId,
            playerName: getPlayerName(player.player),
          });
          setEliminationKiller('');
        },
        condition: true,
      });
    }

    // Move (Part B)
    actions.push({
      label: 'Déplacer',
      icon: <ArrowRightLeft className="h-4 w-4" />,
      variant: 'outline',
      action: () => {
        setMoveDialog({
          playerId: player.playerId,
          playerName: getPlayerName(player.player),
          fromTable: tableNumber,
        });
        setMoveToTable('');
        setMoveToSeat('');
        setSelectedPlayerAction(null);
      },
      condition: true,
    });

    // Abandon (always available if active and more than 1 player)
    if (activePlayers.length > 1) {
      actions.push({
        label: 'Abandon',
        icon: <LogOut className="h-4 w-4" />,
        variant: 'outline',
        action: () => {
          setAbandonDialog({
            playerId: player.playerId,
            playerName: getPlayerName(player.player),
          });
        },
        condition: true,
      });
    }

    return actions.filter((a) => a.condition);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* A. Header sticky — Timer compact + Stats */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b pb-3 -mx-1 px-1 pt-1">
        <SectionCard variant="ink" noPadding className="p-3">
          <div className="flex items-center gap-3">
            {/* Circular timer — clickable for pause/play (Part C) */}
            <button
              onClick={handleTimerToggle}
              className={`shrink-0 transition-transform ${timerPressed ? 'scale-90' : 'scale-100'} cursor-pointer`}
              title={timer?.isPaused ? 'Reprendre' : 'Pause'}
            >
              <div className="relative">
                <CircularTimer
                  timeRemaining={timer?.isRunning || timer?.isPaused ? timeRemaining : null}
                  totalDuration={totalDuration}
                  size={56}
                  strokeWidth={5}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {timer?.isPaused ? (
                    <Play className="h-4 w-4 text-ink-foreground/60" />
                  ) : (
                    <Pause className="h-4 w-4 text-ink-foreground/40 opacity-0 hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </div>
            </button>

            {/* Timer info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-mono text-2xl font-bold cursor-pointer"
                  onClick={handleTimerToggle}
                >
                  {formatTime(timeRemaining)}
                </span>
                {timer?.currentLevelData && (
                  <Badge variant="outline" className="text-xs">
                    Niv. {timer.currentLevelData.level}
                  </Badge>
                )}
                {timer?.isPaused && (
                  <Badge variant="secondary" className="text-xs">Pause</Badge>
                )}
                {timer?.recavesOpen && !timer?.isVoluntaryRebuyPeriod && (
                  <Badge className="text-xs bg-green-600 hover:bg-green-700">Recaves ouvertes</Badge>
                )}
                {timer?.isVoluntaryRebuyPeriod && (
                  <Badge className="text-xs bg-amber-600 hover:bg-amber-700">Pause fin recave</Badge>
                )}
              </div>
              {timer?.currentLevelData && (
                <div className="text-sm text-ink-foreground/70 mt-0.5">
                  SB {timer.currentLevelData.smallBlind.toLocaleString()} / BB {timer.currentLevelData.bigBlind.toLocaleString()}
                  {timer.currentLevelData.ante > 0 && ` / Ante ${timer.currentLevelData.ante.toLocaleString()}`}
                </div>
              )}
              {/* Part E — Next break */}
              {nextBreakInfo && (
                <div className="text-xs text-ink-foreground/50 flex items-center gap-1 mt-0.5">
                  <Coffee className="h-3 w-3" />
                  {nextBreakInfo.label}
                </div>
              )}
            </div>

            {/* Quick stats — Desktop (Part D + H) */}
            <div className="hidden sm:flex items-center gap-3 text-sm shrink-0">
              {/* Part H — Player status counter */}
              <div className="text-center">
                <div className="font-bold text-lg text-green-600">{activePlayers.length}</div>
                <div className="text-ink-foreground/70 text-xs">actifs</div>
              </div>
              {truePendingBusts.length > 0 && (
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-500">{truePendingBusts.length}</div>
                  <div className="text-ink-foreground/70 text-xs">en attente</div>
                </div>
              )}
              <div className="text-center">
                <div className="font-bold text-lg text-muted-foreground">{eliminatedPlayers.length}</div>
                <div className="text-ink-foreground/70 text-xs">éliminés</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{totalRebuys}</div>
                <div className="text-ink-foreground/70 text-xs">rebuys</div>
              </div>
              {/* Part D — Pot total */}
              <div className="text-center">
                <div className="font-bold text-lg">{potTotal}€</div>
                <div className="text-ink-foreground/70 text-xs">pot</div>
              </div>
            </div>

            {/* Header action buttons */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              {/* Part G — Undo */}
              {lastAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={handleUndo}
                  disabled={isSubmitting}
                  title={`Annuler : ${lastAction.type === 'bust' ? 'Bust' : lastAction.type === 'recave' ? 'Recave' : 'Élim'} de ${lastAction.playerName}`}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}
              {/* Part F — Late registration */}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => setLateRegOpen(true)}
                title="Inscrire un joueur"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
              {/* Part B — Merge */}
              {tables.length >= 2 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs"
                  onClick={() => { setMergeDialogOpen(true); setMergeTableToClose(''); }}
                  title="Fusionner tables"
                >
                  <Merge className="h-4 w-4" />
                </Button>
              )}
              {/* Part B — Rebalance */}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-xs"
                onClick={() => setRebalanceConfirm(true)}
                title="Redistribuer"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mobile-only stats row (Part H + D) */}
          <div className="sm:hidden flex items-center justify-around mt-2 pt-2 border-t border-ink-foreground/20 text-xs">
            <div className="text-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-0.5" />
              <span className="font-bold">{activePlayers.length}</span>
            </div>
            {truePendingBusts.length > 0 && (
              <div className="text-center">
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-0.5" />
                <span className="font-bold">{truePendingBusts.length}</span>
              </div>
            )}
            <div className="text-center">
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-0.5" />
              <span className="font-bold">{eliminatedPlayers.length}</span>
            </div>
            <div className="text-center">
              <RefreshCw className="h-3 w-3 mx-auto mb-0.5 text-ink-foreground/70" />
              <span className="font-bold">{totalRebuys}</span>
            </div>
            <div className="text-center">
              <Coins className="h-3 w-3 mx-auto mb-0.5 text-ink-foreground/70" />
              <span className="font-bold">{potTotal}€</span>
            </div>
          </div>

          {/* Mobile action bar — touch-friendly 44px min buttons with labels */}
          <div className="sm:hidden flex items-center justify-around mt-2 pt-2 border-t border-ink-foreground/20 gap-1">
            {lastAction && (
              <button
                className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-md hover:bg-ink-foreground/10 px-2 py-1"
                onClick={handleUndo}
                disabled={isSubmitting}
              >
                <Undo2 className="h-5 w-5 text-ink-foreground/70" />
                <span className="text-[10px] text-ink-foreground/60">Annuler</span>
              </button>
            )}
            <button
              className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-md hover:bg-ink-foreground/10 px-2 py-1"
              onClick={() => setLateRegOpen(true)}
            >
              <UserPlus className="h-5 w-5 text-ink-foreground/70" />
              <span className="text-[10px] text-ink-foreground/60">Inscrire</span>
            </button>
            {tables.length >= 2 && (
              <button
                className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-md hover:bg-ink-foreground/10 px-2 py-1"
                onClick={() => { setMergeDialogOpen(true); setMergeTableToClose(''); }}
              >
                <Merge className="h-5 w-5 text-ink-foreground/70" />
                <span className="text-[10px] text-ink-foreground/60">Fusionner</span>
              </button>
            )}
            <button
              className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-md hover:bg-ink-foreground/10 px-2 py-1"
              onClick={() => setRebalanceConfirm(true)}
            >
              <Shuffle className="h-5 w-5 text-ink-foreground/70" />
              <span className="text-[10px] text-ink-foreground/60">Équilibrer</span>
            </button>
          </div>
        </SectionCard>
      </div>

      {/* B. Busts en attente */}
      {truePendingBusts.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Skull className="h-5 w-5 text-yellow-600" />
              Busts en attente ({truePendingBusts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {truePendingBusts.map((bust) => (
              <div
                key={bust.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {getPlayerName(bust.eliminated.player)}
                  </div>
                  {bust.killer && (
                    <div className="text-sm text-muted-foreground truncate">
                      par {getPlayerName(bust.killer.player)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="min-h-[36px]"
                    onClick={() => handleBustRecave(bust.id)}
                    disabled={bustRecaveSubmitting === bust.id}
                  >
                    {bustRecaveSubmitting === bust.id ? '...' : 'Recave'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="min-h-[36px]"
                    onClick={() => handleBustEliminate(bust)}
                    disabled={isSubmitting}
                  >
                    Éliminer
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* C. Tables — joueurs groupés par table */}
      {tables.length > 0 ? (
        <>
          {/* Desktop: grid 2 colonnes */}
          <div className="hidden md:grid md:grid-cols-2 gap-4">
            {tables.map((table) => (
              <TableCard
                key={table.tableNumber}
                table={table}
                playerMap={playerMap}
                getPlayerActions={getPlayerActions}
                getPlayerName={getPlayerName}
                onPlayerClick={setSelectedPlayerAction}
                isMobile={false}
              />
            ))}
          </div>

          {/* Mobile: accordion */}
          <div className="md:hidden space-y-2">
            {tables.map((table) => (
              <div key={table.tableNumber}>
                <button
                  onClick={() => setOpenTable(openTable === table.tableNumber ? null : table.tableNumber)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Table {table.tableNumber}</span>
                    <Badge variant="secondary" className="text-xs">
                      {table.activeCount} joueurs
                    </Badge>
                  </div>
                  {openTable === table.tableNumber ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                {openTable === table.tableNumber && (
                  <div className="mt-1 border rounded-lg overflow-hidden">
                    <TableCard
                      table={table}
                      playerMap={playerMap}
                      getPlayerActions={getPlayerActions}
                      getPlayerName={getPlayerName}
                      onPlayerClick={setSelectedPlayerAction}
                      isMobile={true}
                      noWrapper
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune table distribuée
          </CardContent>
        </Card>
      )}

      {/* D. FAB — mobile only, always visible, adapts to context */}
      <div className="md:hidden fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className={`rounded-full h-14 min-w-14 shadow-lg ${
            canBust
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-orange-600 hover:bg-orange-700'
          } flex items-center gap-2 px-4`}
          onClick={() => {
            setFabEliminated('');
            setFabKiller('');
            setFabDialogOpen(true);
          }}
        >
          <Skull className="h-6 w-6" />
          <span className="text-sm font-semibold">
            {canBust ? 'Bust' : 'Élim'}
          </span>
        </Button>
      </div>

      {/* E. Historique récent */}
      {eliminations.length > 0 && (
        <Card>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between p-4"
          >
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Historique récent
            </CardTitle>
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {historyOpen && (
            <CardContent className="pt-0 space-y-2">
              {eliminations.slice(0, 5).map((elim) => (
                <div
                  key={elim.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border text-sm"
                >
                  <div className="min-w-0">
                    {elim.isAbandonment ? (
                      <span>
                        <span className="font-medium">{getPlayerName(elim.eliminated)}</span>
                        {' '}a abandonné
                      </span>
                    ) : (
                      <span>
                        <span className="font-medium">{getPlayerName(elim.eliminated)}</span>
                        {' '}éliminé par{' '}
                        <span className="font-medium">
                          {elim.eliminator ? getPlayerName(elim.eliminator) : '?'}
                        </span>
                      </span>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Rang #{elim.rank} — Niv. {elim.level}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* --- Dialogs --- */}

      {/* FAB Dialog — adapts to context: Bust (recaves) or Élimination */}
      <Dialog open={fabDialogOpen} onOpenChange={setFabDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {canBust ? 'Enregistrer un bust' : 'Enregistrer une élimination'}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez le joueur éliminé et le killer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Joueur éliminé *</label>
              <select
                className="w-full border rounded-md p-2 bg-background min-h-[44px]"
                value={fabEliminated}
                onChange={(e) => {
                  setFabEliminated(e.target.value);
                  setFabKiller('');
                }}
              >
                <option value="">Sélectionner...</option>
                {activePlayers.map((p) => {
                  const info = playerTableMap.get(p.playerId);
                  const suffix = info ? ` (T${info.tableNumber}${info.seatNumber != null ? ` S${info.seatNumber}` : ''})` : '';
                  return (
                    <option key={p.playerId} value={p.playerId}>
                      {getPlayerName(p.player)}{suffix}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {canBust ? 'Tué par *' : 'Éliminé par *'}
              </label>
              <select
                className="w-full border rounded-md p-2 bg-background min-h-[44px]"
                value={fabKiller}
                onChange={(e) => setFabKiller(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {fabEliminated && getKillerOptions(fabEliminated)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFabDialogOpen(false)}>
              Annuler
            </Button>
            {canBust ? (
              <Button
                variant="destructive"
                disabled={!fabEliminated || !fabKiller || isSubmitting}
                onClick={() => handleBust(fabEliminated, fabKiller)}
              >
                {isSubmitting ? '...' : 'Bust'}
              </Button>
            ) : (
              <Button
                variant="destructive"
                disabled={!fabEliminated || !fabKiller || isSubmitting}
                onClick={() => handleElimination(fabEliminated, fabKiller)}
              >
                {isSubmitting ? '...' : 'Éliminer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bust killer selector dialog (inline bust action) */}
      <Dialog
        open={!!bustDialog}
        onOpenChange={(open) => !open && setBustDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bust — {bustDialog?.playerName}</DialogTitle>
            <DialogDescription>Sélectionnez le joueur qui a pris le pot</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1 block">Tué par *</label>
            <select
              className="w-full border rounded-md p-2 bg-background min-h-[44px]"
              value={bustKiller}
              onChange={(e) => setBustKiller(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {bustDialog && getKillerOptions(bustDialog.eliminatedId)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBustDialog(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={!bustKiller || isSubmitting}
              onClick={() => {
                if (bustDialog) {
                  handleBust(bustDialog.eliminatedId, bustKiller);
                  setBustDialog(null);
                }
              }}
            >
              {isSubmitting ? '...' : 'Bust'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Elimination killer selector dialog */}
      <Dialog
        open={!!eliminationDialog}
        onOpenChange={(open) => !open && setEliminationDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Éliminer {eliminationDialog?.playerName}</DialogTitle>
            <DialogDescription>Sélectionnez le joueur éliminateur</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1 block">Éliminé par *</label>
            <select
              className="w-full border rounded-md p-2 bg-background min-h-[44px]"
              value={eliminationKiller}
              onChange={(e) => setEliminationKiller(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {eliminationDialog && getKillerOptions(eliminationDialog.eliminatedId)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminationDialog(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={!eliminationKiller || isSubmitting}
              onClick={() =>
                eliminationDialog && handleElimination(eliminationDialog.eliminatedId, eliminationKiller)
              }
            >
              {isSubmitting ? '...' : 'Éliminer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Abandon confirm dialog */}
      <AlertDialog
        open={!!abandonDialog}
        onOpenChange={(open) => !open && setAbandonDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;abandon</AlertDialogTitle>
            <AlertDialogDescription>
              {abandonDialog?.playerName} va abandonner le tournoi. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
              onClick={() => abandonDialog && handleAbandon(abandonDialog.playerId)}
            >
              {isSubmitting ? '...' : 'Confirmer l\'abandon'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move player dialog (Part B) */}
      <Dialog
        open={!!moveDialog}
        onOpenChange={(open) => !open && setMoveDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déplacer {moveDialog?.playerName}</DialogTitle>
            <DialogDescription>Depuis Table {moveDialog?.fromTable}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Table cible *</label>
              <select
                className="w-full border rounded-md p-2 bg-background min-h-[44px]"
                value={moveToTable}
                onChange={(e) => {
                  setMoveToTable(e.target.value);
                  setMoveToSeat('');
                }}
              >
                <option value="">Sélectionner...</option>
                {tables
                  .filter((t) => t.tableNumber !== moveDialog?.fromTable)
                  .map((t) => (
                    <option key={t.tableNumber} value={t.tableNumber}>
                      Table {t.tableNumber} ({t.activeCount} joueurs)
                    </option>
                  ))}
              </select>
            </div>
            {moveToTable && (
              <div>
                <label className="text-sm font-medium mb-1 block">Siège cible *</label>
                <select
                  className="w-full border rounded-md p-2 bg-background min-h-[44px]"
                  value={moveToSeat}
                  onChange={(e) => setMoveToSeat(e.target.value)}
                >
                  <option value="">Sélectionner...</option>
                  {getFreeSeatNumbers(parseInt(moveToTable)).map((s) => (
                    <option key={s} value={s}>Siège {s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog(null)}>Annuler</Button>
            <Button
              disabled={!moveToTable || !moveToSeat || isSubmitting}
              onClick={handleMovePlayer}
            >
              {isSubmitting ? '...' : 'Déplacer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge tables dialog (Part B) */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fusionner des tables</DialogTitle>
            <DialogDescription>Quelle table fermer ? Les joueurs seront redistribués.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1 block">Table à fermer *</label>
            <select
              className="w-full border rounded-md p-2 bg-background min-h-[44px]"
              value={mergeTableToClose}
              onChange={(e) => setMergeTableToClose(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {tables.map((t) => (
                <option key={t.tableNumber} value={t.tableNumber}>
                  Table {t.tableNumber} ({t.activeCount} joueurs)
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Annuler</Button>
            <Button
              variant="destructive"
              disabled={!mergeTableToClose || isSubmitting}
              onClick={handleMerge}
            >
              {isSubmitting ? '...' : 'Fusionner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rebalance confirm (Part B) */}
      <AlertDialog open={rebalanceConfirm} onOpenChange={setRebalanceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redistribuer les joueurs</AlertDialogTitle>
            <AlertDialogDescription>
              Les joueurs seront redistribués équitablement entre les tables. Continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRebalance} disabled={isSubmitting}>
              {isSubmitting ? '...' : 'Redistribuer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Late registration dialog (Part F) */}
      <Dialog open={lateRegOpen} onOpenChange={setLateRegOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inscrire un joueur</DialogTitle>
            <DialogDescription>Late registration — le joueur sera placé automatiquement</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1 block">Joueur *</label>
            {allPlayersLoading ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              <select
                className="w-full border rounded-md p-2 bg-background min-h-[44px]"
                value={lateRegPlayerId}
                onChange={(e) => setLateRegPlayerId(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {availablePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getPlayerName(p)}
                  </option>
                ))}
              </select>
            )}
            {availablePlayers.length === 0 && !allPlayersLoading && (
              <p className="text-sm text-muted-foreground mt-1">Tous les joueurs sont déjà inscrits</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLateRegOpen(false)}>Annuler</Button>
            <Button
              disabled={!lateRegPlayerId || isSubmitting}
              onClick={handleLateRegister}
            >
              {isSubmitting ? '...' : 'Inscrire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile player action dialog */}
      <Dialog
        open={!!selectedPlayerAction}
        onOpenChange={(open) => !open && setSelectedPlayerAction(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selectedPlayerAction && getPlayerName(selectedPlayerAction.player.player)}
            </DialogTitle>
            <DialogDescription>
              Table {selectedPlayerAction?.tableNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {selectedPlayerAction &&
              getPlayerActions(selectedPlayerAction.player, selectedPlayerAction.tableNumber).map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="w-full min-h-[48px] justify-start gap-2"
                  onClick={action.action}
                  disabled={isSubmitting}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            {selectedPlayerAction &&
              getPlayerActions(selectedPlayerAction.player, selectedPlayerAction.tableNumber).length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-2">
                  Aucune action disponible
                </p>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Standalone formatTime for use before component (in computed values)
function formatTimeFn(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// --- Sub-component: TableCard ---

function TableCard({
  table,
  playerMap,
  getPlayerActions,
  getPlayerName,
  onPlayerClick,
  isMobile,
  noWrapper,
}: {
  table: TablePlan;
  playerMap: Map<string, TournamentPlayer>;
  getPlayerActions: (player: TournamentPlayer, tableNumber: number) => Array<{
    label: string;
    icon: React.ReactNode;
    variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    action: () => void;
    condition: boolean;
  }>;
  getPlayerName: (p: { nickname: string; firstName: string; lastName: string }) => string;
  onPlayerClick: (data: { player: TournamentPlayer; tableNumber: number }) => void;
  isMobile: boolean;
  noWrapper?: boolean;
}) {
  const activeSeats = table.seats.filter((s) => !s.isEliminated);

  const content = (
    <div className="divide-y">
      {activeSeats.map((seat) => {
        const tournamentPlayer = playerMap.get(seat.playerId);
        if (!tournamentPlayer) return null;

        const actions = getPlayerActions(tournamentPlayer, table.tableNumber);

        return (
          <div
            key={seat.playerId}
            className="flex items-center justify-between gap-2 px-3 py-2 group hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              {seat.seatNumber != null && (
                <span className="text-xs text-muted-foreground w-5 shrink-0">
                  #{seat.seatNumber}
                </span>
              )}
              <span
                className={`font-medium truncate ${isMobile ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isMobile && actions.length > 0) {
                    onPlayerClick({ player: tournamentPlayer, tableNumber: table.tableNumber });
                  }
                }}
              >
                {getPlayerName(seat)}
              </span>
              {tournamentPlayer.rebuysCount > 0 && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {tournamentPlayer.rebuysCount}R
                </Badge>
              )}
              {tournamentPlayer.eliminationsCount > 0 && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {tournamentPlayer.eliminationsCount}K
                </Badge>
              )}
            </div>

            {/* Desktop: inline actions on hover */}
            {!isMobile && actions.length > 0 && (
              <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                {actions.map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant}
                    className="h-7 px-2 text-xs"
                    onClick={action.action}
                    title={action.label}
                  >
                    {action.icon}
                    <span className="ml-1">{action.label}</span>
                  </Button>
                ))}
              </div>
            )}

            {/* Mobile: tap indicator */}
            {isMobile && actions.length > 0 && (
              <ChevronDown
                className="h-4 w-4 text-muted-foreground shrink-0 cursor-pointer"
                onClick={() =>
                  onPlayerClick({ player: tournamentPlayer, tableNumber: table.tableNumber })
                }
              />
            )}
          </div>
        );
      })}
      {activeSeats.length === 0 && (
        <div className="px-3 py-4 text-sm text-muted-foreground text-center">
          Table vide
        </div>
      )}
    </div>
  );

  if (noWrapper) return content;

  return (
    <Card>
      <CardHeader className="pb-1 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Table {table.tableNumber}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {table.activeCount} joueurs
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {content}
      </CardContent>
    </Card>
  );
}
