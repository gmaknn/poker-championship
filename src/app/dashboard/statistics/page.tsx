'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, Trophy, Calendar, Award, Clock, Printer, FileDown, FileSpreadsheet } from 'lucide-react';
import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';
import { PlayerTrendChart } from '@/components/charts/PlayerTrendChart';
import { SeasonComparisonChart } from '@/components/charts/SeasonComparisonChart';
import { TopPlayersChart } from '@/components/charts/TopPlayersChart';
import { exportStatisticsCSV, exportMonthlyDataCSV } from '@/lib/csvExportUtils';
import { exportToPDF } from '@/lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper function to check if avatar URL is valid
const isValidAvatarUrl = (url: string | null): boolean => {
  if (!url || url.trim() === '') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

interface StatisticsData {
  overview: {
    totalTournaments: number;
    finishedTournaments: number;
    totalPlayers: number;
    activePlayers: number;
    avgPlayersPerTournament: number;
    avgDurationHours: number;
  };
  seasonStats: Array<{
    id: string;
    name: string;
    status: string;
    isActive: boolean;
    totalTournaments: number;
    finishedTournaments: number;
    totalPlayers: number;
    totalEliminations: number;
    avgPlayersPerTournament: number;
  }>;
  topPlayers: Array<{
    id: string;
    name: string;
    nickname: string;
    avatar: string | null;
    tournamentsPlayed: number;
    lastTournament: string | null;
  }>;
  monthlyData: Array<{
    date: string;
    month: string;
    playerCount: number;
    tournamentName: string;
  }>;
}

export default function StatisticsPage() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/statistics')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Statistiques"
          description="Chargement..."
          icon={<BarChart3 className="h-10 w-10 text-primary" />}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Statistiques"
          description="Erreur de chargement"
          icon={<BarChart3 className="h-10 w-10 text-primary" />}
        />
      </div>
    );
  }

  const handleExportCSV = () => {
    exportStatisticsCSV({
      overview: data.overview,
      seasonStats: data.seasonStats.map(s => ({
        id: s.id,
        name: s.name,
        totalTournaments: s.totalTournaments,
        finishedTournaments: s.finishedTournaments,
        totalPlayers: s.totalPlayers,
        avgPlayersPerTournament: s.avgPlayersPerTournament,
      })),
      topPlayers: data.topPlayers,
    });
  };

  const handleExportMonthlyCSV = () => {
    exportMonthlyDataCSV({
      monthlyData: data.monthlyData,
    });
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('statistics-content');
    if (element) {
      try {
        await exportToPDF({
          element,
          filename: `statistiques_${new Date().toISOString().split('T')[0]}`,
          orientation: 'portrait',
        });
      } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Erreur lors de l\'export PDF');
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques"
        description="Analyses et statistiques du championnat"
        icon={<BarChart3 className="h-10 w-10 text-primary" />}
        actions={
          <div className="flex gap-2 no-print">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV - Statistiques complètes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportMonthlyCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV - Évolution mensuelle
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF - Page complète
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        }
      />

      <div id="statistics-content" className="space-y-6">
      {/* Vue d'ensemble */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tournois</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalTournaments}</div>
            <p className="text-xs text-muted-foreground">
              {data.overview.finishedTournaments} terminés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Joueurs actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.activePlayers}</div>
            <p className="text-xs text-muted-foreground">
              Sur {data.overview.totalPlayers} joueurs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne entrées</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgPlayersPerTournament}</div>
            <p className="text-xs text-muted-foreground">
              Par tournoi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durée moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgDurationHours}h</div>
            <p className="text-xs text-muted-foreground">
              Par tournoi
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Graphique comparaison saisons */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Comparaison des saisons
            </CardTitle>
            <CardDescription>
              Tournois et participation par saison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeasonComparisonChart data={data.seasonStats} />
            {data.seasonStats.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.seasonStats.map(season => (
                  <div key={season.id} className="flex items-center justify-between text-sm border-l-4 border-primary pl-3 py-1">
                    <div>
                      <span className="font-semibold">{season.name}</span>
                      {season.status === 'ACTIVE' && (
                        <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {season.totalTournaments} tournois • {season.totalPlayers} inscriptions
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graphique top joueurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Joueurs les plus actifs
            </CardTitle>
            <CardDescription>
              Top 5 des joueurs par nombre de tournois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopPlayersChart data={data.topPlayers} />
          </CardContent>
        </Card>
      </div>

      {/* Évolution mensuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution de la participation
          </CardTitle>
          <CardDescription>
            Tendance du nombre de joueurs sur les 12 derniers mois
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlayerTrendChart data={data.monthlyData} />
          {data.monthlyData.length > 0 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Historique des {data.monthlyData.length} derniers tournois
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
