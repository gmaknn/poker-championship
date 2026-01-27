'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, TrendingDown, Minus, Users, Calendar, Download, Star, Medal } from 'lucide-react';
// Using native img for avatars to avoid next/image restrictions with external SVGs
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/PageHeader';
import { normalizeAvatarSrc, isValidAvatarUrl } from '@/lib/utils';
import { exportToPNG } from '@/lib/exportUtils';
import LeaderboardExportPng from '@/components/exports/LeaderboardExportPng';

type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
  _count?: {
    tournaments: number;
  };
};

type TournamentPerformance = {
  tournamentId: string;
  tournamentName: string | null;
  tournamentDate: Date;
  totalPoints: number;
};

type LeaderboardEntry = {
  rank: number;
  playerId: string;
  player: {
    firstName: string;
    lastName: string;
    nickname: string;
    avatar: string | null;
  };
  totalPoints: number;
  tournamentsCount: number;
  averagePoints: number;
  victories: number;
  podiums: number;
  performances?: TournamentPerformance[];
  rankChange?: number; // Positive = moved up, negative = moved down, undefined = new
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const allSeasons = await response.json();
        setSeasons(allSeasons);

        // Sélectionner la saison active par défaut, sinon la plus récente
        const active = allSeasons.find((s: Season) => s.status === 'ACTIVE');
        const defaultSeason = active || allSeasons[0];

        if (defaultSeason) {
          setSelectedSeason(defaultSeason);
          fetchLeaderboard(defaultSeason.id);
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      setIsLoading(false);
    }
  };

  const handleSeasonChange = (seasonId: string) => {
    const season = seasons.find(s => s.id === seasonId);
    if (season) {
      setSelectedSeason(season);
      setIsLoading(true);
      fetchLeaderboard(seasonId);
    }
  };

  /**
   * Calculate rank changes by comparing current leaderboard with previous state
   */
  const calculateRankChanges = (leaderboardData: LeaderboardEntry[], bestTournamentsCount: number | null): LeaderboardEntry[] => {
    if (leaderboardData.length === 0) return leaderboardData;

    // Find the most recent tournament date
    let mostRecentDate: Date | null = null;
    for (const entry of leaderboardData) {
      if (entry.performances) {
        for (const perf of entry.performances) {
          const perfDate = new Date(perf.tournamentDate);
          if (!mostRecentDate || perfDate > mostRecentDate) {
            mostRecentDate = perfDate;
          }
        }
      }
    }

    if (!mostRecentDate) return leaderboardData;

    // Calculate previous leaderboard (without most recent tournament)
    const previousLeaderboard = leaderboardData.map(entry => {
      if (!entry.performances) return null;

      const previousPerfs = entry.performances.filter(
        perf => new Date(perf.tournamentDate).getTime() !== mostRecentDate!.getTime()
      );

      if (previousPerfs.length === 0) return null;

      const sortedPerfs = [...previousPerfs].sort((a, b) => b.totalPoints - a.totalPoints);
      const perfsToCount = bestTournamentsCount && bestTournamentsCount > 0
        ? sortedPerfs.slice(0, bestTournamentsCount)
        : sortedPerfs;

      const totalPoints = perfsToCount.reduce((sum, perf) => sum + perf.totalPoints, 0);

      return { playerId: entry.playerId, totalPoints };
    }).filter((entry): entry is { playerId: string; totalPoints: number } => entry !== null);

    previousLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    const previousRankMap = new Map<string, number>();
    previousLeaderboard.forEach((entry, index) => {
      previousRankMap.set(entry.playerId, index + 1);
    });

    return leaderboardData.map(entry => {
      const previousRank = previousRankMap.get(entry.playerId);
      if (previousRank === undefined) {
        return { ...entry, rankChange: undefined };
      }
      const rankChange = previousRank - entry.rank;
      return { ...entry, rankChange };
    });
  };

  const fetchLeaderboard = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/seasons/${seasonId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        const leaderboardWithChanges = calculateRankChanges(
          data.leaderboard || [],
          data.season?.bestTournamentsCount || null
        );
        setLeaderboard(leaderboardWithChanges);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPNG = async () => {
    if (!exportRef.current || !selectedSeason) return;

    setIsExporting(true);
    try {
      // Temporarily show the hidden export div
      const exportDiv = exportRef.current;
      exportDiv.style.position = 'fixed';
      exportDiv.style.left = '0';
      exportDiv.style.top = '0';
      exportDiv.style.zIndex = '9999';

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100));

      const filename = `Saison_${selectedSeason.year}_classement_general`;
      await exportToPNG({
        element: exportRef.current,
        filename,
        backgroundColor: '#0f172a', // Fond slate (design system unifié)
        pixelRatio: 3,
      });

      // Hide it again
      exportDiv.style.position = 'fixed';
      exportDiv.style.left = '-9999px';
      exportDiv.style.zIndex = '0';
    } catch (error) {
      console.error('Error exporting PNG:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (!selectedSeason && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Classement"
          description="Aucune saison disponible"
          icon={<Trophy className="h-10 w-10 text-primary" />}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Créez une saison pour voir le classement</p>
            <Button
              className="mt-4"
              onClick={() => router.push('/dashboard/seasons')}
            >
              Gérer les saisons
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classement"
        description={
          selectedSeason ? (
            <span className="flex items-center gap-2">
              {selectedSeason.name} {selectedSeason.year}
              {selectedSeason.status === 'ACTIVE' && (
                <Badge variant="default" className="text-xs">En cours</Badge>
              )}
            </span>
          ) : undefined
        }
        icon={<Trophy className="h-10 w-10 text-primary" />}
        actions={
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <Select
              value={selectedSeason?.id}
              onValueChange={handleSeasonChange}
            >
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder="Sélectionner une saison" />
              </SelectTrigger>
              <SelectContent className="w-[400px]">
                {seasons.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <span className="font-medium">
                        {season.name} {season.year}
                      </span>
                      {season.status === 'ACTIVE' && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {leaderboard.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPNG}
                disabled={isExporting}
                className="no-export"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Export...' : 'Export PNG'}
              </Button>
            )}
          </div>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Chargement du classement...</p>
          </CardContent>
        </Card>
      ) : leaderboard.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg font-medium">
              Aucun tournoi terminé pour cette saison
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Le classement sera disponible après le premier tournoi complété
            </p>
            {selectedSeason && (
              <Button
                className="mt-6"
                variant="outline"
                onClick={() => router.push('/dashboard/tournaments')}
              >
                Voir les tournois
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 podium */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            {leaderboard.slice(0, 3).map((entry, index) => (
              <Card key={entry.playerId} className={index === 0 ? 'border-primary border-2' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy
                        className={`h-6 w-6 ${
                          index === 0
                            ? 'text-yellow-500'
                            : index === 1
                            ? 'text-gray-400'
                            : 'text-orange-600'
                        }`}
                      />
                      <span className="text-3xl font-bold">{entry.rank}</span>
                    </div>
                    {isValidAvatarUrl(entry.player.avatar) && (
                      <img
                        src={normalizeAvatarSrc(entry.player.avatar)!}
                        alt={entry.player.nickname}
                        width={64}
                        height={64}
                        className="rounded-full"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                  <CardTitle className="text-xl">
                    {entry.player.firstName} {entry.player.lastName}
                  </CardTitle>
                  <CardDescription>@{entry.player.nickname}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-primary">{entry.totalPoints}</span>
                      <span className="text-sm text-muted-foreground">points</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>
                        <div className="font-bold text-foreground">{entry.victories}</div>
                        <div>Victoires</div>
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{entry.podiums}</div>
                        <div>Podiums</div>
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{entry.tournamentsCount}</div>
                        <div>Tournois</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reste du classement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Classement complet
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Zone Master indicator */}
              <div className="flex items-center justify-center gap-2 py-3 mb-4 bg-gradient-to-r from-yellow-500/10 via-yellow-500/20 to-yellow-500/10 rounded-lg border border-yellow-500/30">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-yellow-600">Zone Master - Top 10</span>
                <Star className="h-5 w-5 text-yellow-500" />
              </div>

              <div className="space-y-2">
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
                      className={`flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer ${
                        entry.rank <= 3
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : entry.rank <= 10
                          ? 'bg-yellow-500/5 border-yellow-500/20'
                          : ''
                      }`}
                      onClick={() => router.push(`/dashboard/players/${entry.playerId}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-16">
                          {entry.rank <= 3 && (
                            <Trophy className={`h-5 w-5 ${
                              entry.rank === 1 ? 'text-yellow-500' : entry.rank === 2 ? 'text-gray-400' : 'text-orange-600'
                            }`} />
                          )}
                          {entry.rank > 3 && entry.rank <= 10 && (
                            <Medal className="h-5 w-5 text-yellow-500/70" />
                          )}
                          <span className={`text-lg font-bold ${entry.rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {entry.rank}
                          </span>
                        </div>
                      {isValidAvatarUrl(entry.player.avatar) ? (
                        <img
                          src={normalizeAvatarSrc(entry.player.avatar)!}
                          alt={entry.player.nickname}
                          width={40}
                          height={40}
                          className="rounded-full"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">
                          {entry.player.firstName} {entry.player.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">@{entry.player.nickname}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Points</div>
                        <div className="text-lg font-bold text-primary">{entry.totalPoints}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Moyenne</div>
                        <div className="text-sm font-medium">{entry.averagePoints}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Tournois</div>
                        <div className="text-sm font-medium">{entry.tournamentsCount}</div>
                      </div>
                      {/* Rank Change Indicator */}
                      <div className="w-16 flex justify-end">
                        {entry.rankChange === undefined ? (
                          <Badge variant="outline" className="text-blue-500 border-blue-500 text-xs">NEW</Badge>
                        ) : entry.rankChange > 0 ? (
                          <span className="flex items-center gap-1 text-green-500 font-semibold text-sm">
                            <TrendingUp className="h-4 w-4" />+{entry.rankChange}
                          </span>
                        ) : entry.rankChange < 0 ? (
                          <span className="flex items-center gap-1 text-red-500 font-semibold text-sm">
                            <TrendingDown className="h-4 w-4" />{entry.rankChange}
                          </span>
                        ) : (
                          <span className="flex items-center text-muted-foreground">
                            <Minus className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Zone d'export cachée - utilise le composant unifié */}
      {leaderboard.length > 0 && selectedSeason && (
        <div
          ref={exportRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
          }}
        >
          <LeaderboardExportPng
            seasonName={selectedSeason.name}
            seasonYear={selectedSeason.year}
            players={leaderboard.map(entry => ({
              rank: entry.rank,
              playerId: entry.playerId,
              nickname: entry.player.nickname,
              firstName: entry.player.firstName,
              lastName: entry.player.lastName,
              avatar: entry.player.avatar,
              totalPoints: entry.totalPoints,
              averagePoints: entry.averagePoints,
              tournamentsCount: entry.tournamentsCount,
              victories: entry.victories,
              podiums: entry.podiums,
              rankChange: entry.rankChange,
            }))}
            tournamentsPlayed={Math.max(...leaderboard.map(e => e.tournamentsCount))}
          />
        </div>
      )}
    </div>
  );
}
