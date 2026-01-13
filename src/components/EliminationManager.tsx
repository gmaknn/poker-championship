'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';
import { Skull, Undo2, Trophy, Target, RefreshCw, AlertTriangle } from 'lucide-react';
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
  rebuysCount: number;
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

type BustEvent = {
  id: string;
  level: number;
  createdAt: string;
  eliminated: {
    player: Player;
  };
  killer: {
    player: Player;
  } | null;
};

type Tournament = {
  id: string;
  status: string;
  currentLevel: number;
  rebuyEndLevel: number | null;
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
};

// Fonction utilitaire pour déterminer si les recaves sont ouvertes
function areRecavesOpen(tournament: Tournament | null): boolean {
  if (!tournament) return false;
  if (tournament.status !== 'IN_PROGRESS') return false;
  if (tournament.rebuyEndLevel === null) return true;
  return tournament.currentLevel <= tournament.rebuyEndLevel;
}

export default function EliminationManager({ tournamentId, onUpdate }: Props) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [eliminations, setEliminations] = useState<Elimination[]>([]);
  const [busts, setBusts] = useState<BustEvent[]>([]);
  const [selectedEliminated, setSelectedEliminated] = useState('');
  const [selectedEliminator, setSelectedEliminator] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const recavesOpen = areRecavesOpen(tournament);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      // Récupérer les infos du tournoi
      const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
      if (tournamentResponse.ok) {
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);
      }

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

      // Récupérer les busts
      const bustsResponse = await fetch(`/api/tournaments/${tournamentId}/busts`);
      if (bustsResponse.ok) {
        const bustsData = await bustsResponse.json();
        setBusts(bustsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la soumission d'un bust (pendant période de recaves)
  const handleSubmitBust = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEliminated) {
      setError('Veuillez sélectionner le joueur qui a perdu son tapis');
      return;
    }

    if (selectedEliminated === selectedEliminator) {
      setError('Un joueur ne peut pas s\'éliminer lui-même');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/busts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eliminatedId: selectedEliminated,
          killerId: selectedEliminator || undefined,
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
      console.error('Error submitting bust:', error);
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gérer la soumission d'une élimination définitive (après période de recaves)
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

      {/* Indicateur état des recaves */}
      {tournament && (
        <SectionCard
          variant="callout"
          icon={recavesOpen ? <RefreshCw className="h-5 w-5 text-amber-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
          title={recavesOpen ? 'Période de recaves' : 'Recaves terminées'}
          description={recavesOpen
            ? `Niveau ${tournament.currentLevel}/${tournament.rebuyEndLevel || '∞'}`
            : 'Éliminations définitives'
          }
          noPadding
        />
      )}

      {/* Statistiques */}
      <SectionCard variant="secondary" title="Statistiques">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Trophy className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{activePlayers.length}</div>
            <div className="text-xs text-muted-foreground">Joueurs en jeu</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/30">
            <RefreshCw className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{busts.length}</div>
            <div className="text-xs text-muted-foreground">Busts</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Skull className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{eliminations.length}</div>
            <div className="text-xs text-muted-foreground">Éliminations</div>
          </div>

          <div className="text-center p-3 rounded-lg bg-muted/30">
            <Target className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            {leaderKillerCandidates.length > 0 ? (
              <div className="text-sm font-medium">
                {leaderKillerCandidates.map((playerId) => {
                  const player = players.find((p) => p.playerId === playerId);
                  return (
                    <div key={playerId}>
                      {player?.player.nickname}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">-</div>
            )}
            <div className="text-xs text-muted-foreground">Leader Killer</div>
          </div>
        </div>
      </SectionCard>

      {/* Formulaire bust ou élimination selon l'état des recaves */}
      {recavesOpen ? (
        /* Formulaire de bust (période de recaves) */
        <SectionCard
          variant="primary"
          title="Enregistrer une perte de tapis"
          description="Le joueur pourra faire une recave pour continuer"
          icon={<RefreshCw className="h-5 w-5 text-amber-500" />}
        >
          <form onSubmit={handleSubmitBust} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Joueur qui a perdu */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Joueur qui a perdu son tapis</label>
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
                      {p.rebuysCount > 0 && ` - ${p.rebuysCount} recave(s)`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Killer (optionnel) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pris par (optionnel)</label>
                <select
                  value={selectedEliminator}
                  onChange={(e) => setSelectedEliminator(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  disabled={isSubmitting}
                >
                  <option value="">Non spécifié</option>
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

            <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              Enregistrer le bust
            </Button>
          </form>
        </SectionCard>
      ) : (
        /* Formulaire d'élimination définitive */
        <SectionCard
          variant="primary"
          title="Enregistrer une élimination"
          description="Élimination définitive - le joueur est sorti du tournoi"
          icon={<Skull className="h-5 w-5 text-red-500" />}
        >
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

            <Button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700">
              <Skull className="mr-2 h-4 w-4" />
              Enregistrer l'élimination
            </Button>
          </form>
        </SectionCard>
      )}

      {/* Historique des busts */}
      {busts.length > 0 && (
        <SectionCard
          variant="secondary"
          title={`Historique des busts (${busts.length})`}
          icon={<RefreshCw className="h-5 w-5 text-amber-500" />}
        >
          <div className="space-y-3">
            {busts.map((bust, index) => (
              <div
                key={bust.id}
                className={`flex items-center justify-between p-4 rounded-lg border border-amber-500/40 ${
                  index === 0 ? 'bg-amber-500/10' : 'bg-amber-500/5'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      Bust
                    </Badge>
                    <span className="font-medium truncate">
                      {bust.eliminated.player.firstName} {bust.eliminated.player.lastName}
                    </span>
                    <span className="text-muted-foreground">
                      ({bust.eliminated.player.nickname})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1.5">
                    {bust.killer ? (
                      <>
                        Pris par{' '}
                        <span className="font-medium text-foreground">
                          {bust.killer.player.nickname}
                        </span>
                        {' '}au niveau {bust.level}
                      </>
                    ) : (
                      <>Killer non spécifié, niveau {bust.level}</>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                  {format(new Date(bust.createdAt), 'HH:mm', { locale: fr })}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Historique des éliminations */}
      <SectionCard
        variant="primary"
        title="Historique des éliminations"
        icon={<Skull className="h-5 w-5" />}
        actions={
          eliminations.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelLastElimination}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Annuler la dernière
            </Button>
          )
        }
      >
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
      </SectionCard>

      {/* Joueurs éliminés */}
      {eliminatedPlayers.length > 0 && (
        <SectionCard
          variant="secondary"
          title={`Joueurs éliminés (${eliminatedPlayers.length})`}
        >
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
        </SectionCard>
      )}
    </div>
  );
}
