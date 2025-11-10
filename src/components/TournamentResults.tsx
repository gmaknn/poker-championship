'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calculator, Download, Image, FileText, Share2 } from 'lucide-react';
import { exportTournamentResults } from '@/lib/exportUtils';

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
  rebuysCount: number;
  eliminationsCount: number;
  leaderKills: number;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  totalPoints: number;
  prizeAmount: number | null;
  player: Player;
};

type Tournament = {
  id: string;
  name: string | null;
  date: string;
  status: string;
  buyInAmount: number;
  prizePool: number | null;
};

type Season = {
  id: string;
  name: string;
  year: number;
  eliminationPoints: number;
  leaderKillerBonus: number;
};

type ResultsData = {
  tournament: Tournament;
  season: Season | null;
  results: TournamentPlayer[];
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
};

export default function TournamentResults({ tournamentId, onUpdate }: Props) {
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchResults();
  }, [tournamentId]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/results`);
      if (response.ok) {
        const data = await response.json();
        setResultsData(data);
      } else {
        setError('Erreur lors du chargement des résultats');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Erreur lors du chargement des résultats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculatePoints = async () => {
    setIsCalculating(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/results`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchResults();
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors du calcul des points');
      }
    } catch (error) {
      console.error('Error calculating points:', error);
      setError('Erreur lors du calcul des points');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleExport = async (format: 'png' | 'jpeg' | 'whatsapp' | 'pdf') => {
    if (!exportRef.current || !resultsData) return;

    setIsExporting(true);
    setError('');

    try {
      const tournamentName = resultsData.tournament.name || 'tournoi';
      const exportFn = exportTournamentResults(exportRef.current, tournamentName);

      switch (format) {
        case 'png':
          await exportFn.png();
          break;
        case 'jpeg':
          await exportFn.jpeg();
          break;
        case 'whatsapp':
          await exportFn.whatsapp();
          break;
        case 'pdf':
          await exportFn.pdf();
          break;
      }
    } catch (error) {
      console.error('Error exporting:', error);
      setError('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!resultsData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Impossible de charger les résultats
        </CardContent>
      </Card>
    );
  }

  const { tournament, season, results } = resultsData;
  const rankedPlayers = results.filter((p) => p.finalRank !== null);
  const activePlayers = results.filter((p) => p.finalRank === null);
  const isCompleted = tournament.status === 'FINISHED';

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Résultats</h2>
          {season && (
            <p className="text-sm text-muted-foreground">
              {season.name} ({season.year})
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculatePoints}
                disabled={isCalculating || !season}
              >
                <Calculator className="mr-2 h-4 w-4" />
                {isCalculating ? 'Calcul...' : 'Recalculer les points'}
              </Button>

              <div className="h-4 w-px bg-border mx-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('whatsapp')}
                disabled={isExporting}
                title="Export optimisé WhatsApp"
              >
                <Share2 className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('png')}
                disabled={isExporting}
                title="Export PNG"
              >
                <Image className="mr-2 h-4 w-4" />
                PNG
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                title="Export PDF"
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Zone exportable */}
      <div ref={exportRef} className="space-y-6">
        {/* Statistiques du tournoi */}
        {isCompleted && (
          <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prize Pool</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tournament.prizePool ? `${tournament.prizePool}€` : 'À calculer'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Buy-in</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tournament.buyInAmount}€</div>
              <p className="text-xs text-muted-foreground">{results.length} joueurs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recaves</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {results.reduce((sum, p) => sum + p.rebuysCount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {results.reduce((sum, p) => sum + p.rebuysCount * tournament.buyInAmount, 0)}€
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Classement */}
      {rankedPlayers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Classement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rankedPlayers.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    player.finalRank === 1
                      ? 'bg-yellow-500/10 border-yellow-500'
                      : player.finalRank === 2
                      ? 'bg-gray-300/10 border-gray-400'
                      : player.finalRank === 3
                      ? 'bg-orange-500/10 border-orange-600'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {player.finalRank === 1 && <Trophy className="h-6 w-6 text-yellow-500" />}
                      {player.finalRank === 2 && <Trophy className="h-5 w-5 text-gray-400" />}
                      {player.finalRank === 3 && <Trophy className="h-5 w-5 text-orange-600" />}
                      <span className="text-2xl font-bold text-muted-foreground">
                        #{player.finalRank}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium">
                        {player.player.firstName} {player.player.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {player.player.nickname}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    {season && isCompleted && (
                      <>
                        <div className="text-right">
                          <div className="font-medium">{player.rankPoints} pts</div>
                          <div className="text-xs text-muted-foreground">Classement</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {player.eliminationPoints > 0 ? `+${player.eliminationPoints}` : player.eliminationPoints} pts
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {player.eliminationsCount} élim.
                          </div>
                        </div>
                        {player.bonusPoints > 0 && (
                          <div className="text-right">
                            <div className="font-medium text-green-600">
                              +{player.bonusPoints} pts
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {player.leaderKills} LK
                            </div>
                          </div>
                        )}
                        {player.penaltyPoints < 0 && (
                          <div className="text-right">
                            <div className="font-medium text-red-600">
                              {player.penaltyPoints} pts
                            </div>
                            <div className="text-xs text-muted-foreground">Pénalités</div>
                          </div>
                        )}
                        <div className="text-right">
                          <div className="text-lg font-bold">{player.totalPoints} pts</div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {activePlayers.length > 0
              ? `Le tournoi est en cours - ${activePlayers.length} joueur(s) actif(s)`
              : 'Aucun résultat disponible'}
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
