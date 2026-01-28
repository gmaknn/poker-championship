'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  ArrowLeft,
  BarChart3,
  Table2,
  Users,
  TrendingUp,
  Swords,
  Trophy,
  Calendar,
  DollarSign,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toPng, toJpeg } from 'html-to-image';
import { preloadImagesAsBase64 } from '@/lib/preload-images';
import { useCurrentPlayer } from '@/components/layout/player-nav';
import SeasonLeaderboardChart from '@/components/exports/SeasonLeaderboardChart';
import SeasonDetailedTable from '@/components/exports/SeasonDetailedTable';
import SeasonLeaderboardWithEliminations from '@/components/exports/SeasonLeaderboardWithEliminations';
import SeasonEvolutionChart from '@/components/exports/SeasonEvolutionChart';
import SeasonConfrontationsMatrix from '@/components/exports/SeasonConfrontationsMatrix';
import LeaderboardExportPngLight from '@/components/exports/LeaderboardExportPngLight';
import TournamentExportPng from '@/components/exports/TournamentExportPng';
import PlayerStatsExportPng, { PlayerStatsExportPlayer } from '@/components/exports/PlayerStatsExportPng';

type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
};

type Player = {
  id: string;
  nickname: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
};

type LeaderboardEntry = {
  playerId: string;
  player: Player;
  totalPoints: number;
  tournamentsPlayed: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  totalEliminations: number;
  totalLeaderKills: number;
  totalRebuys: number;
  performances: TournamentPerformance[];
  rankChange?: number;
};

type TournamentPerformance = {
  tournamentId: string;
  tournamentName: string | null;
  tournamentDate: Date;
  finalRank: number | null;
  totalPoints: number;
  eliminationsCount: number;
  leaderKills: number;
  rebuysCount: number;
};

type TournamentResult = {
  tournamentId: string;
  tournamentNumber: number;
  points: number;
  rank?: number;
};

type PlayerDetail = {
  rank: number;
  playerId: string;
  player: Player;
  totalPoints: number;
  tournamentResults: TournamentResult[];
};

type EliminatorStats = {
  eliminatorId: string;
  eliminatorNickname: string;
  totalEliminations: number;
  victims: Array<{
    nickname: string;
    count: number;
  }>;
};

type TournamentInfo = {
  id: string;
  number: number;
  name: string | null;
  date: string;
};

type TournamentData = {
  id: string;
  name: string | null;
  date: string;
  buyInAmount: number;
  lightRebuyAmount: number;
  prizePool: number | null;
  tournamentPlayers: Array<{
    playerId: string;
    player: Player;
    finalRank: number | null;
    rankPoints: number;
    eliminationPoints: number;
    bonusPoints: number;
    penaltyPoints: number;
    totalPoints: number;
    prizeAmount: number | null;
    eliminationsCount: number;
    bustEliminations: number;
    leaderKills: number;
    rebuysCount: number;
  }>;
};

