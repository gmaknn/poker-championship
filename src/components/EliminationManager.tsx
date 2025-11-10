'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skull, Undo2, Trophy, Target } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
};

type TournamentPlayer = {
  id: string;
  playerId: string;
  finalRank: number | null;
  eliminationsCount: number;
  leaderKills: number;
  player: Player;
};

type Elimination = {
  id: string;
  rank: number;
  level: number;
  isLeaderKill: boolean;
  createdAt: string;
  eliminated: Player;
  eliminator: Player;
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
};

export default function EliminationManager({ tournamentId, onUpdate }: Props) {
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [eliminations, setEliminations] = useState<Elimination[]>([]);
  const [selectedEliminated, setSelectedEliminated] = useState('');
  const [selectedEliminator, setSelectedEliminator] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      // Récupérer les joueurs inscrits
      const playersResponse = await fetch(`/api/tournaments/${tournamentId}/players`);
      if (playersResponse.ok) {
        const playersData = await playersResponse.json();
        setPlayers(playersData);
      }

      // Récupérer les éliminations
      const eliminationsResponse = await fetch(
        `/api/tournaments/${tournamentId}/eliminations`
      );
      if (eliminationsResponse.ok) {
        const eliminationsData = await eliminationsResponse.json();
        setEliminations(eliminationsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitElimination = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEliminated || !selectedEliminator) {
      setError('Veuillez sélectionner le joueur éliminé et l\'éliminateur');
      return;
    }

    if (selectedEliminated === selectedEliminator) {
      setError('Un joueur ne peut pas s\'éliminer lui-même');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/eliminations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminatedId: selectedEliminated,
          eliminatorId: selectedEliminator,
        }),
      });

      if (response.ok) {
        setSelectedEliminated('');
        setSelectedEliminator('');
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Error submitting elimination:', error);
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLastElimination = async () => {
    if (eliminations.length === 0) return;

    if (!confirm('Voulez-vous vraiment annuler la dernière élimination ?')) {
      return;
    }

    try {
      const lastElimination = eliminations[0];
      const response = await fetch(
        `/api/tournaments/${tournamentId}/eliminations/${lastElimination.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'annulation');
      }
    } catch (error) {
      console.error('Error canceling elimination:', error);
      alert('Erreur lors de l\'annulation');
    }
  };

  const activePlayers = players.filter((p) => p.finalRank === null);
  const eliminatedPlayers = players.filter((p) => p.finalRank !== null);

  const getLeaderKillerCandidates = () => {
    const counts = new Map<string, number>();
    activePlayers.forEach((p) => {
      counts.set(p.playerId, p.eliminationsCount);
    });
    const maxElims = Math.max(...Array.from(counts.values()), 0);
    return Array.from(counts.entries())
      .filter(([_, count]) => count === maxElims && maxElims > 0)
      .map(([playerId]) => playerId);
  };

  const leaderKillerCandidates = getLeaderKillerCandidates();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Joueurs en jeu</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlayers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éliminations</CardTitle>
            <Skull className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eliminations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leader Killer</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {leaderKillerCandidates.length > 0 ? (
              <div className="text-sm">
                {leaderKillerCandidates.map((playerId) => {
                  const player = players.find((p) => p.playerId === playerId);
                  return (
                    <div key={playerId} className="font-medium">
                      {player?.player.nickname}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aucun</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Formulaire d'élimination */}
      <Card>
        <CardHeader>
          <CardTitle>Enregistrer une élimination</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitElimination} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Joueur éliminé */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Joueur éliminé</label>
                <select
                  value={selectedEliminated}
                  onChange={(e) => setSelectedEliminated(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  disabled={isSubmitting}
                >
                  <option value="">Sélectionner...</option>
                  {activePlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.player.firstName} {p.player.lastName} ({p.player.nickname})
                    </option>
                  ))}
                </select>
              </div>

              {/* Éliminateur */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Éliminé par</label>
                <select
                  value={selectedEliminator}
                  onChange={(e) => setSelectedEliminator(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  disabled={isSubmitting}
                >
                  <option value="">Sélectionner...</option>
                  {activePlayers
                    .filter((p) => p.playerId !== selectedEliminated)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.player.firstName} {p.player.lastName} ({p.player.nickname})
                        {p.eliminationsCount > 0 && ` - ${p.eliminationsCount} élim.`}
                        {leaderKillerCandidates.includes(p.playerId) && ' 👑'}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              <Skull className="mr-2 h-4 w-4" />
              Enregistrer l'élimination
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Historique des éliminations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historique des éliminations</CardTitle>
          {eliminations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelLastElimination}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Annuler la dernière
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {eliminations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune élimination enregistrée
            </p>
          ) : (
            <div className="space-y-3">
              {eliminations.map((elim, index) => (
                <div
                  key={elim.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    index === 0 ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{elim.rank}</Badge>
                      <span className="font-medium">
                        {elim.eliminated.firstName} {elim.eliminated.lastName}
                      </span>
                      <span className="text-muted-foreground">
                        ({elim.eliminated.nickname})
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Éliminé par{' '}
                      <span className="font-medium">
                        {elim.eliminator.nickname}
                      </span>{' '}
                      au niveau {elim.level}
                      {elim.isLeaderKill && (
                        <Badge variant="default" className="ml-2">
                          Leader Kill
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(elim.createdAt), 'HH:mm', { locale: fr })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Joueurs éliminés */}
      {eliminatedPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Joueurs éliminés ({eliminatedPlayers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eliminatedPlayers
                .sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0))
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{p.finalRank}</Badge>
                      <span>
                        {p.player.firstName} {p.player.lastName}
                      </span>
                      <span className="text-muted-foreground">
                        ({p.player.nickname})
                      </span>
                    </div>
                    {p.eliminationsCount > 0 && (
                      <Badge variant="secondary">
                        {p.eliminationsCount} élim.
                      </Badge>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
