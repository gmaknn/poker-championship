'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, UserMinus, Users, Search, DollarSign, Undo2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
};

type TournamentPlayer = {
  id: string;
  tournamentId: string;
  playerId: string;
  hasPaid: boolean;
  rebuysCount: number;
  lightRebuyUsed: boolean;
  player: Player;
  createdAt: string;
};

type Tournament = {
  id: string;
  status: string;
  buyInAmount: number;
};

type Props = {
  tournamentId: string;
  tournament: Tournament;
  onUpdate?: () => void;
};

export default function TournamentPlayersManager({
  tournamentId,
  tournament,
  onUpdate,
}: Props) {
  const [enrolledPlayers, setEnrolledPlayers] = useState<TournamentPlayer[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCancellingRebuy, setIsCancellingRebuy] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  useEffect(() => {
    // Filtrer les joueurs disponibles selon le terme de recherche
    if (searchTerm.trim() === '') {
      setFilteredPlayers(availablePlayers);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredPlayers(
        availablePlayers.filter(
          (player) =>
            player.firstName.toLowerCase().includes(term) ||
            player.lastName.toLowerCase().includes(term) ||
            player.nickname.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, availablePlayers]);

  const fetchData = async () => {
    try {
      // Récupérer les joueurs inscrits
      const enrolledResponse = await fetch(`/api/tournaments/${tournamentId}/players`);
      if (enrolledResponse.ok) {
        const enrolled = await enrolledResponse.json();
        setEnrolledPlayers(enrolled);

        // Récupérer tous les joueurs
        const allPlayersResponse = await fetch('/api/players');
        if (allPlayersResponse.ok) {
          const allPlayers = await allPlayersResponse.json();
          // Filtrer les joueurs non archivés et non inscrits
          const enrolledIds = new Set(enrolled.map((ep: TournamentPlayer) => ep.playerId));
          const available = allPlayers.filter(
            (player: Player & { isArchived?: boolean }) =>
              !player.isArchived && !enrolledIds.has(player.id)
          );
          setAvailablePlayers(available);
          setFilteredPlayers(available);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollPlayers = async () => {
    if (selectedPlayerIds.size === 0) {
      setError('Veuillez sélectionner au moins un joueur');
      return;
    }

    setIsEnrolling(true);
    setError('');

    try {
      const playerIds = Array.from(selectedPlayerIds);
      const response = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds }),
      });

      if (response.ok) {
        setIsEnrollDialogOpen(false);
        setSearchTerm('');
        setSelectedPlayerIds(new Set());
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Error enrolling players:', error);
      setError('Erreur lors de l\'inscription');
    } finally {
      setIsEnrolling(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSelection = new Set(selectedPlayerIds);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else {
      newSelection.add(playerId);
    }
    setSelectedPlayerIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedPlayerIds.size === filteredPlayers.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(filteredPlayers.map(p => p.id)));
    }
  };

  const handleUnenrollPlayer = async (playerId: string) => {
    if (!confirm('Voulez-vous vraiment désinscrire ce joueur ?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/players/${playerId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la désinscription');
      }
    } catch (error) {
      console.error('Error unenrolling player:', error);
      alert('Erreur lors de la désinscription');
    }
  };

  const handleRebuy = async (playerId: string, type: 'STANDARD' | 'LIGHT') => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rebuys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, type }),
      });

      if (response.ok) {
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'enregistrement de la recave');
      }
    } catch (error) {
      console.error('Error processing rebuy:', error);
      alert('Erreur lors de l\'enregistrement de la recave');
    }
  };

  const handleCancelLastRebuy = async () => {
    if (!confirm('Voulez-vous vraiment annuler la dernière recave ?')) {
      return;
    }

    setIsCancellingRebuy(true);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/recaves/last`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'annulation de la recave');
      }
    } catch (error) {
      console.error('Error cancelling rebuy:', error);
      alert('Erreur lors de l\'annulation de la recave');
    } finally {
      setIsCancellingRebuy(false);
    }
  };

  const handleTogglePayment = async (playerId: string, hasPaid: boolean) => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/players/${playerId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hasPaid: !hasPaid }),
        }
      );

      if (response.ok) {
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error toggling payment:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const getTotalBuyIn = (player: TournamentPlayer) => {
    return tournament.buyInAmount * (1 + player.rebuysCount);
  };

  const canUnenroll = tournament.status === 'PLANNED';
  const canRebuy = tournament.status === 'IN_PROGRESS';
  const totalRebuys = enrolledPlayers.reduce((sum, p) => sum + p.rebuysCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats et bouton d'inscription */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{enrolledPlayers.length}</span>
            <span className="text-muted-foreground">
              joueur{enrolledPlayers.length > 1 ? 's' : ''} inscrit{enrolledPlayers.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRebuy && totalRebuys > 0 && (
            <Button
              variant="outline"
              onClick={handleCancelLastRebuy}
              disabled={isCancellingRebuy}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              {isCancellingRebuy ? 'Annulation...' : 'Annuler dernière recave'}
            </Button>
          )}
          <Button onClick={() => setIsEnrollDialogOpen(true)} disabled={tournament.status !== 'PLANNED'}>
            <Plus className="mr-2 h-4 w-4" />
            Inscrire des joueurs
          </Button>
        </div>
      </div>

      {/* Liste des joueurs inscrits */}
      {enrolledPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun joueur inscrit pour le moment
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {enrolledPlayers.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">
                        {enrollment.player.firstName} {enrollment.player.lastName}
                      </h3>
                      {enrollment.player.nickname && (
                        <Badge variant="secondary">{enrollment.player.nickname}</Badge>
                      )}
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={enrollment.hasPaid}
                          onCheckedChange={() =>
                            handleTogglePayment(enrollment.playerId, enrollment.hasPaid)
                          }
                          id={`payment-${enrollment.id}`}
                        />
                        <label
                          htmlFor={`payment-${enrollment.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {enrollment.hasPaid ? '✓ Payé' : 'Non payé'}
                        </label>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-6 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Buy-in:</span> {tournament.buyInAmount}€
                      </div>
                      {enrollment.rebuysCount > 0 && (
                        <div>
                          <span className="font-medium">Recaves:</span> {enrollment.rebuysCount} (
                          {enrollment.rebuysCount * tournament.buyInAmount}€)
                        </div>
                      )}
                      {enrollment.lightRebuyUsed && (
                        <Badge variant="outline">Light rebuy utilisé</Badge>
                      )}
                      <div>
                        <span className="font-medium">Total:</span> {getTotalBuyIn(enrollment)}€
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canRebuy && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRebuy(enrollment.playerId, 'STANDARD')}
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Recave
                        </Button>
                        {!enrollment.lightRebuyUsed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRebuy(enrollment.playerId, 'LIGHT')}
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            Light
                          </Button>
                        )}
                      </>
                    )}
                    {canUnenroll && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnenrollPlayer(enrollment.playerId)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog d'inscription */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inscrire des joueurs</DialogTitle>
            <DialogDescription>
              Sélectionnez un ou plusieurs joueurs à inscrire au tournoi
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un joueur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Liste des joueurs disponibles */}
          <div className="max-h-96 overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchTerm ? 'Aucun joueur trouvé' : 'Tous les joueurs sont déjà inscrits'}
              </div>
            ) : (
              <div className="space-y-2">
                {/* Select All */}
                <div className="flex items-center gap-2 p-2 border-b">
                  <Checkbox
                    checked={selectedPlayerIds.size === filteredPlayers.length && filteredPlayers.length > 0}
                    onCheckedChange={toggleSelectAll}
                    id="select-all"
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Tout sélectionner ({selectedPlayerIds.size}/{filteredPlayers.length})
                  </label>
                </div>

                {/* Player List */}
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    onClick={() => togglePlayerSelection(player.id)}
                    className={`w-full rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent ${
                      selectedPlayerIds.has(player.id) ? 'bg-accent border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedPlayerIds.has(player.id)}
                        onCheckedChange={() => togglePlayerSelection(player.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {player.firstName} {player.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {player.nickname}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEnrollDialogOpen(false);
                setSearchTerm('');
                setSelectedPlayerIds(new Set());
                setError('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleEnrollPlayers}
              disabled={isEnrolling || selectedPlayerIds.size === 0}
            >
              {isEnrolling
                ? 'Inscription...'
                : selectedPlayerIds.size > 0
                ? `Inscrire (${selectedPlayerIds.size})`
                : 'Sélectionner des joueurs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