export default function PlayerSeasonExportsPage() {
  const params = useParams();
  const router = useRouter();
  const { currentPlayer, isLoading: isLoadingPlayer } = useCurrentPlayer();
  const seasonId = params.id as string;

  const [season, setSeason] = useState<Season | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournamentDetails, setTournamentDetails] = useState<PlayerDetail[]>([]);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [eliminatorStats, setEliminatorStats] = useState<EliminatorStats[]>([]);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [selectedTournamentData, setSelectedTournamentData] = useState<TournamentData | null>(null);
  const [isLoadingTournament, setIsLoadingTournament] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('tournaments');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
  const [playerStats, setPlayerStats] = useState<PlayerStatsExportPlayer[]>([]);

  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const eliminationsRef = useRef<HTMLDivElement>(null);
  const evolutionRef = useRef<HTMLDivElement>(null);
  const confrontationsRef = useRef<HTMLDivElement>(null);
  const generalLeaderboardRef = useRef<HTMLDivElement>(null);
  const tournamentExportRef = useRef<HTMLDivElement>(null);
  const playerStatsRef = useRef<HTMLDivElement>(null);

  // Check permissions
  useEffect(() => {
    if (!isLoadingPlayer && currentPlayer) {
      if (currentPlayer.role !== 'ANIMATOR' && currentPlayer.role !== 'ADMIN') {
        router.push('/player');
      }
    } else if (!isLoadingPlayer && !currentPlayer) {
      router.push('/player/login');
    }
  }, [currentPlayer, isLoadingPlayer, router]);

  useEffect(() => {
    if (currentPlayer && (currentPlayer.role === 'ANIMATOR' || currentPlayer.role === 'ADMIN')) {
      fetchSeasonData();
    }
  }, [seasonId, currentPlayer]);

  useEffect(() => {
    if (selectedTournamentId) {
      fetchTournamentData(selectedTournamentId);
    }
  }, [selectedTournamentId]);

  const fetchTournamentData = async (tournamentId: string) => {
    setIsLoadingTournament(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTournamentData(data);
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
    } finally {
      setIsLoadingTournament(false);
    }
  };

  const calculateRankChanges = (leaderboardData: LeaderboardEntry[], bestTournamentsCount: number | null): LeaderboardEntry[] => {
    if (leaderboardData.length === 0) return leaderboardData;

    let mostRecentDate: Date | null = null;
    for (const entry of leaderboardData) {
      for (const perf of entry.performances) {
        const perfDate = new Date(perf.tournamentDate);
        if (!mostRecentDate || perfDate > mostRecentDate) {
          mostRecentDate = perfDate;
        }
      }
    }

    if (!mostRecentDate) return leaderboardData;

    const previousLeaderboard = leaderboardData.map(entry => {
      const previousPerfs = entry.performances.filter(
        perf => new Date(perf.tournamentDate).getTime() !== mostRecentDate!.getTime()
      );

      if (previousPerfs.length === 0) return null;

      const sortedPerfs = [...previousPerfs].sort((a, b) => b.totalPoints - a.totalPoints);
      const perfsToCount = bestTournamentsCount && bestTournamentsCount > 0
        ? sortedPerfs.slice(0, bestTournamentsCount)
        : sortedPerfs;

      const totalPoints = perfsToCount.reduce((sum, perf) => sum + perf.totalPoints, 0);

      return {
        playerId: entry.playerId,
        totalPoints,
      };
    }).filter((entry): entry is { playerId: string; totalPoints: number } => entry !== null);

    previousLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    const previousRankMap = new Map<string, number>();
    previousLeaderboard.forEach((entry, index) => {
      previousRankMap.set(entry.playerId, index + 1);
    });

    const sortedCurrent = [...leaderboardData].sort((a, b) => b.totalPoints - a.totalPoints);

    return sortedCurrent.map((entry, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankMap.get(entry.playerId);
      if (previousRank === undefined) {
        return { ...entry, rankChange: undefined };
      }

      const rankChange = previousRank - currentRank;
      return { ...entry, rankChange };
    });
  };

  const fetchSeasonData = async () => {
    try {
      const seasonRes = await fetch(`/api/seasons/${seasonId}`);
      let seasonData = null;
      if (seasonRes.ok) {
        seasonData = await seasonRes.json();
        setSeason(seasonData);
      }

      const leaderboardRes = await fetch(`/api/seasons/${seasonId}/leaderboard`);
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        const leaderboardWithChanges = calculateRankChanges(
          leaderboardData.leaderboard || [],
          seasonData?.bestTournamentsCount || null
        );
        setLeaderboard(leaderboardWithChanges);
      }

      const detailsRes = await fetch(`/api/seasons/${seasonId}/tournament-details`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setTournamentDetails(detailsData.players || []);
        setTournamentCount(detailsData.tournamentCount || 0);
        const tournamentsList = (detailsData.tournaments || []).reverse();
        setTournaments(tournamentsList);
        if (tournamentsList.length > 0) {
          setSelectedTournamentId(tournamentsList[0].id);
        }
      }

      const eliminationsRes = await fetch(`/api/seasons/${seasonId}/eliminations`);
      if (eliminationsRes.ok) {
        const eliminationsData = await eliminationsRes.json();
        setEliminatorStats(eliminationsData.eliminatorStats || []);
      }

      // Fetch player stats for Stats tab
      const playerStatsRes = await fetch(`/api/seasons/${seasonId}/player-stats`);
      if (playerStatsRes.ok) {
        const playerStatsData = await playerStatsRes.json();
        setPlayerStats(playerStatsData.players || []);
      }

    } catch (error) {
      console.error('Error fetching season data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportImage = async (ref: React.RefObject<HTMLDivElement | null>, filename: string, format?: 'png' | 'jpg', bgColor?: string) => {
    if (!ref.current) return;

    const useFormat = format || exportFormat;
    setIsExporting(true);
    try {
      await preloadImagesAsBase64(ref.current);

      const exportFunction = useFormat === 'png' ? toPng : toJpeg;
      const dataUrl = await exportFunction(ref.current, {
        backgroundColor: bgColor || '#ffffff',
        pixelRatio: 3,
        quality: useFormat === 'jpg' ? 0.95 : undefined,
        cacheBust: true,
        skipFonts: true,
      });

      const link = document.createElement('a');
      link.download = `${filename}_${new Date().getTime()}.${useFormat}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Erreur lors de l\'export de l\'image');
    } finally {
      setIsExporting(false);
    }
  };

  // Show loading
  if (isLoadingPlayer || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Check permissions
  if (!currentPlayer || (currentPlayer.role !== 'ANIMATOR' && currentPlayer.role !== 'ADMIN')) {
    return null;
  }

  if (!season) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Saison non trouvee</p>
      </div>
    );
  }

  // Transform data for components
  const chartPlayers = leaderboard
    .sort((a, b) => b.totalEliminations - a.totalEliminations)
    .slice(0, 20)
    .map((entry, index) => ({
      rank: index + 1,
      nickname: entry.player.nickname,
      avatar: entry.player.avatar,
      totalEliminations: entry.totalEliminations,
      leaderKills: entry.totalLeaderKills,
      tournamentsPlayed: entry.tournamentsPlayed,
    }));

  const detailedPlayers = tournamentDetails.length > 0
    ? tournamentDetails.map((detail) => ({
        rank: detail.rank,
        nickname: detail.player.nickname,
        firstName: detail.player.firstName,
        lastName: detail.player.lastName,
        avatar: detail.player.avatar,
        totalPoints: detail.totalPoints,
        tournamentResults: detail.tournamentResults,
      }))
    : leaderboard.map((entry, index) => ({
        rank: index + 1,
        nickname: entry.player.nickname,
        firstName: entry.player.firstName,
        lastName: entry.player.lastName,
        avatar: entry.player.avatar,
        totalPoints: entry.totalPoints,
        tournamentResults: [],
      }));

  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  const eliminationPlayers = sortedLeaderboard.map((entry, index) => {
    const stats = eliminatorStats.find((s) => s.eliminatorId === entry.playerId);

    let pointsChange = 0;
    if (entry.performances && entry.performances.length > 0) {
      const sortedByDate = [...entry.performances].sort(
        (a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime()
      );
      pointsChange = sortedByDate[0].totalPoints;
    }

    return {
      rank: index + 1,
      nickname: entry.player.nickname,
      firstName: entry.player.firstName,
      lastName: entry.player.lastName,
      avatar: entry.player.avatar,
      totalPoints: entry.totalPoints,
      pointsChange,
      victims: stats?.victims || [],
    };
  });

  const confrontationsData = (() => {
    const confrontations: Array<{
      eliminatorId: string;
      eliminatorNickname: string;
      eliminatedId: string;
      eliminatedNickname: string;
      count: number;
    }> = [];

    eliminatorStats.forEach((stat) => {
      stat.victims.forEach((victim) => {
        const victimEntry = leaderboard.find(
          (e) => e.player.nickname === victim.nickname
        );
        if (victimEntry) {
          confrontations.push({
            eliminatorId: stat.eliminatorId,
            eliminatorNickname: stat.eliminatorNickname,
            eliminatedId: victimEntry.playerId,
            eliminatedNickname: victim.nickname,
            count: victim.count,
          });
        }
      });
    });

    const playersStats = leaderboard.map((entry) => {
      const totalKills = eliminatorStats.find(
        (s) => s.eliminatorId === entry.playerId
      )?.totalEliminations || 0;

      const totalDeaths = confrontations
        .filter((c) => c.eliminatedId === entry.playerId)
        .reduce((sum, c) => sum + c.count, 0);

      return {
        id: entry.playerId,
        nickname: entry.player.nickname,
        totalKills,
        totalDeaths,
      };
    });

    return { confrontations, players: playersStats };
  })();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/player/seasons')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Exports Visuels</h1>
            <p className="text-muted-foreground">
              {season.name} ({season.year})
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg self-start">
          {leaderboard.length} joueurs
        </Badge>
      </div>

      {/* Format selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Exportez les classements et statistiques pour les partager sur WhatsApp ou les imprimer.
            </p>
            <div className="flex gap-2">
              <Button
                variant={exportFormat === 'png' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('png')}
              >
                PNG
              </Button>
              <Button
                variant={exportFormat === 'jpg' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('jpg')}
              >
                JPG
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7">
          <TabsTrigger value="tournaments" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Tournois</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Classement</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Sharks</span>
          </TabsTrigger>
          <TabsTrigger value="eliminations" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Elims</span>
          </TabsTrigger>
          <TabsTrigger value="evolution" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Evolution</span>
          </TabsTrigger>
          <TabsTrigger value="confrontations" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Swords className="h-4 w-4" />
            <span className="hidden sm:inline">Duels</span>
          </TabsTrigger>
        </TabsList>

        {/* Tournament Export */}
        <TabsContent value="tournaments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <CardTitle>Export Tournoi</CardTitle>
                  {tournaments.length > 0 && (
                    <Select
                      value={selectedTournamentId}
                      onValueChange={setSelectedTournamentId}
                    >
                      <SelectTrigger className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Selectionner un tournoi" />
                      </SelectTrigger>
                      <SelectContent>
                        {tournaments.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            Tournoi #{t.number} - {new Date(t.date).toLocaleDateString('fr-FR')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedTournamentData && (
                  <Button
                    onClick={() => handleExportImage(
                      tournamentExportRef,
                      `Tournoi_${tournaments.find(t => t.id === selectedTournamentId)?.number || 'export'}`,
                      undefined,
                      '#f8fafc'
                    )}
                    disabled={isExporting || isLoadingTournament}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Export...' : `Telecharger`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun tournoi joue pour le moment</p>
                </div>
              ) : isLoadingTournament ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : selectedTournamentData ? (
                <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                  <div ref={tournamentExportRef}>
                    <TournamentExportPng
                      tournamentName={selectedTournamentData.name || ''}
                      tournamentDate={selectedTournamentData.date}
                      tournamentNumber={tournaments.find(t => t.id === selectedTournamentId)?.number}
                      seasonName={season?.name || ''}
                      seasonYear={season?.year || 0}
                      buyInAmount={selectedTournamentData.buyInAmount}
                      prizePool={selectedTournamentData.prizePool}
                      players={selectedTournamentData.tournamentPlayers
                        .filter(tp => tp.finalRank !== null)
                        .sort((a, b) => (a.finalRank || 999) - (b.finalRank || 999))
                        .map(tp => ({
                          rank: tp.finalRank || 0,
                          playerId: tp.playerId,
                          nickname: tp.player.nickname,
                          firstName: tp.player.firstName,
                          lastName: tp.player.lastName,
                          avatar: tp.player.avatar,
                          rankPoints: tp.rankPoints,
                          eliminationPoints: tp.eliminationPoints,
                          bonusPoints: tp.bonusPoints,
                          penaltyPoints: tp.penaltyPoints || 0,
                          totalPoints: tp.totalPoints,
                          prizeAmount: tp.prizeAmount,
                          eliminationsCount: tp.eliminationsCount || tp.bustEliminations || 0,
                          leaderKills: tp.leaderKills,
                          rebuysCount: tp.rebuysCount,
                        }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Selectionnez un tournoi</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Leaderboard (Light theme) */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Classement General</CardTitle>
                <Button
                  onClick={() => handleExportImage(generalLeaderboardRef, `Saison_${season.year}_classement`, undefined, '#f8fafc')}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Telecharger'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={generalLeaderboardRef}>
                  <LeaderboardExportPngLight
                    seasonName={season.name}
                    seasonYear={season.year}
                    players={sortedLeaderboard.map((entry, index) => ({
                      rank: index + 1,
                      playerId: entry.playerId,
                      nickname: entry.player.nickname,
                      firstName: entry.player.firstName,
                      lastName: entry.player.lastName,
                      avatar: entry.player.avatar,
                      totalPoints: entry.totalPoints,
                      averagePoints: entry.tournamentsPlayed > 0 ? Math.round(entry.totalPoints / entry.tournamentsPlayed) : 0,
                      tournamentsCount: entry.tournamentsPlayed,
                      victories: entry.firstPlaces,
                      podiums: entry.firstPlaces + entry.secondPlaces + entry.thirdPlaces,
                      rankChange: entry.rankChange,
                    }))}
                    tournamentsPlayed={tournamentCount}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Player Stats */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Stats Joueurs</CardTitle>
                <Button
                  onClick={() => handleExportImage(playerStatsRef, `Saison_${season.year}_stats`, undefined, '#f8fafc')}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Telecharger'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={playerStatsRef}>
                  <PlayerStatsExportPng
                    seasonName={season.name}
                    seasonYear={season.year}
                    players={playerStats}
                    tournamentsPlayed={tournamentCount}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sharks Chart */}
        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Sharks</CardTitle>
                <Button
                  onClick={() => handleExportImage(chartRef, `${season.name}_sharks`)}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Telecharger'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={chartRef}>
                  <SeasonLeaderboardChart
                    seasonName={season.name}
                    players={chartPlayers}
                    maxPlayers={20}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TODO: Onglet masqué car doublon avec Évolution
        {/* Detailed Table *}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tableau Detaille</CardTitle>
                <Button
                  onClick={() => handleExportImage(tableRef, `${season.name}_tableau`, undefined, '#f8fafc')}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Telecharger'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={tableRef}>
                  <SeasonDetailedTable
                    seasonName={season.name}
                    players={detailedPlayers}
                    tournamentCount={tournamentCount || 0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        */}

        {/* Eliminations */}
        <TabsContent value="eliminations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Avec Eliminations</CardTitle>
                <Button
                  onClick={() => handleExportImage(eliminationsRef, `${season.name}_eliminations`, undefined, '#f8fafc')}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Telecharger'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={eliminationsRef}>
                  <SeasonLeaderboardWithEliminations
                    seasonName={season.name}
                    players={eliminationPlayers}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evolution */}
        <TabsContent value="evolution" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Evolution</CardTitle>
                <Button
                  onClick={() => handleExportImage(evolutionRef, `${season.name}_evolution`, undefined, '#f8fafc')}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Telecharger'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={evolutionRef}>
                  <SeasonEvolutionChart
                    seasonName={season.name}
                    players={detailedPlayers}
                    tournamentCount={tournamentCount}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Confrontations */}
        <TabsContent value="confrontations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Confrontations</CardTitle>
                <Button
                  onClick={() => handleExportImage(confrontationsRef, `${season.name}_confrontations`, undefined, '#f8fafc')}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Export...' : 'Telecharger'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={confrontationsRef}>
                  <SeasonConfrontationsMatrix
                    seasonName={season.name}
                    confrontations={confrontationsData.confrontations}
                    players={confrontationsData.players}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
