'use client';

import { useState, useEffect, useCallback, use } from 'react';
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
import { ArrowLeft, Flame, Skull, Users, Loader2 } from 'lucide-react';
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

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'bust' | 'elim'>('bust');
  const [selectedPlayer, setSelectedPlayer] = useState<TableAssignment | null>(null);
  const [selectedKillerId, setSelectedKillerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Check auth
  useEffect(() => {
    fetch('/api/me')
      .then(res => {
        if (!res.ok) {
          router.push('/login');
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          const role = data.role;
          const additionalRoles = data.additionalRoles || [];
          const allRoles = [role, ...additionalRoles];
          const allowed = allRoles.some((r: string) =>
            ['ADMIN', 'TOURNAMENT_DIRECTOR', 'ANIMATOR'].includes(r)
          );
          if (!allowed) {
            router.push('/player');
            return;
          }
          setAuthChecked(true);
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

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

      setDialogOpen(false);
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

  return (
    <div className="min-h-screen bg-background">
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
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" className="text-xs">
                <Users className="mr-1 h-3 w-3" />
                {activePlayers.length} actif{activePlayers.length > 1 ? 's' : ''}
              </Badge>
              {tournament?.status === 'IN_PROGRESS' && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  En cours
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
              {tournament?.status === 'IN_PROGRESS' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 h-14 text-lg bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => openDialog(assignment, 'bust')}
                  >
                    <Flame className="mr-2 h-5 w-5" />
                    BUST
                  </Button>
                  <Button
                    className="flex-1 h-14 text-lg bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => openDialog(assignment, 'elim')}
                  >
                    <Skull className="mr-2 h-5 w-5" />
                    ELIM
                  </Button>
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

        {/* Eliminated players */}
        {eliminatedPlayers.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Joueurs eliminés ({eliminatedPlayers.length})
              </p>
            </div>
            {eliminatedPlayers.map((assignment) => {
              const player = getPlayerFullInfo(assignment);
              const avatarSrc = getPlayerAvatar(assignment.playerId);

              return (
                <div
                  key={assignment.id}
                  className="border rounded-xl p-4 bg-muted/30 opacity-60"
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
                    <Badge variant="secondary" className="text-xs">
                      Eliminé
                    </Badge>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Bust/Elim Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'bust' ? 'Perte de tapis (Bust)' : 'Elimination définitive'}
            </DialogTitle>
            <DialogDescription>
              Qui a éliminé {selectedPlayer && getPlayerFullInfo(selectedPlayer)?.nickname} ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {dialogType === 'bust' ? 'Killer' : 'Eliminateur'}
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
    </div>
  );
}
