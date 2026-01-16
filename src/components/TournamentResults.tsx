'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calculator, Download, Image as ImageIcon, FileText, Share2, ExternalLink, Users, MessageCircle } from 'lucide-react';
import { exportTournamentResults, exportToWhatsAppText, type TournamentResultsData } from '@/lib/exportUtils';
import NextImage from 'next/image';

// Helper function to check if avatar URL/path is valid
const isValidAvatarUrl = (url: string | null): boolean => {
  if (!url || url.trim() === '') return false;
  // Accept relative paths starting with /
  if (url.startsWith('/')) return true;
  // Accept full URLs
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatar: string | null;
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
  type: string;
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
  const router = useRouter();
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

  const handleExportWhatsAppText = () => {
    if (!resultsData) return;

    const { tournament, season, results } = resultsData;

    const exportData: TournamentResultsData = {
      tournamentName: tournament.name || 'Tournoi',
      date: new Date(tournament.date),
      season: season ? {
        name: season.name,
        year: season.year,
      } : undefined,
      players: results.map((r) => ({
        finalRank: r.finalRank,
        player: {
          nickname: r.player.nickname,
          firstName: r.player.firstName,
          lastName: r.player.lastName,
        },
        totalPoints: r.totalPoints,
        eliminationPoints: r.eliminationPoints,
        bonusPoints: r.bonusPoints,
        penaltyPoints: r.penaltyPoints,
        prizeAmount: r.prizeAmount ?? undefined,
      })),
      buyIn: tournament.buyInAmount ?? undefined,
      prizePool: tournament.prizePool ?? undefined,
    };

    exportToWhatsAppText(exportData);
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
              {tournament.type === 'CHAMPIONSHIP' && (
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
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportWhatsAppText}
                disabled={isExporting}
                title="Copier le texte formaté pour WhatsApp"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Texte WhatsApp
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('whatsapp')}
                disabled={isExporting}
                title="Export image optimisée WhatsApp"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Image WhatsApp
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('png')}
                disabled={isExporting}
                title="Export PNG"
              >
                <ImageIcon className="mr-2 h-4 w-4" />
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

      {/* Podium TOP 3 */}
      {isCompleted && rankedPlayers.length >= 3 && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  Podium
                </CardTitle>
                <CardDescription>Les 3 premiers du tournoi</CardDescription>
              </div>
              {season && tournament.type === 'CHAMPIONSHIP' && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/leaderboard')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir le classement général
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* 2e place - à gauche */}
              {rankedPlayers[1] && (
                <div className="flex flex-col items-center p-6 rounded-lg border-2 border-gray-400 bg-gray-400/5">
                  <div className="mb-3">
                    {isValidAvatarUrl(rankedPlayers[1].player.avatar) ? (
                      <NextImage
                        src={rankedPlayers[1].player.avatar!}
                        alt={rankedPlayers[1].player.nickname}
                        width={80}
                        height={80}
                        className="rounded-full border-4 border-gray-400"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-4 border-gray-400">
                        <Users className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Trophy className="h-8 w-8 text-gray-400 mb-2" />
                  <div className="text-3xl font-bold mb-1">#2</div>
                  <div className="font-semibold text-center">
                    {rankedPlayers[1].player.firstName} {rankedPlayers[1].player.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    @{rankedPlayers[1].player.nickname}
                  </div>
                  {tournament.type === 'CHAMPIONSHIP' ? (
                    season && (
                      <div className="text-2xl font-bold text-gray-400">
                        {rankedPlayers[1].totalPoints} pts
                      </div>
                    )
                  ) : rankedPlayers[1].prizeAmount ? (
                    <div className="text-2xl font-bold text-green-600">
                      {rankedPlayers[1].prizeAmount}€
                    </div>
                  ) : null}
                </div>
              )}

              {/* 1ère place - au centre, légèrement plus grande */}
              {rankedPlayers[0] && (
                <div className="flex flex-col items-center p-6 rounded-lg border-4 border-yellow-500 bg-yellow-500/10 shadow-lg md:scale-110 md:-mt-4 md:z-10">
                  <div className="mb-3">
                    {isValidAvatarUrl(rankedPlayers[0].player.avatar) ? (
                      <NextImage
                        src={rankedPlayers[0].player.avatar!}
                        alt={rankedPlayers[0].player.nickname}
                        width={96}
                        height={96}
                        className="rounded-full border-4 border-yellow-500"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-yellow-500">
                        <Users className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Trophy className="h-10 w-10 text-yellow-500 mb-2" />
                  <div className="text-4xl font-bold mb-1">#1</div>
                  <div className="font-bold text-lg text-center">
                    {rankedPlayers[0].player.firstName} {rankedPlayers[0].player.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    @{rankedPlayers[0].player.nickname}
                  </div>
                  {tournament.type === 'CHAMPIONSHIP' ? (
                    season && (
                      <div className="text-3xl font-bold text-yellow-500">
                        {rankedPlayers[0].totalPoints} pts
                      </div>
                    )
                  ) : rankedPlayers[0].prizeAmount ? (
                    <div className="text-3xl font-bold text-green-600">
                      {rankedPlayers[0].prizeAmount}€
                    </div>
                  ) : null}
                </div>
              )}

              {/* 3e place - à droite */}
              {rankedPlayers[2] && (
                <div className="flex flex-col items-center p-6 rounded-lg border-2 border-orange-600 bg-orange-600/5">
                  <div className="mb-3">
                    {isValidAvatarUrl(rankedPlayers[2].player.avatar) ? (
                      <NextImage
                        src={rankedPlayers[2].player.avatar!}
                        alt={rankedPlayers[2].player.nickname}
                        width={80}
                        height={80}
                        className="rounded-full border-4 border-orange-600"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border-4 border-orange-600">
                        <Users className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <Trophy className="h-8 w-8 text-orange-600 mb-2" />
                  <div className="text-3xl font-bold mb-1">#3</div>
                  <div className="font-semibold text-center">
                    {rankedPlayers[2].player.firstName} {rankedPlayers[2].player.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    @{rankedPlayers[2].player.nickname}
                  </div>
                  {tournament.type === 'CHAMPIONSHIP' ? (
                    season && (
                      <div className="text-2xl font-bold text-orange-600">
                        {rankedPlayers[2].totalPoints} pts
                      </div>
                    )
                  ) : rankedPlayers[2].prizeAmount ? (
                    <div className="text-2xl font-bold text-green-600">
                      {rankedPlayers[2].prizeAmount}€
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
                    {tournament.type === 'CHAMPIONSHIP' ? (
                      season && isCompleted && (
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
                      )
                    ) : (
                      player.prizeAmount && (
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{player.prizeAmount}€</div>
                          <div className="text-xs text-muted-foreground">Gain</div>
                        </div>
                      )
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
