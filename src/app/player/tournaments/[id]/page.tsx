'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Calendar,
  Users,
  Trophy,
  Euro,
  Target,
  Medal,
  ChevronDown,
  ChevronUp,
  Skull,
  Crown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type TournamentPlayer = {
  playerId: string;
  finalRank: number | null;
  totalPoints: number;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  prizeAmount: number | null;
  rebuysCount: number;
  lightRebuyUsed: boolean;
  voluntaryFullRebuyUsed: boolean;
  eliminationsCount: number;
  bustEliminations: number;
  leaderKills: number;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    avatar: string | null;
  };
};

type Tournament = {
  id: string;
  name: string;
  date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  buyInAmount: number;
  startingChips: number;
  prizePool: number | null;
  prizePayoutPercents: number[] | null;
  prizePoolAdjustment: number | null;
  prizePoolAdjustmentReason: string | null;
  season: {
    name: string;
  };
  tournamentPlayers: TournamentPlayer[];
};

const statusConfig = {
  PLANNED: { label: 'Planifié', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-green-500' },
  FINISHED: { label: 'Terminé', color: 'bg-gray-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-500' },
};

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) return avatar;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function PlayerTournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`/api/tournaments/${id}`);
        if (response.ok) {
          const data = await response.json();
          setTournament(data);
        } else {
          setError('Tournoi non trouvé');
        }
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setError('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournament();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement du tournoi...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error || 'Tournoi non trouvé'}</p>
            <Button
              variant="outline"
              onClick={() => router.push('/player/tournaments')}
              className="mt-4 min-h-[44px]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux tournois
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort players by rank (ranked players first, then by points)
  const sortedPlayers = [...tournament.tournamentPlayers].sort((a, b) => {
    if (a.finalRank && b.finalRank) return a.finalRank - b.finalRank;
    if (a.finalRank) return -1;
    if (b.finalRank) return 1;
    return b.totalPoints - a.totalPoints;
  });

  const prizeAmounts = tournament.prizePayoutPercents || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/player/tournaments')}
          className="min-h-[44px] min-w-[44px] flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
              {tournament.name}
            </h1>
            <Badge
              variant="secondary"
              className={`${statusConfig[tournament.status].color} text-white flex-shrink-0`}
            >
              {statusConfig[tournament.status].label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {tournament.season.name}
          </p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Date</span>
            </div>
            <p className="font-semibold text-sm sm:text-base">
              {format(new Date(tournament.date), 'd MMM yyyy', { locale: fr })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(tournament.date), 'HH:mm', { locale: fr })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Joueurs</span>
            </div>
            <p className="font-semibold text-sm sm:text-base">
              {tournament.tournamentPlayers.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Euro className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Buy-in</span>
            </div>
            <p className="font-semibold text-sm sm:text-base">
              {tournament.buyInAmount}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Jetons</span>
            </div>
            <p className="font-semibold text-sm sm:text-base">
              {tournament.startingChips.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prize Pool */}
      {prizeAmounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {prizeAmounts.map((amount, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-yellow-950'
                        : index === 1
                        ? 'bg-gray-400 text-gray-950'
                        : index === 2
                        ? 'bg-amber-600 text-amber-950'
                        : 'bg-muted-foreground/20 text-foreground'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-semibold">{amount}€</span>
                </div>
              ))}
            </div>
            {tournament.prizePoolAdjustment && (
              <p className="mt-3 text-sm text-muted-foreground">
                Ajustement : {tournament.prizePoolAdjustment > 0 ? '+' : ''}
                {tournament.prizePoolAdjustment}€
                {tournament.prizePoolAdjustmentReason && (
                  <span> ({tournament.prizePoolAdjustmentReason})</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results / Rankings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Medal className="h-5 w-5" />
            {tournament.status === 'FINISHED' ? 'Résultats' : 'Participants'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sortedPlayers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Aucun participant inscrit
            </div>
          ) : (
            <div className="divide-y">
              {sortedPlayers.map((tp) => (
                <PlayerResultRow key={tp.playerId} tp={tp} isFinished={tournament.status === 'FINISHED'} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Composant pour une ligne de résultat avec détails expansibles
function PlayerResultRow({ tp, isFinished }: { tp: TournamentPlayer; isFinished: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calcul des recaves totales
  const totalRebuys = tp.rebuysCount + (tp.lightRebuyUsed ? 1 : 0) + (tp.voluntaryFullRebuyUsed ? 1 : 0);
  const totalEliminations = tp.eliminationsCount + tp.bustEliminations;

  return (
    <div className="hover:bg-muted/50 transition-colors">
      {/* Main row - clickable to expand */}
      <div
        className="flex items-center gap-3 p-3 sm:p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Rank */}
        <div className="w-8 flex justify-center flex-shrink-0">
          {tp.finalRank ? (
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                tp.finalRank === 1
                  ? 'bg-yellow-500 text-yellow-950'
                  : tp.finalRank === 2
                  ? 'bg-gray-400 text-gray-950'
                  : tp.finalRank === 3
                  ? 'bg-amber-600 text-amber-950'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {tp.finalRank}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>

        {/* Avatar */}
        {tp.player.avatar && getAvatarUrl(tp.player.avatar) ? (
          <img
            src={getAvatarUrl(tp.player.avatar)!}
            alt={tp.player.nickname}
            className="w-10 h-10 rounded-full border border-border flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{tp.player.nickname}</p>
          <p className="text-xs text-muted-foreground truncate">
            {tp.player.firstName} {tp.player.lastName}
          </p>
        </div>

        {/* Points & Prize */}
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-lg text-primary">{tp.totalPoints}</p>
          <p className="text-xs text-muted-foreground">pts</p>
        </div>

        {tp.prizeAmount && tp.prizeAmount > 0 && (
          <div className="text-right flex-shrink-0 ml-2">
            <p className="font-bold text-green-600">{tp.prizeAmount}€</p>
          </div>
        )}

        {/* Expand icon */}
        {isFinished && (
          <div className="flex-shrink-0 text-muted-foreground">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && isFinished && (
        <div className="px-4 pb-4 pt-0 ml-[60px] sm:ml-[68px]">
          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            {/* DEBUG - À SUPPRIMER APRÈS */}
            <div className="bg-yellow-500 text-black p-2 text-xs mb-2 rounded font-mono">
              DEBUG: total={tp.totalPoints}, rank={tp.rankPoints}, elim={tp.eliminationPoints}, bonus={tp.bonusPoints}, penalty={tp.penaltyPoints}, implicit={(tp.totalPoints || 0) - (tp.rankPoints || 0) - (tp.eliminationPoints || 0) - (tp.bonusPoints || 0)}
            </div>
            {/* Stats row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground pb-2 border-b border-border/50">
              {totalRebuys > 0 && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {totalRebuys} recave{totalRebuys > 1 ? 's' : ''}
                </span>
              )}
              {totalEliminations > 0 && (
                <span className="flex items-center gap-1">
                  <Skull className="h-3.5 w-3.5" />
                  {totalEliminations} élim{totalEliminations > 1 ? 's' : ''}
                </span>
              )}
              {tp.leaderKills > 0 && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Crown className="h-3.5 w-3.5" />
                  {tp.leaderKills} LK
                </span>
              )}
            </div>

            {/* Points breakdown */}
            <div className="space-y-1">
              {/* Classement */}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Points classement</span>
                <span className="font-medium">{tp.rankPoints}</span>
              </div>

              {/* Éliminations */}
              {tp.eliminationPoints > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points éliminations</span>
                  <span className="font-medium text-green-600">+{tp.eliminationPoints}</span>
                </div>
              )}

              {/* Bonus (leader kills, etc.) */}
              {tp.bonusPoints > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points bonus</span>
                  <span className="font-medium text-green-600">+{tp.bonusPoints}</span>
                </div>
              )}

              {/* Pénalités (recaves) - calculer le malus implicite depuis le total */}
              {(() => {
                const rankPts = tp.rankPoints || 0;
                const elimPts = tp.eliminationPoints || 0;
                const bonusPts = tp.bonusPoints || 0;
                const totalPts = tp.totalPoints || 0;
                const storedPenalty = tp.penaltyPoints || 0;

                // Malus implicite = total - (rank + elim + bonus)
                const implicitPenalty = totalPts - rankPts - elimPts - bonusPts;

                // Afficher le malus stocké s'il existe, sinon le malus implicite
                const displayPenalty = storedPenalty !== 0 ? storedPenalty : implicitPenalty;

                if (displayPenalty < 0) {
                  return (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Malus recaves</span>
                      <span className="font-medium text-red-500">{displayPenalty}</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Total */}
              <div className="flex justify-between pt-2 border-t border-border/50">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary">{tp.totalPoints} pts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
