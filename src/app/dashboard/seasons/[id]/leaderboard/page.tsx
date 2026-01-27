'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, Medal, Download, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatar: string | null;
};

type TournamentPerformance = {
  tournamentId: string;
  tournamentName: string | null;
  tournamentDate: Date;
  finalRank: number | null;
  totalPoints: number;
  rankPoints: number;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  eliminationsCount: number;
  leaderKills: number;
  rebuysCount: number;
};

type LeaderboardEntry = {
  rank: number;
  playerId: string;
  player: Player;
  tournamentsPlayed: number;
  tournamentsCount: number;
  totalPoints: number;
  bestResult: number | null;
  averagePoints: number;
  victories: number;
  podiums: number;
  totalEliminations: number;
  totalLeaderKills: number;
  totalRebuys: number;
  performances: TournamentPerformance[];
  rankChange?: number; // Positive = moved up, negative = moved down, 0 = no change, undefined = new/not enough data
};

type Season = {
  id: string;
  name: string;
  year: number;
  totalTournamentsCount: number | null;
  bestTournamentsCount: number | null;
  completedTournamentsCount: number;
};

type LeaderboardData = {
  season: Season;
  leaderboard: LeaderboardEntry[];
};

export default function SeasonLeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [id]);

  /**
   * Calculate rank changes by comparing current leaderboard with previous state
   * (simulated by removing the most recent tournament from everyone's performances)
   */
  const calculateRankChanges = (leaderboard: LeaderboardEntry[], bestTournamentsCount: number | null): LeaderboardEntry[] => {
    if (leaderboard.length === 0) return leaderboard;

    // Find the most recent tournament date
    let mostRecentDate: Date | null = null;
    for (const entry of leaderboard) {
      for (const perf of entry.performances) {
        const perfDate = new Date(perf.tournamentDate);
        if (!mostRecentDate || perfDate > mostRecentDate) {
          mostRecentDate = perfDate;
        }
      }
    }

    if (!mostRecentDate) return leaderboard;

    // Calculate previous leaderboard (without most recent tournament)
    const previousLeaderboard = leaderboard.map(entry => {
      // Filter out the most recent tournament
      const previousPerfs = entry.performances.filter(
        perf => new Date(perf.tournamentDate).getTime() !== mostRecentDate!.getTime()
      );

      if (previousPerfs.length === 0) return null; // Player didn't exist before

      // Sort by points (same logic as API)
      const sortedPerfs = [...previousPerfs].sort((a, b) => b.totalPoints - a.totalPoints);

      // Apply best tournaments count filter
      const perfsToCount = bestTournamentsCount && bestTournamentsCount > 0
        ? sortedPerfs.slice(0, bestTournamentsCount)
        : sortedPerfs;

      const totalPoints = perfsToCount.reduce((sum, perf) => sum + perf.totalPoints, 0);

      return {
        playerId: entry.playerId,
        totalPoints,
      };
    }).filter((entry): entry is { playerId: string; totalPoints: number } => entry !== null);

    // Sort previous leaderboard by points
    previousLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    // Create rank map for previous state
    const previousRankMap = new Map<string, number>();
    previousLeaderboard.forEach((entry, index) => {
      previousRankMap.set(entry.playerId, index + 1);
    });

    // Calculate rank changes
    return leaderboard.map(entry => {
      const previousRank = previousRankMap.get(entry.playerId);
      if (previousRank === undefined) {
        // New player (no previous rank)
        return { ...entry, rankChange: undefined };
      }

      const rankChange = previousRank - entry.rank; // Positive = moved up
      return { ...entry, rankChange };
    });
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/seasons/${id}/leaderboard`);
      if (response.ok) {
        const leaderboardData = await response.json();

        // Calculate rank changes
        const leaderboardWithChanges = calculateRankChanges(
          leaderboardData.leaderboard,
          leaderboardData.season.bestTournamentsCount
        );

        setData({
          ...leaderboardData,
          leaderboard: leaderboardWithChanges,
        });
      } else {
        router.push('/dashboard/seasons');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      router.push('/dashboard/seasons');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { season, leaderboard } = data;

  return (
    <div className="space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 md:p-6 border-2 border-border">
        <div className="flex items-start sm:items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 mt-1 sm:mt-0"
            onClick={() => router.push('/dashboard/seasons')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold leading-tight">
              Classement
              <span className="block sm:inline"> - {season.name}</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {season.completedTournamentsCount} tournoi(s)
              {season.bestTournamentsCount && (
                <span className="hidden sm:inline"> • Top {season.bestTournamentsCount} perfs</span>
              )}
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/seasons/${id}/exports`)}
          variant="default"
          size="default"
          className="w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="sm:hidden">Exports</span>
          <span className="hidden sm:inline">Exports Visuels</span>
        </Button>
      </div>

      {/* Leaderboard */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 border-b-2 border-border">
          <CardTitle className="text-2xl">Classement Général</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucun joueur n'a encore participé à un tournoi complété
            </div>
          ) : (
            <div className="space-y-3">
              {/* Zone Master indicator */}
              {leaderboard.length > 0 && (
                <div className="flex items-center justify-center gap-2 py-2 mb-2 bg-gradient-to-r from-yellow-500/10 via-yellow-500/20 to-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="font-bold text-yellow-600">Zone Master - Top 10</span>
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
              )}
              {leaderboard.map((entry) => (
                <React.Fragment key={entry.playerId}>
                  {/* Separator after Top 10 */}
                  {entry.rank === 11 && (
                    <div className="flex items-center gap-4 py-2">
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                      <span className="text-sm text-muted-foreground">Hors Zone Master</span>
                      <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                    </div>
                  )}
                  <div
                  onClick={() => setSelectedPlayer(entry)}
                  className={`flex items-center justify-between p-5 rounded-xl border-2 hover:shadow-xl hover:scale-[1.01] cursor-pointer transition-all duration-200 ${
                    entry.rank === 1
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border-yellow-500 shadow-lg'
                      : entry.rank === 2
                      ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400 shadow-md'
                      : entry.rank === 3
                      ? 'bg-gradient-to-r from-orange-600/20 to-orange-700/10 border-orange-600 shadow-md'
                      : entry.rank <= 10
                      ? 'bg-gradient-to-r from-yellow-500/5 to-yellow-500/0 border-yellow-500/30 hover:border-yellow-500/50'
                      : 'bg-card border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    {/* Rank avec trophée pour le podium */}
                    <div className="flex items-center gap-3 min-w-[80px]">
                      {entry.rank === 1 && <Trophy className="h-8 w-8 text-yellow-500" />}
                      {entry.rank === 2 && <Trophy className="h-7 w-7 text-gray-400" />}
                      {entry.rank === 3 && <Trophy className="h-7 w-7 text-orange-600" />}
                      {entry.rank > 3 && entry.rank <= 10 && (
                        <Medal className="h-6 w-6 text-yellow-500/70" />
                      )}
                      <span className="text-3xl font-bold text-muted-foreground">
                        {entry.rank}
                      </span>
                    </div>

                    {/* Player info */}
                    <div className="min-w-[200px]">
                      <div className="font-semibold text-lg">
                        {entry.player.firstName} {entry.player.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.player.nickname}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-8 ml-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {entry.totalPoints}
                        </div>
                        <div className="text-xs text-muted-foreground">Points</div>
                      </div>

                      <div className="text-center">
                        <div className="text-lg font-semibold">
                          {entry.tournamentsCount}
                          {entry.tournamentsPlayed !== entry.tournamentsCount && (
                            <span className="text-muted-foreground">
                              /{entry.tournamentsPlayed}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">Tournois</div>
                      </div>

                      {entry.bestResult !== null && (
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            #{entry.bestResult}
                          </div>
                          <div className="text-xs text-muted-foreground">Meilleur</div>
                        </div>
                      )}

                      <div className="text-center">
                        <div className="text-lg font-semibold">{entry.averagePoints}</div>
                        <div className="text-xs text-muted-foreground">Moyenne</div>
                      </div>

                      {entry.victories > 0 && (
                        <div className="text-center">
                          <Badge variant="default" className="bg-yellow-500">
                            {entry.victories} 🏆
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Victoire{entry.victories > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}

                      {entry.podiums > 0 && (
                        <div className="text-center">
                          <Badge variant="secondary">
                            {entry.podiums} 🥉
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            Podium{entry.podiums > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rank Change Indicator */}
                  <div className="flex items-center gap-3">
                    {entry.rankChange === undefined ? (
                      <Badge variant="outline" className="text-blue-500 border-blue-500">NEW</Badge>
                    ) : entry.rankChange !== 0 ? (
                      <div className={`flex items-center gap-1 font-semibold ${
                        entry.rankChange > 0
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {entry.rankChange > 0 ? (
                          <>
                            <TrendingUp className="h-5 w-5" />
                            <span>+{entry.rankChange}</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-5 w-5" />
                            <span>{entry.rankChange}</span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 font-semibold text-muted-foreground">
                        <Minus className="h-5 w-5" />
                      </div>
                    )}
                    <span className="text-sm text-muted-foreground">Détails →</span>
                  </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedPlayer(null)}
        >
          <Card
            className="max-w-5xl w-full max-h-[85vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-border pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-3xl">
                    {selectedPlayer.player.firstName} {selectedPlayer.player.lastName}
                  </CardTitle>
                  <p className="text-muted-foreground text-lg mt-1">
                    #{selectedPlayer.rank} • {selectedPlayer.player.nickname}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setSelectedPlayer(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Stats Summary */}
              {(() => {
                // Calculate KO points from counted performances only
                const bestCount = season.bestTournamentsCount || selectedPlayer.performances.length;
                const countedPerfs = selectedPlayer.performances.slice(0, bestCount);
                const totalKoPoints = countedPerfs.reduce(
                  (sum, p) => sum + p.eliminationPoints + p.bonusPoints,
                  0
                );
                return (
                  <div className="grid grid-cols-5 gap-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                      <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-primary">
                          {selectedPlayer.totalPoints}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 font-medium">
                          Points Totaux
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
                      <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-green-600">
                          {totalKoPoints > 0 ? `+${totalKoPoints}` : totalKoPoints}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 font-medium">
                          Points KO
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                      <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-yellow-600">{selectedPlayer.victories}</div>
                        <div className="text-sm text-muted-foreground mt-2 font-medium">Victoires</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                      <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-blue-600">{selectedPlayer.podiums}</div>
                        <div className="text-sm text-muted-foreground mt-2 font-medium">Podiums</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5">
                      <CardContent className="pt-6 text-center">
                        <div className="text-4xl font-bold text-red-600">
                          {selectedPlayer.totalEliminations}
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 font-medium">
                          Éliminations
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Points Evolution Chart */}
              <div className="bg-muted/20 rounded-lg p-4 border-2 border-border">
                <h3 className="text-xl font-bold mb-4">
                  Évolution des Points
                </h3>
                <Card className="shadow-md">
                  <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={selectedPlayer.performances.map((perf, index) => ({
                          name: perf.tournamentName || `T${index + 1}`,
                          date: new Date(perf.tournamentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                          points: perf.totalPoints,
                          cumulativePoints: selectedPlayer.performances
                            .slice(0, index + 1)
                            .reduce((sum, p) => sum + p.totalPoints, 0),
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="points"
                          name="Points du Tournoi"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulativePoints"
                          name="Points Cumulés"
                          stroke="hsl(var(--chart-2))"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tournament History */}
              <div className="bg-muted/20 rounded-lg p-4 border-2 border-border">
                <h3 className="text-xl font-bold mb-4">
                  Historique des Tournois ({selectedPlayer.performances.length})
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {selectedPlayer.performances.map((perf, index) => (
                    <div
                      key={perf.tournamentId}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                        index < (season.bestTournamentsCount || selectedPlayer.performances.length)
                          ? 'bg-primary/10 border-primary/30 shadow-md'
                          : 'opacity-60 border-border'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {perf.tournamentName || 'Tournoi'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(perf.tournamentDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {perf.finalRank !== null && (
                          <div className="text-center">
                            <div className="text-lg font-bold">#{perf.finalRank}</div>
                            <div className="text-xs text-muted-foreground">Rank</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-sm">{perf.rankPoints}</div>
                          <div className="text-xs text-muted-foreground">Classmt</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-green-600">
                            {perf.eliminationPoints > 0 ? `+${perf.eliminationPoints}` : perf.eliminationPoints}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {perf.eliminationsCount} élim.
                          </div>
                        </div>
                        {perf.bonusPoints > 0 && (
                          <div className="text-center">
                            <div className="text-sm text-green-600">+{perf.bonusPoints}</div>
                            <div className="text-xs text-muted-foreground">
                              {perf.leaderKills} LK
                            </div>
                          </div>
                        )}
                        {perf.penaltyPoints < 0 && (
                          <div className="text-center">
                            <div className="text-sm text-red-600">{perf.penaltyPoints}</div>
                            <div className="text-xs text-muted-foreground">Pénalité</div>
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">
                            {perf.totalPoints}
                          </div>
                          <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                      </div>
                      {index < (season.bestTournamentsCount || selectedPlayer.performances.length) && (
                        <Badge variant="default" className="ml-4">
                          Compté
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                {season.bestTournamentsCount &&
                  selectedPlayer.performances.length > season.bestTournamentsCount && (
                    <p className="text-sm text-muted-foreground mt-2">
                      💡 Seules les {season.bestTournamentsCount} meilleures performances
                      sont comptabilisées dans le classement
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
