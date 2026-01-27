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
} from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import SeasonLeaderboardChart from '@/components/exports/SeasonLeaderboardChart';
import SeasonDetailedTable from '@/components/exports/SeasonDetailedTable';
import SeasonLeaderboardWithEliminations from '@/components/exports/SeasonLeaderboardWithEliminations';
import SeasonEvolutionChart from '@/components/exports/SeasonEvolutionChart';
import SeasonConfrontationsMatrix from '@/components/exports/SeasonConfrontationsMatrix';
import LeaderboardExportPng from '@/components/exports/LeaderboardExportPng';

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
  rankChange?: number; // Positive = moved up, negative = moved down, undefined = new
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

export default function SeasonExportsPage() {
  const params = useParams();
  const router = useRouter();
  const seasonId = params.id as string;

  const [season, setSeason] = useState<Season | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tournamentDetails, setTournamentDetails] = useState<PlayerDetail[]>([]);
  const [tournamentCount, setTournamentCount] = useState(0);
  const [eliminatorStats, setEliminatorStats] = useState<EliminatorStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');

  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const eliminationsRef = useRef<HTMLDivElement>(null);
  const evolutionRef = useRef<HTMLDivElement>(null);
  const confrontationsRef = useRef<HTMLDivElement>(null);
  const generalLeaderboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSeasonData();
  }, [seasonId]);

  /**
   * Calculate rank changes by comparing current leaderboard with previous state
   * (simulated by removing the most recent tournament from everyone's performances)
   */
  const calculateRankChanges = (leaderboardData: LeaderboardEntry[], bestTournamentsCount: number | null): LeaderboardEntry[] => {
    if (leaderboardData.length === 0) return leaderboardData;

    // Find the most recent tournament date
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

    // Calculate previous leaderboard (without most recent tournament)
    const previousLeaderboard = leaderboardData.map(entry => {
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

    // Sort current leaderboard by points to get current ranks
    const sortedCurrent = [...leaderboardData].sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate rank changes
    return sortedCurrent.map((entry, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankMap.get(entry.playerId);
      if (previousRank === undefined) {
        // New player (no previous rank)
        return { ...entry, rankChange: undefined };
      }

      const rankChange = previousRank - currentRank; // Positive = moved up
      return { ...entry, rankChange };
    });
  };

  const fetchSeasonData = async () => {
    try {
      // Fetch season info
      const seasonRes = await fetch(`/api/seasons/${seasonId}`);
      let seasonData = null;
      if (seasonRes.ok) {
        seasonData = await seasonRes.json();
        setSeason(seasonData);
      }

      // Fetch leaderboard
      const leaderboardRes = await fetch(`/api/seasons/${seasonId}/leaderboard`);
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        // Calculate rank changes
        const leaderboardWithChanges = calculateRankChanges(
          leaderboardData.leaderboard || [],
          seasonData?.bestTournamentsCount || null
        );
        setLeaderboard(leaderboardWithChanges);
      }

      // Fetch tournament details
      const detailsRes = await fetch(`/api/seasons/${seasonId}/tournament-details`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setTournamentDetails(detailsData.players || []);
        setTournamentCount(detailsData.tournamentCount || 0);
      }

      // Fetch eliminations
      const eliminationsRes = await fetch(`/api/seasons/${seasonId}/eliminations`);
      if (eliminationsRes.ok) {
        const eliminationsData = await eliminationsRes.json();
        setEliminatorStats(eliminationsData.eliminatorStats || []);
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
      const exportFunction = useFormat === 'png' ? toPng : toJpeg;
      const dataUrl = await exportFunction(ref.current, {
        backgroundColor: bgColor || '#ffffff',
        pixelRatio: 3, // Increased for better quality
        quality: useFormat === 'jpg' ? 0.95 : undefined,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${filename}_${new Date().getTime()}.${useFormat}`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Erreur lors de l\'export de l\'image');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    if (!chartRef.current || !tableRef.current || !eliminationsRef.current || !evolutionRef.current || !confrontationsRef.current || !generalLeaderboardRef.current || !season) return;

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const exportFunction = exportFormat === 'png' ? toPng : toJpeg;
      const options = {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        quality: exportFormat === 'jpg' ? 0.95 : undefined,
        cacheBust: true,
      };

      // Export chart
      const chartDataUrl = await exportFunction(chartRef.current, options);
      const chartBlob = await (await fetch(chartDataUrl)).blob();
      zip.file(`${season.name}_sharks.${exportFormat}`, chartBlob);

      // Export table
      const tableDataUrl = await exportFunction(tableRef.current, options);
      const tableBlob = await (await fetch(tableDataUrl)).blob();
      zip.file(`${season.name}_tableau.${exportFormat}`, tableBlob);

      // Export eliminations
      const eliminationsDataUrl = await exportFunction(eliminationsRef.current, options);
      const eliminationsBlob = await (await fetch(eliminationsDataUrl)).blob();
      zip.file(`${season.name}_eliminations.${exportFormat}`, eliminationsBlob);

      // Export evolution
      const evolutionDataUrl = await exportFunction(evolutionRef.current, options);
      const evolutionBlob = await (await fetch(evolutionDataUrl)).blob();
      zip.file(`${season.name}_evolution.${exportFormat}`, evolutionBlob);

      // Export confrontations
      const confrontationsDataUrl = await exportFunction(confrontationsRef.current, options);
      const confrontationsBlob = await (await fetch(confrontationsDataUrl)).blob();
      zip.file(`${season.name}_confrontations.${exportFormat}`, confrontationsBlob);

      // Export general leaderboard
      const generalDataUrl = await exportFunction(generalLeaderboardRef.current, options);
      const generalBlob = await (await fetch(generalDataUrl)).blob();
      zip.file(`Saison_${season.year}_classement_general.${exportFormat}`, generalBlob);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.download = `${season.name}_exports_${new Date().getTime()}.zip`;
      link.href = URL.createObjectURL(zipBlob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error exporting all images:', error);
      alert('Erreur lors de l\'export groupé');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!season) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Saison non trouvée</p>
      </div>
    );
  }

  // Transform data for components - Sharks chart shows kills, not points
  const chartPlayers = leaderboard
    .sort((a, b) => b.totalEliminations - a.totalEliminations) // Sort by kills
    .slice(0, 20)
    .map((entry, index) => ({
      rank: index + 1,
      nickname: entry.player.nickname,
      avatar: entry.player.avatar,
      totalEliminations: entry.totalEliminations,
      leaderKills: entry.totalLeaderKills,
      tournamentsPlayed: entry.tournamentsPlayed,
    }));

  // Use real tournament details data
  const detailedPlayers = tournamentDetails.length > 0
    ? tournamentDetails.map((detail) => ({
        rank: detail.rank,
        nickname: detail.player.nickname,
        totalPoints: detail.totalPoints,
        tournamentResults: detail.tournamentResults,
      }))
    : leaderboard.map((entry, index) => ({
        rank: index + 1,
        nickname: entry.player.nickname,
        totalPoints: entry.totalPoints,
        tournamentResults: [],
      }));

  // Use real eliminations data - sort by totalPoints descending to ensure correct order
  const sortedLeaderboard = [...leaderboard].sort((a, b) => b.totalPoints - a.totalPoints);
  const eliminationPlayers = sortedLeaderboard.map((entry, index) => {
    // Find eliminator stats for this player
    const stats = eliminatorStats.find((s) => s.eliminatorId === entry.playerId);

    // Calculate points change = points gained in the most recent tournament
    // Sort performances by date (most recent first)
    let pointsChange = 0;
    if (entry.performances && entry.performances.length > 0) {
      const sortedByDate = [...entry.performances].sort(
        (a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime()
      );
      // "gain" = points from the most recent tournament
      pointsChange = sortedByDate[0].totalPoints;
    }

    return {
      rank: index + 1,
      nickname: entry.player.nickname,
      avatar: entry.player.avatar,
      totalPoints: entry.totalPoints,
      pointsChange,
      victims: stats?.victims || [],
    };
  });

  // Prepare confrontations data for matrix
  const confrontationsData = (() => {
    // Build confrontations list from eliminatorStats
    const confrontations: Array<{
      eliminatorId: string;
      eliminatorNickname: string;
      eliminatedId: string;
      eliminatedNickname: string;
      count: number;
    }> = [];

    // Build a map of playerId -> player for quick lookup
    const playerMap = new Map(leaderboard.map((e) => [e.playerId, e.player]));

    // Process eliminatorStats to extract confrontation pairs
    eliminatorStats.forEach((stat) => {
      stat.victims.forEach((victim) => {
        // We need to find the victim's playerId from the leaderboard
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

    // Build player stats (total kills and deaths)
    const playersStats = leaderboard.map((entry) => {
      const totalKills = eliminatorStats.find(
        (s) => s.eliminatorId === entry.playerId
      )?.totalEliminations || 0;

      // Count total deaths (how many times this player was eliminated)
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
    <div className="w-full px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/seasons/${seasonId}/leaderboard`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Exports Visuels</h1>
            <p className="text-muted-foreground">
              {season.name} ({season.year})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg">
            {leaderboard.length} joueurs
          </Badge>
          <Button
            onClick={handleExportAll}
            disabled={isExporting}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {isExporting ? 'Export en cours...' : 'Tout télécharger (ZIP)'}
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm text-muted-foreground flex-1">
              💡 Utilisez ces exports pour partager les stats de la saison sur WhatsApp,
              Facebook, ou les imprimer. Chaque export met en valeur différentes informations :
              les Top Sharks 🦈 pour les killers, le tableau détaillé pour l'évolution des points,
              et le classement avec éliminations pour les rivalités.
            </p>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-muted-foreground">
                Format d'export :
              </label>
              <div className="flex gap-2">
                <Button
                  variant={exportFormat === 'png' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('png')}
                >
                  PNG (Meilleure qualité)
                </Button>
                <Button
                  variant={exportFormat === 'jpg' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExportFormat('jpg')}
                >
                  JPG (Fichier plus léger)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different export types */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Classement
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Top Sharks 🦈
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Tableau Détaillé
          </TabsTrigger>
          <TabsTrigger value="eliminations" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Avec Éliminations
          </TabsTrigger>
          <TabsTrigger value="evolution" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Évolution
          </TabsTrigger>
          <TabsTrigger value="confrontations" className="flex items-center gap-2">
            <Swords className="h-4 w-4" />
            Confrontations
          </TabsTrigger>
        </TabsList>

        {/* Export #0: General Leaderboard */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Classement Général</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportImage(generalLeaderboardRef, `Saison_${season.year}_classement_general`, undefined, '#1a472a')}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Export...' : `Télécharger ${exportFormat.toUpperCase()}`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-gray-100 p-4 rounded-lg">
                <div ref={generalLeaderboardRef}>
                  <LeaderboardExportPng
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

        {/* Export #1: Sharks Chart */}
        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>🦈 Top Sharks - Les Tueurs</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportImage(chartRef, `${season.name}_graphique`)}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Export...' : `Télécharger ${exportFormat.toUpperCase()}`}
                  </Button>
                </div>
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

        {/* Export #2: Detailed Table */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tableau Détaillé par Tournoi</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportImage(tableRef, `${season.name}_tableau`)}
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Export...' : `Télécharger ${exportFormat.toUpperCase()}`}
                  </Button>
                </div>
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

        {/* Export #3: With Eliminations */}
        <TabsContent value="eliminations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Classement avec Éliminations</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      handleExportImage(eliminationsRef, `${season.name}_eliminations`)
                    }
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Export...' : `Télécharger ${exportFormat.toUpperCase()}`}
                  </Button>
                </div>
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

        {/* Export #4: Evolution Chart */}
        <TabsContent value="evolution" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Evolution du Classement</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      handleExportImage(evolutionRef, `${season.name}_evolution`)
                    }
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Export...' : `Télécharger ${exportFormat.toUpperCase()}`}
                  </Button>
                </div>
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

        {/* Export #5: Confrontations Matrix */}
        <TabsContent value="confrontations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>⚔️ Confrontations Directes - Qui élimine qui ?</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      handleExportImage(confrontationsRef, `${season.name}_confrontations`)
                    }
                    disabled={isExporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? 'Export...' : `Télécharger ${exportFormat.toUpperCase()}`}
                  </Button>
                </div>
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

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conseils d'utilisation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Top Sharks 🦈 :</strong> Classement des killers (nombre d'éliminations),
            idéal pour mettre en avant les joueurs agressifs
          </p>
          <p>
            • <strong>Tableau détaillé :</strong> Montre l'évolution tournoi par tournoi,
            utile pour analyser les performances en points
          </p>
          <p>
            • <strong>Avec éliminations :</strong> Met en avant les rivalités et les joueurs
            éliminés, amusant pour créer du storytelling
          </p>
          <p>
            • <strong>Évolution :</strong> Visualise les points gagnés/perdus à chaque journée,
            avec code couleur vert/rouge
          </p>
          <p>
            • <strong>Confrontations :</strong> Matrice "qui élimine qui" pour voir les rivalités
            directes entre joueurs
          </p>
          <p>
            • Les images sont optimisées pour WhatsApp, Instagram et l'impression
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
