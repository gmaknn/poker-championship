'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SectionCard } from '@/components/ui/section-card';
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
import { Skull, Undo2, Trophy, Target, RefreshCw, AlertTriangle, Coins, Check, Hand, Plus, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
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
  voluntaryFullRebuyUsed: boolean;
  currentStack: number | null;
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

type Tournament = {
  id: string;
  status: string;
  currentLevel: number;
  rebuyEndLevel: number | null;
  lightRebuyEnabled: boolean;
  lightRebuyAmount: number;
  startingChips: number;
  maxRebuysPerPlayer: number | null;
  seasonLeaderAtStartId: string | null;
};

type TableInfo = {
  tableNumber: number;
  activePlayers: number;
  totalPlayers: number;
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
};

// Note: L'état des recaves (recavesOpen) est maintenant retourné par l'API timer
// qui utilise areRecavesOpen() côté serveur avec la logique complète
// incluant la pause après "Fin recaves" pour permettre les recaves light

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
  // État des recaves (retourné par l'API timer avec la logique complète)
  const [recavesOpen, setRecavesOpen] = useState(true);
  // Période de rebuy volontaire (uniquement pendant la pause après fin des recaves)
  const [isVoluntaryRebuyPeriod, setIsVoluntaryRebuyPeriod] = useState(false);
  // Light rebuy state
  const [lightRebuyAmount, setLightRebuyAmount] = useState(5);
  const [isLightRebuySubmitting, setIsLightRebuySubmitting] = useState<string | null>(null);
  // Bust recave state
  const [bustRecaveSubmitting, setBustRecaveSubmitting] = useState<string | null>(null);
  // Tables info for director view links
  const [tables, setTables] = useState<TableInfo[]>([]);
  // Voluntary rebuy state
  const [voluntaryRebuyStack, setVoluntaryRebuyStack] = useState<Record<string, number>>({});
  const [voluntaryRebuySubmitting, setVoluntaryRebuySubmitting] = useState<string | null>(null);
  // Accordion states for collapsible sections
  const [voluntaryRebuyOpen, setVoluntaryRebuyOpen] = useState(true);
  const [eliminationFormOpen, setEliminationFormOpen] = useState(true);
  const [bustHistoryOpen, setBustHistoryOpen] = useState(false);
  const [eliminationHistoryOpen, setEliminationHistoryOpen] = useState(false);
  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'elimination' | 'bust' | 'recave';
    bustId?: string;
  } | null>(null);

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
          // Mettre à jour l'état des recaves depuis l'API (logique complète côté serveur)
          if (timerData.recavesOpen !== undefined) {
            setRecavesOpen(timerData.recavesOpen);
          }
          // Mettre à jour la période de rebuy volontaire
          if (timerData.isVoluntaryRebuyPeriod !== undefined) {
            setIsVoluntaryRebuyPeriod(timerData.isVoluntaryRebuyPeriod);
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

      // Récupérer le niveau effectif et l'état des recaves depuis le timer
      const timerResponse = await fetch(`/api/tournaments/${tournamentId}/timer`);
      if (timerResponse.ok) {
        const timerData = await timerResponse.json();
        // Le timer calcule le niveau réel basé sur le temps écoulé
        if (timerData.currentLevel) {
          setEffectiveLevel(timerData.currentLevel);
        }
        // L'état des recaves est calculé côté serveur avec la logique complète
        // (inclut la pause après "Fin recaves" pour permettre les recaves light)
        if (timerData.recavesOpen !== undefined) {
          setRecavesOpen(timerData.recavesOpen);
        }
        // Période de rebuy volontaire (uniquement pendant pause après fin recaves)
        if (timerData.isVoluntaryRebuyPeriod !== undefined) {
          setIsVoluntaryRebuyPeriod(timerData.isVoluntaryRebuyPeriod);
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

      // Récupérer les tables pour les liens vers la vue DT
      const tablesResponse = await fetch(`/api/tournaments/${tournamentId}/tables`);
      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json();
        setTables(tablesData.tables || []);
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
        toast.success('Bust enregistré');
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
        toast.success('Élimination enregistrée');
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
    if (!eliminations.length) return;
    try {
      const lastElimination = eliminations[0];
      const response = await fetch(
        `/api/tournaments/${tournamentId}/eliminations/${lastElimination.id}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchData();
        onUpdate?.();
        toast.success('Élimination annulée');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de l\'annulation');
      }
    } catch (error) {
      console.error('Error canceling elimination:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const handleCancelLastBust = async () => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/busts/last`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchData();
        onUpdate?.();
        toast.success('Bust annulé');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de l\'annulation');
      }
    } catch (error) {
      console.error('Error canceling bust:', error);
      toast.error('Erreur lors de l\'annulation');
    }
  };

  // Gérer l'application d'une recave depuis un bust
  const handleBustRecave = async (bustId: string) => {
    setBustRecaveSubmitting(bustId);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/busts/${bustId}/recave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        await fetchData();
        onUpdate?.();
        toast.success('Recave appliquée');
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de l\'application de la recave');
      }
    } catch (error) {
      console.error('Error applying recave from bust:', error);
      setError('Erreur lors de l\'application de la recave');
    } finally {
      setBustRecaveSubmitting(null);
    }
  };

  // Gérer l'annulation d'une recave depuis un bust
  const handleCancelBustRecave = async (bustId: string) => {
    setBustRecaveSubmitting(bustId);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/busts/${bustId}/recave`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchData();
        onUpdate?.();
        toast.success('Recave annulée');
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de l\'annulation de la recave');
      }
    } catch (error) {
      console.error('Error cancelling recave from bust:', error);
      setError('Erreur lors de l\'annulation de la recave');
    } finally {
      setBustRecaveSubmitting(null);
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
        toast.success('Light rebuy appliqué');
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

  // Seuil de stack pour le rebuy volontaire (half vs full)
  const VOLUNTARY_REBUY_STACK_THRESHOLD = 3500;

  // Gérer le rebuy volontaire (joueur non busté qui veut recaver)
  const handleVoluntaryRebuy = async (playerId: string) => {
    const currentStack = voluntaryRebuyStack[playerId];
    if (currentStack === undefined || currentStack < 0) {
      setError('Veuillez entrer le stack actuel du joueur');
      return;
    }

    setVoluntaryRebuySubmitting(playerId);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rebuys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          type: currentStack >= VOLUNTARY_REBUY_STACK_THRESHOLD ? 'LIGHT' : 'STANDARD',
          isVoluntary: true,
          currentStack,
        }),
      });

      if (response.ok) {
        // Reset le stack input pour ce joueur
        setVoluntaryRebuyStack(prev => {
          const updated = { ...prev };
          delete updated[playerId];
          return updated;
        });
        await fetchData();
        onUpdate?.();
        toast.success('Full rebuy appliqué');
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors du rebuy volontaire');
      }
    } catch (error) {
      console.error('Error applying voluntary rebuy:', error);
      setError('Erreur lors du rebuy volontaire');
    } finally {
      setVoluntaryRebuySubmitting(null);
    }
  };

  // Déterminer le type de rebuy basé sur le stack saisi
  const getVoluntaryRebuyType = (playerId: string): 'HALF' | 'FULL' | null => {
    const stack = voluntaryRebuyStack[playerId];
    if (stack === undefined) return null;
    return stack >= VOLUNTARY_REBUY_STACK_THRESHOLD ? 'HALF' : 'FULL';
  };

  const activePlayers = players
    .filter((p) => p.finalRank === null)
    .sort((a, b) => a.player.firstName.localeCompare(b.player.firstName));
  const eliminatedPlayers = players.filter((p) => p.finalRank !== null);

  // Le leader de la saison au début du tournoi (pour afficher la couronne)
  const seasonLeaderId = tournament?.seasonLeaderAtStartId;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-4">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Indicateur état des recaves - sticky en mobile */}
      {tournament && (
        <Card className={`${recavesOpen ? 'border-amber-500 bg-amber-500/5' : 'border-red-500 bg-red-500/5'} sticky top-[53px] md:top-0 z-20 shadow-md bg-background`}>
          <CardContent className="flex items-center gap-3 py-3 px-4 !pb-3">
            {recavesOpen ? (
              <>
                <RefreshCw className="h-5 w-5 md:h-6 md:w-6 text-amber-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-amber-600 text-base md:text-lg">Période de recaves</span>
                  <span className="text-muted-foreground ml-2 text-sm md:text-base">
                    (niv. {effectiveLevel}/{tournament.rebuyEndLevel || '∞'})
                  </span>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className="font-semibold text-red-600 text-base md:text-lg">Éliminations définitives</span>
                  <span className="text-muted-foreground ml-2 text-sm hidden sm:inline">
                    - Recaves terminées
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accès rapide vue Directeur de Table */}
      {tables.length > 0 && tournament?.status === 'IN_PROGRESS' && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-3 px-4 !pb-3">
            <div className="flex items-center gap-2 mb-2">
              <LayoutGrid className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-sm">Vue Directeur de Table</span>
              <span className="text-sm text-muted-foreground hidden sm:inline">— optimisée mobile</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tables.map(table => (
                <Link
                  key={table.tableNumber}
                  href={`/director/${tournamentId}/table/${table.tableNumber}`}
                  target="_blank"
                >
                  <Button variant="outline" size="sm" className="border-blue-500/30 hover:bg-blue-500/10">
                    Table {table.tableNumber}
                    <Badge variant="secondary" className="ml-1.5 text-sm px-1.5">
                      {table.activePlayers}
                    </Badge>
                  </Button>
                </Link>
              ))}
            </div>
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
            <span className="text-sm font-medium text-ink-foreground/70">Leader Saison 👑</span>
            <Target className="h-4 w-4 text-ink-foreground/50" />
          </div>
          {seasonLeaderId ? (
            <div className="text-sm">
              {(() => {
                const leader = players.find((p) => p.playerId === seasonLeaderId);
                return leader ? (
                  <div className="font-medium">
                    {leader.player.nickname}
                    {leader.finalRank !== null && (
                      <span className="text-red-400 ml-2">(éliminé)</span>
                    )}
                  </div>
                ) : (
                  <div className="text-ink-foreground/60">Non inscrit</div>
                );
              })()}
            </div>
          ) : (
            <div className="text-sm text-ink-foreground/60">1er tournoi</div>
          )}
        </SectionCard>
      </div>

      {/* Tournoi terminé - message informatif */}
      {tournament?.status === 'FINISHED' && (
        <Card className="border-muted">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              Tournoi terminé - Les éliminations sont en lecture seule
            </span>
          </CardContent>
        </Card>
      )}

      {/* 1. Formulaire de bust - visible pendant période de recaves (PAS en accordéon) */}
      {recavesOpen && tournament?.status === 'IN_PROGRESS' && (
        <Card className="border-amber-500/50 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Enregistrer un bust
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Le joueur pourra faire une recave
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitBust} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Qui a perdu son tapis ?</label>
                <select
                  value={selectedEliminated}
                  onChange={(e) => setSelectedEliminated(e.target.value)}
                  className="w-full rounded-lg border-2 border-input bg-background px-4 py-4 min-h-[52px] text-base font-medium focus:border-amber-500 focus:ring-amber-500"
                  disabled={isSubmitting}
                >
                  <option value="">Sélectionner le joueur...</option>
                  {activePlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.player.nickname} ({p.player.firstName})
                      {p.rebuysCount > 0 && ` [${p.rebuysCount}R]`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Pris par qui ?</label>
                <select
                  value={selectedEliminator}
                  onChange={(e) => setSelectedEliminator(e.target.value)}
                  className="w-full rounded-lg border-2 border-input bg-background px-4 py-4 min-h-[52px] text-base font-medium focus:border-amber-500 focus:ring-amber-500"
                  disabled={isSubmitting}
                >
                  <option value="">Sélectionner le killer...</option>
                  {activePlayers
                    .filter((p) => p.playerId !== selectedEliminated)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.player.nickname}
                        {p.playerId === seasonLeaderId && ' 👑'}
                      </option>
                    ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedEliminated || !selectedEliminator}
                className="w-full bg-amber-600 hover:bg-amber-700 min-h-[56px] text-lg font-semibold shadow-lg"
              >
                <RefreshCw className="mr-2 h-6 w-6" />
                Enregistrer le bust
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 2. Historique des busts - Accordéon */}
      {busts.length > 0 && (
        <Card>
          <CardHeader
            className="flex flex-row items-center justify-between gap-2 pb-3 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
            onClick={() => setBustHistoryOpen(!bustHistoryOpen)}
            onKeyDown={(e) => e.key === 'Enter' && setBustHistoryOpen(!bustHistoryOpen)}
            role="button"
            tabIndex={0}
          >
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Busts ({busts.length})
              {bustHistoryOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
            {tournament?.status !== 'FINISHED' && bustHistoryOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setConfirmDialog({ type: 'bust' }); }}
                className="min-h-[44px]"
              >
                <Undo2 className="mr-1 h-4 w-4" />
                Annuler dernier
              </Button>
            )}
          </CardHeader>
          {bustHistoryOpen && (
          <CardContent className="px-3 md:px-6">
            <div className="space-y-2">
              {busts.map((bust, index) => (
                <div
                  key={bust.id}
                  className={`p-3 rounded-lg border border-amber-500/40 ${
                    index === 0 ? 'bg-amber-500/10' : 'bg-amber-500/5'
                  }`}
                >
                  {/* Ligne 1: Badges + Nom */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10 text-sm">
                      Bust
                    </Badge>
                    {bust.recaveApplied && (
                      <Badge variant="default" className="bg-green-600 text-sm">
                        <Check className="h-3 w-3 mr-1" />
                        Recave
                      </Badge>
                    )}
                    <span className="font-semibold text-base">
                      {bust.eliminated.player.nickname}
                    </span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {format(new Date(bust.createdAt), 'HH:mm', { locale: fr })}
                    </span>
                  </div>

                  {/* Ligne 2: Détails */}
                  <div className="text-sm text-muted-foreground mb-2">
                    {bust.killer ? (
                      <>
                        par <span className="font-medium text-foreground">{bust.killer.player.nickname}</span>
                        {' '}(niv. {bust.level})
                      </>
                    ) : (
                      <>Killer non spécifié (niv. {bust.level})</>
                    )}
                  </div>

                  {/* Ligne 3: Bouton Recave (si applicable) */}
                  {tournament?.status !== 'FINISHED' && recavesOpen && (
                    <div className="mt-2">
                      {bust.recaveApplied ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-500/10 min-h-[44px] w-full"
                          onClick={() => setConfirmDialog({ type: 'recave', bustId: bust.id })}
                          disabled={bustRecaveSubmitting === bust.id}
                        >
                          {bustRecaveSubmitting === bust.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Undo2 className="h-4 w-4 mr-2" />
                              Annuler la recave
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500 text-green-600 hover:bg-green-500/10 min-h-[44px] w-full font-semibold"
                          onClick={() => handleBustRecave(bust.id)}
                          disabled={bustRecaveSubmitting === bust.id}
                        >
                          {bustRecaveSubmitting === bust.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Recave (10€)
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          )}
        </Card>
      )}

      {/* 3. Rebuy Volontaire - ACCORDÉON, visible UNIQUEMENT pendant la pause après fin des recaves */}
      {isVoluntaryRebuyPeriod && tournament?.status === 'IN_PROGRESS' && (
        <Card className="border-blue-500/50">
          <CardHeader
            className="cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
            onClick={() => setVoluntaryRebuyOpen(!voluntaryRebuyOpen)}
            onKeyDown={(e) => e.key === 'Enter' && setVoluntaryRebuyOpen(!voluntaryRebuyOpen)}
            role="button"
            tabIndex={0}
          >
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Hand className="h-5 w-5 text-blue-500" />
              Rebuy Volontaire (Pause)
              {voluntaryRebuyOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
              )}
            </CardTitle>
            {!voluntaryRebuyOpen && (
              <p className="text-sm text-muted-foreground">
                Dernière chance avant éliminations définitives
              </p>
            )}
          </CardHeader>
          {voluntaryRebuyOpen && (
          <CardContent>
            <div className="space-y-2">
              {activePlayers.map((p) => {
                const rebuyType = getVoluntaryRebuyType(p.playerId);
                // Un joueur ne peut faire qu'UN SEUL rebuy/recave PENDANT la pause
                // Seuls les busts au niveau > rebuyEndLevel comptent (rebuyEndLevel est le dernier niveau AVANT la pause)
                const hasBustRecaveDuringPause = busts.some(
                  (b) => b.eliminated.playerId === p.playerId
                    && b.recaveApplied
                    && tournament.rebuyEndLevel !== null
                    && b.level > tournament.rebuyEndLevel
                );
                const hasUsedVoluntaryRebuy = p.lightRebuyUsed || p.voluntaryFullRebuyUsed || hasBustRecaveDuringPause;

                return (
                  <div key={p.playerId} className="flex flex-col gap-2 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.player.nickname}</span>
                      <Badge variant="outline" className="text-sm">
                        {p.rebuysCount} rebuy{p.rebuysCount !== 1 ? 's' : ''}
                      </Badge>
                      {p.lightRebuyUsed && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-sm">
                          Light utilisé
                        </Badge>
                      )}
                      {p.voluntaryFullRebuyUsed && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-sm">
                          Full utilisé
                        </Badge>
                      )}
                    </div>

                    {hasUsedVoluntaryRebuy ? (
                      <p className="text-sm text-muted-foreground italic">
                        {hasBustRecaveDuringPause
                          ? 'Recave après bust déjà effectuée'
                          : 'Rebuy volontaire déjà utilisé'}
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="flex-1">
                            <Input
                              type="number"
                              placeholder="Stack actuel"
                              min={0}
                              value={voluntaryRebuyStack[p.playerId] ?? ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                setVoluntaryRebuyStack(prev => ({
                                  ...prev,
                                  [p.playerId]: value as number,
                                }));
                              }}
                            />
                          </div>

                          {rebuyType && (
                            <Badge
                              variant="outline"
                              className={rebuyType === 'HALF' ? 'border-green-500 text-green-600' : 'border-amber-500 text-amber-600'}
                            >
                              {rebuyType === 'HALF' ? 'Half (5€)' : 'Full (10€)'}
                            </Badge>
                          )}

                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white min-h-[44px] min-w-[100px]"
                            onClick={() => handleVoluntaryRebuy(p.playerId)}
                            disabled={
                              voluntaryRebuySubmitting === p.playerId ||
                              voluntaryRebuyStack[p.playerId] === undefined
                            }
                          >
                            {voluntaryRebuySubmitting === p.playerId ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-1" />
                                Rebuy
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
          )}
        </Card>
      )}

      {/* 4. Élimination définitive - ACCORDÉON, visible après fin des recaves */}
      {!recavesOpen && tournament?.status === 'IN_PROGRESS' && (
        <Card className="border-red-500/50">
          <CardHeader
            className="cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
            onClick={() => setEliminationFormOpen(!eliminationFormOpen)}
            onKeyDown={(e) => e.key === 'Enter' && setEliminationFormOpen(!eliminationFormOpen)}
            role="button"
            tabIndex={0}
          >
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Skull className="h-5 w-5 text-red-500" />
              Élimination définitive
              {eliminationFormOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
              )}
            </CardTitle>
            {!eliminationFormOpen && (
              <p className="text-sm text-muted-foreground">
                Le joueur sort du tournoi
              </p>
            )}
          </CardHeader>
          {eliminationFormOpen && (
          <CardContent>
            <form onSubmit={handleSubmitElimination} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Qui est éliminé ?</label>
                <select
                  value={selectedEliminated}
                  onChange={(e) => setSelectedEliminated(e.target.value)}
                  className="w-full rounded-lg border-2 border-input bg-background px-4 py-4 min-h-[52px] text-base font-medium focus:border-red-500 focus:ring-red-500"
                  disabled={isSubmitting}
                >
                  <option value="">Sélectionner le joueur...</option>
                  {activePlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {p.player.nickname} ({p.player.firstName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Éliminé par qui ?</label>
                <select
                  value={selectedEliminator}
                  onChange={(e) => setSelectedEliminator(e.target.value)}
                  className="w-full rounded-lg border-2 border-input bg-background px-4 py-4 min-h-[52px] text-base font-medium focus:border-red-500 focus:ring-red-500"
                  disabled={isSubmitting}
                >
                  <option value="">Sélectionner l'éliminateur...</option>
                  {activePlayers
                    .filter((p) => p.playerId !== selectedEliminated)
                    .map((p) => (
                      <option key={p.playerId} value={p.playerId}>
                        {p.player.nickname}
                        {p.playerId === seasonLeaderId && ' 👑'}
                      </option>
                    ))}
                </select>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !selectedEliminated || !selectedEliminator}
                className="w-full bg-red-600 hover:bg-red-700 min-h-[56px] text-lg font-semibold shadow-lg"
              >
                <Skull className="mr-2 h-6 w-6" />
                Enregistrer l'élimination
              </Button>
            </form>
          </CardContent>
          )}
        </Card>
      )}

      {/* 5. Historique des éliminations - Accordéon */}
      <Card>
        <CardHeader
          className="flex flex-row items-center justify-between cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg"
          onClick={() => setEliminationHistoryOpen(!eliminationHistoryOpen)}
          onKeyDown={(e) => e.key === 'Enter' && setEliminationHistoryOpen(!eliminationHistoryOpen)}
          role="button"
          tabIndex={0}
        >
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Skull className="h-5 w-5 text-red-500" />
            Éliminations ({eliminations.length})
            {eliminationHistoryOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </CardTitle>
          {eliminations.length > 0 && tournament?.status !== 'FINISHED' && eliminationHistoryOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setConfirmDialog({ type: 'elimination' }); }}
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Annuler la dernière
            </Button>
          )}
        </CardHeader>
        {eliminationHistoryOpen && (
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
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(elim.createdAt), 'HH:mm', { locale: fr })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        )}
      </Card>

      {/* Confirm cancel dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;annulation</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'elimination' && 'Voulez-vous vraiment annuler la dernière élimination ?'}
              {confirmDialog?.type === 'bust' && 'Voulez-vous vraiment annuler le dernier bust ?'}
              {confirmDialog?.type === 'recave' && 'Voulez-vous vraiment annuler cette recave ?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog?.type === 'elimination') handleCancelLastElimination();
                else if (confirmDialog?.type === 'bust') handleCancelLastBust();
                else if (confirmDialog?.type === 'recave' && confirmDialog.bustId) handleCancelBustRecave(confirmDialog.bustId);
                setConfirmDialog(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
