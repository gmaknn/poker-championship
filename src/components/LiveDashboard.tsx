'use client';

import { useState, useCallback } from 'react';
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
  Clock,
  Undo2,
  ChevronDown,
  ChevronUp,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { CircularTimer } from '@/components/CircularTimer';
import {
  useLiveDashboardData,
  type TournamentPlayer,
  type BustEvent,
  type TablePlan,
} from '@/hooks/useLiveDashboardData';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type TournamentStatus = 'PLANNED' | 'REGISTRATION' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

type Tournament = {
  id: string;
  name: string | null;
  status: TournamentStatus;
  buyInAmount: number;
  lightRebuyAmount: number;
  startingChips: number;
  totalPlayers?: number | null;
  _count: {
    tournamentPlayers: number;
    blindLevels: number;
  };
};

type Props = {
  tournamentId: string;
  tournament: Tournament;
  onUpdate?: () => void;
};

export default function LiveDashboard({ tournamentId, tournament, onUpdate }: Props) {
  const {
    timer,
    tables,
    players,
    busts,
    eliminations,
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

  // Computed values
  const activePlayers = players.filter((p) => p.finalRank === null);
  const totalPlayers = players.length;
  const totalRebuys = players.reduce((sum, p) => sum + p.rebuysCount, 0);
  const totalEliminations = eliminations.length;
  const pendingBusts = busts.filter((b) => !b.recaveApplied && !players.find(
    (p) => p.playerId === b.eliminated.playerId && p.finalRank !== null
  ));

  // Timer computed
  const timeRemaining = timer?.currentLevelData
    ? Math.max(0, timer.currentLevelData.duration * 60 - localTime)
    : 0;
  const totalDuration = timer?.currentLevelData
    ? timer.currentLevelData.duration * 60
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayerName = (p: { nickname: string; firstName: string; lastName: string }) => {
    return p.nickname || `${p.firstName} ${p.lastName}`;
  };

  // Find which busts are truly pending (not recaved, not eliminated)
  const truePendingBusts = busts.filter((b) => {
    if (b.recaveApplied) return false;
    const player = players.find((p) => p.playerId === b.eliminated.playerId);
    return player && player.finalRank === null;
  });

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
        toast.success('Bust enregistré');
        refetch();
        onUpdate?.();
        setFabDialogOpen(false);
        setFabEliminated('');
        setFabKiller('');
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
        toast.success('Élimination enregistrée');
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
        toast.success('Recave appliquée');
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
        }),
      });
      if (response.ok) {
        toast.success('Joueur éliminé');
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

  const handleCancelLastElimination = async () => {
    if (!eliminations.length) return;
    try {
      const lastElim = eliminations[0];
      const response = await fetch(
        `/api/tournaments/${tournamentId}/eliminations/${lastElim.id}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        toast.success('Élimination annulée');
        refetch();
        onUpdate?.();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur annulation');
      }
    } catch {
      toast.error('Erreur annulation');
    }
  };

  // Get player actions available for a given player
  const getPlayerActions = (player: TournamentPlayer) => {
    const actions: Array<{
      label: string;
      icon: React.ReactNode;
      variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
      action: () => void;
      condition: boolean;
    }> = [];

    if (player.finalRank !== null) return actions;

    // Bust (during rebuy period)
    if (timer?.recavesOpen) {
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
    if (!timer?.recavesOpen && activePlayers.length > 1) {
      actions.push({
        label: 'Éliminer',
        icon: <Target className="h-4 w-4" />,
        variant: 'destructive',
        action: () => {
          setEliminationDialog({
            eliminatedId: player.playerId,
            playerName: getPlayerName(player.player),
          });
        },
        condition: true,
      });
    }

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

  // Build player map for quick lookup
  const playerMap = new Map(players.map((p) => [p.playerId, p]));

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
            {/* Circular timer */}
            <div className="shrink-0">
              <CircularTimer
                timeRemaining={timer?.isRunning || timer?.isPaused ? timeRemaining : null}
                totalDuration={totalDuration}
                size={56}
                strokeWidth={5}
              />
            </div>

            {/* Timer info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-2xl font-bold">
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
                {timer?.recavesOpen && (
                  <Badge className="text-xs bg-green-600 hover:bg-green-700">Recaves ouvertes</Badge>
                )}
              </div>
              {timer?.currentLevelData && (
                <div className="text-sm text-ink-foreground/70 mt-0.5">
                  SB {timer.currentLevelData.smallBlind.toLocaleString()} / BB {timer.currentLevelData.bigBlind.toLocaleString()}
                  {timer.currentLevelData.ante > 0 && ` / Ante ${timer.currentLevelData.ante.toLocaleString()}`}
                </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-4 text-sm shrink-0">
              <div className="text-center">
                <div className="font-bold text-lg">{activePlayers.length}</div>
                <div className="text-ink-foreground/70 text-xs">/ {totalPlayers}</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{totalRebuys}</div>
                <div className="text-ink-foreground/70 text-xs">rebuys</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{totalEliminations}</div>
                <div className="text-ink-foreground/70 text-xs">élims</div>
              </div>
            </div>
          </div>

          {/* Mobile-only stats row */}
          <div className="sm:hidden flex items-center justify-around mt-2 pt-2 border-t border-ink-foreground/20 text-xs">
            <div className="text-center">
              <Users className="h-3 w-3 mx-auto mb-0.5 text-ink-foreground/70" />
              <span className="font-bold">{activePlayers.length}/{totalPlayers}</span>
            </div>
            <div className="text-center">
              <RefreshCw className="h-3 w-3 mx-auto mb-0.5 text-ink-foreground/70" />
              <span className="font-bold">{totalRebuys}</span>
            </div>
            <div className="text-center">
              <Target className="h-3 w-3 mx-auto mb-0.5 text-ink-foreground/70" />
              <span className="font-bold">{totalEliminations}</span>
            </div>
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
            timer?.recavesOpen
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
            {timer?.recavesOpen ? 'Bust' : 'Élim'}
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
              {eliminations.slice(0, 5).map((elim, idx) => (
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
                  {idx === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={handleCancelLastElimination}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  )}
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
              {timer?.recavesOpen ? 'Enregistrer un bust' : 'Enregistrer une élimination'}
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
                onChange={(e) => setFabEliminated(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {activePlayers.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {getPlayerName(p.player)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                {timer?.recavesOpen ? 'Tué par *' : 'Éliminé par *'}
              </label>
              <select
                className="w-full border rounded-md p-2 bg-background min-h-[44px]"
                value={fabKiller}
                onChange={(e) => setFabKiller(e.target.value)}
              >
                <option value="">Sélectionner...</option>
                {activePlayers
                  .filter((p) => p.playerId !== fabEliminated)
                  .map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {getPlayerName(p.player)}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFabDialogOpen(false)}>
              Annuler
            </Button>
            {timer?.recavesOpen ? (
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
              {activePlayers
                .filter((p) => p.playerId !== bustDialog?.eliminatedId)
                .map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {getPlayerName(p.player)}
                  </option>
                ))}
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
              className="w-full border rounded-md p-2 bg-background"
              value={eliminationKiller}
              onChange={(e) => setEliminationKiller(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              {activePlayers
                .filter((p) => p.playerId !== eliminationDialog?.eliminatedId)
                .map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {getPlayerName(p.player)}
                  </option>
                ))}
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
              getPlayerActions(selectedPlayerAction.player).map((action) => (
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
              getPlayerActions(selectedPlayerAction.player).length === 0 && (
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
  getPlayerActions: (player: TournamentPlayer) => Array<{
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

        const actions = getPlayerActions(tournamentPlayer);

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
