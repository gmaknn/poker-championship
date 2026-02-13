'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Flame, Skull, Users, Loader2, RotateCcw, Shield } from 'lucide-react';
import { normalizeAvatarSrc } from '@/lib/utils';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatar: string | null;
};

type TableAssignment = {
  id: string;
  playerId: string;
  tableNumber: number;
  seatNumber: number | null;
  isActive: boolean;
  isTableDirector?: boolean;
  player?: Player;
  isEliminated?: boolean;
};

type TableData = {
  tableNumber: number;
  players: TableAssignment[];
  activePlayers: number;
  totalPlayers: number;
};

type Tournament = {
  id: string;
  name: string;
  status: string;
};

type TimerState = {
  recavesOpen: boolean;
  isVoluntaryRebuyPeriod: boolean;
};

type BustEvent = {
  id: string;
  eliminatedId: string;
  killerId: string;
  eliminated: {
    playerId: string;
    player: { nickname: string };
  };
};

export default function DirectorTablePage({
  params,
}: {
  params: Promise<{ tournamentId: string; tableNumber: string }>;
}) {
  const { tournamentId, tableNumber: tableNumberStr } = use(params);
  const tableNumber = parseInt(tableNumberStr, 10);
  const router = useRouter();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [playersMap, setPlayersMap] = useState<Map<string, Player>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [isPlayerTableDirector, setIsPlayerTableDirector] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>({
    recavesOpen: true,
    isVoluntaryRebuyPeriod: false,
  });
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'bust' | 'elim'>('bust');
  const [selectedPlayer, setSelectedPlayer] = useState<TableAssignment | null>(null);
  const [selectedKillerId, setSelectedKillerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Recave dialog state (shown after bust)
  const [recaveDialogOpen, setRecaveDialogOpen] = useState(false);
  const [lastBustEvent, setLastBustEvent] = useState<BustEvent | null>(null);
  const [recaveSubmitting, setRecaveSubmitting] = useState(false);
  const [recaveError, setRecaveError] = useState('');

  // Check auth - supports Admin/TD/Animator + Player DT de table
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!data) {
          router.push('/login');
          return;
        }

        setCurrentPlayerId(data.id);
        const role = data.role;
        const additionalRoles = data.additionalRoles || [];
        const allRoles = [role, ...additionalRoles];
        const isPrivileged = allRoles.some((r: string) =>
          ['ADMIN', 'TOURNAMENT_DIRECTOR', 'ANIMATOR'].includes(r)
        );

        if (isPrivileged) {
          setAuthChecked(true);
          return;
        }

        // Pour un PLAYER : vérifier s'il est DT de cette table
        const tablesRes = await fetch(`/api/tournaments/${tournamentId}/tables`);
        if (!tablesRes.ok) {
          router.push('/player');
          return;
        }
        const tablesData = await tablesRes.json();
        const foundTable = tablesData.tables?.find(
          (t: TableData) => t.tableNumber === tableNumber
        );

        if (!foundTable) {
          router.push('/player');
          return;
        }

        const isDT = foundTable.players.some(
          (p: TableAssignment) => p.playerId === data.id && p.isTableDirector
        );

        if (isDT) {
          setIsPlayerTableDirector(true);
          setAuthChecked(true);
        } else {
          router.push('/player');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router, tournamentId, tableNumber]);

  // Poll timer state
  const fetchTimerState = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/timer`);
      if (res.ok) {
        const data = await res.json();
        setTimerState({
          recavesOpen: data.recavesOpen ?? true,
          isVoluntaryRebuyPeriod: data.isVoluntaryRebuyPeriod ?? false,
        });
      }
    } catch {
      // Silently ignore timer polling errors
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!authChecked || !tournament || tournament.status !== 'IN_PROGRESS') return;

    // Fetch immediately
    fetchTimerState();

    // Poll every 10 seconds
    timerIntervalRef.current = setInterval(fetchTimerState, 10000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [authChecked, tournament, fetchTimerState]);

  const fetchData = useCallback(async () => {
    try {
      const [tournamentRes, tablesRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}`),
        fetch(`/api/tournaments/${tournamentId}/tables`),
      ]);

      if (!tournamentRes.ok) {
        setError('Tournoi introuvable');
        setLoading(false);
        return;
      }

      const tournamentData = await tournamentRes.json();
      setTournament({
        id: tournamentData.id,
        name: tournamentData.name || 'Tournoi',
        status: tournamentData.status,
      });

      if (!tablesRes.ok) {
        setError('Tables non disponibles');
        setLoading(false);
        return;
      }

      const tablesData = await tablesRes.json();
      const foundTable = tablesData.tables?.find(
        (t: TableData) => t.tableNumber === tableNumber
      );

      if (!foundTable) {
        setError(`Table ${tableNumber} introuvable`);
        setLoading(false);
        return;
      }

      // Fetch all players to get avatars
      const playersRes = await fetch('/api/players');
      if (playersRes.ok) {
        const allPlayers = await playersRes.json();
        const map = new Map<string, Player>();
        for (const p of allPlayers) {
          map.set(p.id, {
            id: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            nickname: p.nickname,
            avatar: p.avatar,
          });
        }
        setPlayersMap(map);
      }

      setTable(foundTable);
      setError('');
    } catch (err) {
      console.error('Error loading table data:', err);
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [tournamentId, tableNumber]);

  useEffect(() => {
    if (authChecked) {
      fetchData();
    }
  }, [authChecked, fetchData]);

  const getPlayerAvatar = (playerId: string) => {
    const player = playersMap.get(playerId);
    return normalizeAvatarSrc(player?.avatar);
  };

  const getPlayerFullInfo = (assignment: TableAssignment) => {
    const player = playersMap.get(assignment.playerId) || assignment.player;
    return player;
  };

  const activePlayers = table?.players.filter(p => !p.isEliminated) || [];
  const eliminatedPlayers = table?.players.filter(p => p.isEliminated) || [];

  const openDialog = (assignment: TableAssignment, type: 'bust' | 'elim') => {
    setSelectedPlayer(assignment);
    setDialogType(type);
    setSelectedKillerId('');
    setSubmitError('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedPlayer || !selectedKillerId) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const endpoint = dialogType === 'bust'
        ? `/api/tournaments/${tournamentId}/busts`
        : `/api/tournaments/${tournamentId}/eliminations`;

      const body = dialogType === 'bust'
        ? { eliminatedId: selectedPlayer.playerId, killerId: selectedKillerId }
        : { eliminatedId: selectedPlayer.playerId, eliminatorId: selectedKillerId };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setSubmitError(data.error || 'Erreur lors de l\'enregistrement');
        return;
      }

      const data = await res.json();
      setDialogOpen(false);

      // After a bust, show recave dialog if recaves are open or during voluntary rebuy period
      if (dialogType === 'bust' && data.bustEvent && (timerState.recavesOpen || timerState.isVoluntaryRebuyPeriod)) {
        setLastBustEvent(data.bustEvent);
        setRecaveError('');
        setRecaveDialogOpen(true);
      }

      // Refresh table data
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Error submitting:', err);
      setSubmitError('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecave = async (type: 'STANDARD' | 'LIGHT') => {
    if (!lastBustEvent) return;

    setRecaveSubmitting(true);
    setRecaveError('');

    try {
      let res: Response;

      if (type === 'STANDARD') {
        // Standard recave via bust recave endpoint
        res = await fetch(
          `/api/tournaments/${tournamentId}/busts/${lastBustEvent.id}/recave`,
          { method: 'POST' }
        );
      } else {
        // Light rebuy via rebuys endpoint
        res = await fetch(
          `/api/tournaments/${tournamentId}/rebuys`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: lastBustEvent.eliminated.playerId,
              type: 'LIGHT',
            }),
          }
        );
      }

      if (!res.ok) {
        const data = await res.json();
        setRecaveError(data.error || 'Erreur lors de la recave');
        return;
      }

      setRecaveDialogOpen(false);
      setLastBustEvent(null);

      // Refresh table data
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Error recave:', err);
      setRecaveError('Erreur réseau');
    } finally {
      setRecaveSubmitting(false);
    }
  };

  const handleRecaveFromList = async (playerId: string, type: 'STANDARD' | 'LIGHT' = 'STANDARD') => {
    setRecaveSubmitting(true);
    setRecaveError('');

    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/rebuys`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            type,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setRecaveError(data.error || 'Erreur lors de la recave');
        return;
      }

      // Refresh table data
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Error recave from list:', err);
      setRecaveError('Erreur réseau');
    } finally {
      setRecaveSubmitting(false);
    }
  };

  const handleSkipRecave = () => {
    setRecaveDialogOpen(false);
    setLastBustEvent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour
        </Button>
        <div className="text-center py-12">
          <p className="text-destructive text-lg">{error}</p>
        </div>
      </div>
    );
  }

  const isInProgress = tournament?.status === 'IN_PROGRESS';

  return (
    <div className="min-h-screen bg-background">
      {/* Bandeau DT de table */}
      {isPlayerTableDirector && (
        <div className="bg-amber-100 dark:bg-amber-900/40 border-b border-amber-300 dark:border-amber-700 px-4 py-2 flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
          <Shield className="h-4 w-4" />
          Vous êtes Directeur de la Table {tableNumber}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">
              Table {tableNumber} - {tournament?.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="default" className="text-xs">
                <Users className="mr-1 h-3 w-3" />
                {activePlayers.length} actif{activePlayers.length > 1 ? 's' : ''}
              </Badge>
              {isInProgress && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  En cours
                </Badge>
              )}
              {isInProgress && timerState.recavesOpen && !timerState.isVoluntaryRebuyPeriod && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                  Recaves ouvertes
                </Badge>
              )}
              {isInProgress && timerState.isVoluntaryRebuyPeriod && (
                <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                  Pause fin de recaves
                </Badge>
              )}
              {isInProgress && !timerState.recavesOpen && !timerState.isVoluntaryRebuyPeriod && (
                <Badge variant="outline" className="text-xs text-red-600 border-red-600">
                  Recaves fermées
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Player list */}
      <div className="p-4 space-y-3">
        {/* Active players */}
        {activePlayers.map((assignment) => {
          const player = getPlayerFullInfo(assignment);
          const avatarSrc = getPlayerAvatar(assignment.playerId);

          return (
            <div
              key={assignment.id}
              className="border rounded-xl p-4 bg-card"
            >
              <div className="flex items-center gap-3 mb-3">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={player?.nickname || ''}
                    className="w-10 h-10 rounded-full border"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {player?.nickname || 'Joueur inconnu'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {player?.firstName} {player?.lastName}
                  </p>
                </div>
              </div>
              {isInProgress && (
                <div className="flex gap-2">
                  {(timerState.recavesOpen || timerState.isVoluntaryRebuyPeriod) ? (
                    <Button
                      className="flex-1 h-14 text-lg bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => openDialog(assignment, 'bust')}
                    >
                      <Flame className="mr-2 h-5 w-5" />
                      BUST
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => openDialog(assignment, 'elim')}
                    >
                      <Skull className="mr-2 h-5 w-5" />
                      ÉLIM
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {activePlayers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Aucun joueur actif sur cette table
          </div>
        )}

        {/* Busted/Eliminated players */}
        {eliminatedPlayers.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                {(timerState.recavesOpen || timerState.isVoluntaryRebuyPeriod)
                  ? `Joueurs bustés (${eliminatedPlayers.length})`
                  : `Joueurs éliminés (${eliminatedPlayers.length})`
                }
              </p>
            </div>
            {eliminatedPlayers.map((assignment) => {
              const player = getPlayerFullInfo(assignment);
              const avatarSrc = getPlayerAvatar(assignment.playerId);

              return (
                <div
                  key={assignment.id}
                  className="border rounded-xl p-4 bg-muted/30 opacity-80"
                >
                  <div className="flex items-center gap-3">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={player?.nickname || ''}
                        className="w-10 h-10 rounded-full border grayscale"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">
                        {player?.nickname || 'Joueur inconnu'}
                      </p>
                    </div>
                    {timerState.recavesOpen && !timerState.isVoluntaryRebuyPeriod ? (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                        onClick={() => handleRecaveFromList(assignment.playerId)}
                        disabled={recaveSubmitting}
                      >
                        {recaveSubmitting ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3 w-3" />
                        )}
                        Recave
                      </Button>
                    ) : timerState.isVoluntaryRebuyPeriod ? (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleRecaveFromList(assignment.playerId, 'STANDARD')}
                          disabled={recaveSubmitting}
                        >
                          {recaveSubmitting ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          Full
                        </Button>
                        <Button
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={() => handleRecaveFromList(assignment.playerId, 'LIGHT')}
                          disabled={recaveSubmitting}
                        >
                          {recaveSubmitting ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          Light
                        </Button>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Éliminé
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Recave error toast */}
        {recaveError && !recaveDialogOpen && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
            {recaveError}
          </div>
        )}
      </div>

      {/* Bust/Elim Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'bust' ? 'Perte de tapis (Bust)' : 'Élimination définitive'}
            </DialogTitle>
            <DialogDescription>
              Qui a éliminé {selectedPlayer && getPlayerFullInfo(selectedPlayer)?.nickname} ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {dialogType === 'bust' ? 'Killer' : 'Éliminateur'}
              </label>
              <select
                value={selectedKillerId}
                onChange={(e) => setSelectedKillerId(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sélectionner un joueur</option>
                {activePlayers
                  .filter(p => p.playerId !== selectedPlayer?.playerId)
                  .map(p => {
                    const player = getPlayerFullInfo(p);
                    return (
                      <option key={p.playerId} value={p.playerId}>
                        {player?.nickname || 'Joueur inconnu'} ({player?.firstName})
                      </option>
                    );
                  })}
              </select>
            </div>

            {submitError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {submitError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedKillerId || submitting}
              className={dialogType === 'bust'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-red-600 hover:bg-red-700'
              }
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recave Dialog (shown after bust) */}
      <Dialog open={recaveDialogOpen} onOpenChange={(open) => {
        if (!open) handleSkipRecave();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recave</DialogTitle>
            <DialogDescription>
              {lastBustEvent?.eliminated.player.nickname} a perdu son tapis. Souhaite-t-il recaver ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {timerState.isVoluntaryRebuyPeriod ? (
              <>
                {/* Pause fin de recaves : choix Full / Light */}
                <Button
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleRecave('STANDARD')}
                  disabled={recaveSubmitting}
                >
                  {recaveSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-5 w-5" />
                  )}
                  Recave complète (10€)
                </Button>
                <Button
                  className="w-full h-14 text-lg bg-yellow-600 hover:bg-yellow-700 text-white"
                  onClick={() => handleRecave('LIGHT')}
                  disabled={recaveSubmitting}
                >
                  {recaveSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-5 w-5" />
                  )}
                  Recave light (5€)
                </Button>
              </>
            ) : (
              /* Période normale : recave standard uniquement */
              <Button
                className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleRecave('STANDARD')}
                disabled={recaveSubmitting}
              >
                {recaveSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-5 w-5" />
                )}
                Recave (10€)
              </Button>
            )}

            {recaveError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {recaveError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSkipRecave}
              disabled={recaveSubmitting}
            >
              Non, pas de recave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
