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
  Share2,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import SeasonLeaderboardChart from '@/components/exports/SeasonLeaderboardChart';
import SeasonDetailedTable from '@/components/exports/SeasonDetailedTable';
import SeasonLeaderboardWithEliminations from '@/components/exports/SeasonLeaderboardWithEliminations';

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
  performances?: TournamentPerformance[];
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
  const [activeTab, setActiveTab] = useState('chart');

  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const eliminationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSeasonData();
  }, [seasonId]);

  const fetchSeasonData = async () => {
    try {
      // Fetch season info
      const seasonRes = await fetch(`/api/seasons/${seasonId}`);
      if (seasonRes.ok) {
        const seasonData = await seasonRes.json();
        setSeason(seasonData);
      }

      // Fetch leaderboard
      const leaderboardRes = await fetch(`/api/seasons/${seasonId}/leaderboard`);
      if (leaderboardRes.ok) {
        const leaderboardData = await leaderboardRes.json();
        setLeaderboard(leaderboardData.leaderboard || []);
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

  const handleExportImage = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(ref.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${filename}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Erreur lors de l\'export de l\'image');
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

  // Use real eliminations data
  const eliminationPlayers = leaderboard.map((entry, index) => {
    // Find eliminator stats for this player
    const stats = eliminatorStats.find((s) => s.eliminatorId === entry.playerId);

    // Calculate points change (difference between last 2 tournaments if available)
    let pointsChange = 0;
    if (entry.performances && entry.performances.length >= 2) {
      const sorted = [...entry.performances].sort(
        (a, b) => new Date(b.tournamentDate).getTime() - new Date(a.tournamentDate).getTime()
      );
      pointsChange = sorted[0].totalPoints - sorted[1].totalPoints;
    }

    return {
      rank: index + 1,
      nickname: entry.player.nickname,
      avatar: entry.player.avatar,
      totalPoints: entry.totalPoints,
      pointsChange,
      placeDirect: undefined, // Could be calculated if needed
      victims: stats?.victims || [],
    };
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
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
        <Badge variant="outline" className="text-lg">
          {leaderboard.length} joueurs
        </Badge>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            💡 Utilisez ces exports pour partager les stats de la saison sur WhatsApp,
            Facebook, ou les imprimer. Chaque export met en valeur différentes informations :
            les Top Sharks 🦈 pour les killers, le tableau détaillé pour l'évolution des points,
            et le classement avec éliminations pour les rivalités.
          </p>
        </CardContent>
      </Card>

      {/* Tabs for different export types */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
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
        </TabsList>

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
                    {isExporting ? 'Export...' : 'Télécharger PNG'}
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
                    {isExporting ? 'Export...' : 'Télécharger PNG'}
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
                    {isExporting ? 'Export...' : 'Télécharger PNG'}
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
            • Les images sont optimisées pour WhatsApp, Instagram et l'impression
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
