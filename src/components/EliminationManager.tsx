'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/ui/section-card';
import { Skull, Undo2, Trophy, Target, RefreshCw, AlertTriangle, Coins, Check } from 'lucide-react';
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
  lightRebuyUsed: boolean;
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
    playerId: string;
    rebuysCount: number;
    player: Player;
  };
  killer: {
    player: Player;
  } | null;
};

type BlindLevel = {
  level: number;
  isBreak: boolean;
};

type Tournament = {
  id: string;
  status: string;
  currentLevel: number;
  rebuyEndLevel: number | null;
  lightRebuyEnabled: boolean;
  lightRebuyAmount: number;
  timerPausedAt: string | null;
  blindLevels: BlindLevel[];
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
};

// Fonction utilitaire pour déterminer si les recaves sont ouvertes
// Utilise le niveau effectif (calculé depuis le timer) au lieu du niveau DB
function areRecavesOpen(tournament: Tournament | null, effectiveLevel: number): boolean {
  if (!tournament) return false;
  if (tournament.status !== 'IN_PROGRESS') return false;
  if (tournament.rebuyEndLevel === null) return true;
  return effectiveLevel <= tournament.rebuyEndLevel;
}

// Fonction utilitaire pour déterminer si la light recave est autorisée
// Conditions: recaves terminées + (timer en pause OU niveau actuel est un break)
function isLightRebuyAllowed(tournament: Tournament | null, effectiveLevel: number): boolean {
  if (!tournament) return false;
  if (tournament.status !== 'IN_PROGRESS') return false;
  if (!tournament.lightRebuyEnabled) return false;

  // Les recaves normales doivent être terminées
  if (tournament.rebuyEndLevel === null || effectiveLevel <= tournament.rebuyEndLevel) {
    return false;
  }

  // Timer en pause OU niveau actuel est un break
  const isPaused = tournament.timerPausedAt !== null;
  const currentBlindLevel = tournament.blindLevels?.find((bl) => bl.level === effectiveLevel);
  const isBreak = currentBlindLevel?.isBreak === true;

  return isPaused || isBreak;
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
  // Niveau effectif calculé depuis le timer (pas la valeur DB qui n'est pas synchronisée)
  const [effectiveLevel, setEffectiveLevel] = useState(1);
  // Light rebuy state
  const [lightRebuyAmount, setLightRebuyAmount] = useState(5);
  const [isLightRebuySubmitting, setIsLightRebuySubmitting] = useState<string | null>(null);
  const [isBustRecaveSubmitting, setIsBustRecaveSubmitting] = useState<string | null>(null);

  const recavesOpen = areRecavesOpen(tournament, effectiveLevel);
  const lightRebuyAvailable = isLightRebuyAllowed(tournament, effectiveLevel);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  // Polling du niveau timer toutes les 10 secondes pour détecter la transition recaves->éliminations
  useEffect(() => {
    if (!tournament || tournament.status !== 'IN_PROGRESS') return;

    const pollTimer = async () => {
      try {
        const timerResponse = await fetch(`/api/tournaments/${tournamentId}/timer`);
        if (timerResponse.ok) {
          const timerData = await timerResponse.json();
          if (timerData.currentLevel && timerData.currentLevel !== effectiveLevel) {
            setEffectiveLevel(timerData.currentLevel);
          }
        }
      } catch (error) {
        // Silently ignore polling errors
      }
    };

    const interval = setInterval(pollTimer, 10000);
    return () => clearInterval(interval);
  }, [tournamentId, tournament?.status, effectiveLevel]);

  const fetchData = async () => {
    try {
      // Récupérer les infos du tournoi
      const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
      if (tournamentResponse.ok) {
        const tournamentData = await tournamentResponse.json();
        setTournament(tournamentData);
        // Initialiser le montant light rebuy depuis la config tournoi
        if (tournamentData.lightRebuyAmount) {
          setLightRebuyAmount(tournamentData.lightRebuyAmount);
        }
      }

      // Récupérer le niveau effectif depuis le timer (pas la valeur DB qui n'est pas synchronisée)
      const timerResponse = await fetch(`/api/tournaments/${tournamentId}/timer`);
      if (timerResponse.ok) {
        const timerData = await timerResponse.json();
        // Le timer calcule le niveau réel basé sur le temps écoulé
        if (timerData.currentLevel) {
          setEffectiveLevel(timerData.currentLevel);
        }
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

  const handleCancelLastBust = async () => {
    if (busts.length === 0) return;

    if (!confirm('Voulez-vous vraiment annuler le dernier bust ?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/busts/last`,
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
      console.error('Error canceling bust:', error);
      alert('Erreur lors de l\'annulation');
    }
  };

  // Gérer l'application du light rebuy sur un joueur
  const handleLightRebuy = async (playerId: string) => {
    if (!tournament?.lightRebuyEnabled) return;

    setIsLightRebuySubmitting(playerId);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rebuys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          type: 'LIGHT',
        }),
      });

      if (response.ok) {
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de l\'application du light rebuy');
      }
    } catch (error) {
      console.error('Error applying light rebuy:', error);
      setError('Erreur lors de l\'application du light rebuy');
    } finally {
      setIsLightRebuySubmitting(null);
    }
  };

  // Recave standard depuis une ligne de bust
  const handleBustRecave = async (playerId: string, bustId: string) => {
    setIsBustRecaveSubmitting(bustId);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rebuys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          type: 'STANDARD',
        }),
      });

      if (response.ok) {
        await fetchData();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la recave');
      }
    } catch (error) {
      console.error('Error applying rebuy:', error);
      setError('Erreur lors de la recave');
    } finally {
      setIsBustRecaveSubmitting(null);
    }
  };

  const activePlayers = players
    .filter((p) => p.finalRank === null)
    .sort((a, b) => a.player.firstName.localeCompare(b.player.firstName));
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
        <Card className={recavesOpen ? 'border-amber-500' : 'border-red-500'}>
          <CardContent className="flex items-center gap-3 py-3">
            {recavesOpen ? (
              <>
                <RefreshCw className="h-5 w-5 text-amber-500" />
                <div>
                  <span className="font-medium text-amber-600">Période de recaves</span>
                  <span className="text-muted-foreground ml-2">
                    (niveau {effectiveLevel}/{tournament.rebuyEndLevel || '∞'})
                  </span>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <span className="font-medium text-red-600">Recaves terminées</span>
                  <span className="text-muted-foreground ml-2">
                    - Éliminations définitives
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Statistiques - ink variant */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Joueurs en jeu</span>
            <Trophy className="h-4 w-4 text-ink-foreground/50" />
          </div>
          <div className="text-2xl font-bold">{activePlayers.length}</div>
        </SectionCard>

        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Busts</span>
            <RefreshCw className="h-4 w-4 text-ink-foreground/50" />
          </div>
          <div className="text-2xl font-bold">{busts.length}</div>
        </SectionCard>

        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Éliminations</span>
            <Skull className="h-4 w-4 text-ink-foreground/50" />
          </div>
          <div className="text-2xl font-bold">{eliminations.length}</div>
        </SectionCard>

        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Leader Killer</span>
            <Target className="h-4 w-4 text-ink-foreground/50" />
          </div>
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
            <div className="text-sm text-ink-foreground/60">Aucun</div>
          )}
        </SectionCard>
      </div>

      {/* Formulaire bust ou élimination selon l'état des recaves */}
      {recavesOpen ? (
        /* Formulaire de bust (période de recaves) */
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Enregistrer une perte de tapis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Le joueur pourra faire une recave pour continuer
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitBust} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Joueur qui a perdu */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Joueur qui a perdu son tapis</label>
                  <select
                    value={selectedEliminated}
                    onChange={(e) => setSelectedEliminated(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-3 min-h-[44px] text-base"
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
                    className="w-full rounded-md border border-input bg-background px-3 py-3 min-h-[44px] text-base"
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

              <Button type="submit" disabled={isSubmitting} className="w-full bg-amber-600 hover:bg-amber-700 min-h-[48px] text-base">
                <RefreshCw className="mr-2 h-5 w-5" />
                Enregistrer le bust
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Formulaire d'élimination définitive */
        <Card className="border-red-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-red-500" />
              Enregistrer une élimination
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Élimination définitive - le joueur est sorti du tournoi
            </p>
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
                    className="w-full rounded-md border border-input bg-background px-3 py-3 min-h-[44px] text-base"
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
                    className="w-full rounded-md border border-input bg-background px-3 py-3 min-h-[44px] text-base"
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

              <Button type="submit" disabled={isSubmitting} className="w-full bg-red-600 hover:bg-red-700 min-h-[48px] text-base">
                <Skull className="mr-2 h-5 w-5" />
                Enregistrer l'élimination
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Light Rebuy - disponible uniquement pendant pause/break après fin des recaves */}
      {lightRebuyAvailable && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-green-500" />
              Light Rebuy ({lightRebuyAmount}€)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Recave allégée disponible une seule fois par joueur
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activePlayers.map((p) => (
                <div
                  key={p.playerId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {p.player.nickname}
                    </span>
                    <span className="text-muted-foreground text-sm hidden sm:inline">
                      ({p.player.firstName} {p.player.lastName})
                    </span>
                    {p.lightRebuyUsed && (
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Light utilisé
                      </Badge>
                    )}
                  </div>
                  {!p.lightRebuyUsed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-500 text-green-600 hover:bg-green-500/10 min-h-[44px] min-w-[80px]"
                      onClick={() => handleLightRebuy(p.playerId)}
                      disabled={isLightRebuySubmitting === p.playerId}
                    >
                      {isLightRebuySubmitting === p.playerId ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Coins className="h-4 w-4 mr-1" />
                          Light
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historique des busts */}
      {busts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Historique des busts ({busts.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelLastBust}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Annuler le dernier
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {busts.map((bust, index) => {
                // Vérifier si le joueur a recavé après ce bust
                const hasRecaved = bust.eliminated.rebuysCount > 0;
                return (
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
                        {hasRecaved && (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Recavé ({bust.eliminated.rebuysCount})
                          </Badge>
                        )}
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
                    <div className="flex items-center gap-2">
                      {recavesOpen && !hasRecaved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-500/10 min-h-[44px]"
                          onClick={() => handleBustRecave(bust.eliminated.playerId, bust.id)}
                          disabled={isBustRecaveSubmitting === bust.id}
                        >
                          {isBustRecaveSubmitting === bust.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Coins className="h-4 w-4 mr-1" />
                              Recave
                            </>
                          )}
                        </Button>
                      )}
                      <div className="text-xs text-muted-foreground flex-shrink-0">
                        {format(new Date(bust.createdAt), 'HH:mm', { locale: fr })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
