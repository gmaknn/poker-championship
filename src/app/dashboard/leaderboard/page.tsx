'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Users, Calendar, Printer, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/PageHeader';
import { exportLeaderboardCSV } from '@/lib/csvExportUtils';
import { exportToPDF, exportSeasonLeaderboardText } from '@/lib/exportUtils';
import { generateSeasonReportPDF } from '@/lib/seasonReportPDF';

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

type Season = {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string | null;
  status: string;
  _count?: {
    tournaments: number;
  };
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
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchLeaderboard = async (seasonId: string) => {
    try {
      const response = await fetch(`/api/seasons/${seasonId}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!selectedSeason || leaderboard.length === 0) return;

    exportLeaderboardCSV({
      seasonName: selectedSeason.name,
      year: selectedSeason.year,
      players: leaderboard,
    });
  };

  const handleExportText = () => {
    if (!selectedSeason || leaderboard.length === 0) return;

    exportSeasonLeaderboardText({
      seasonName: selectedSeason.name,
      year: selectedSeason.year,
      players: leaderboard.map(entry => ({
        rank: entry.rank,
        player: {
          nickname: entry.player.nickname,
          firstName: entry.player.firstName,
          lastName: entry.player.lastName,
        },
        totalPoints: entry.totalPoints,
        tournamentsPlayed: entry.tournamentsCount,
        firstPlaces: entry.victories,
        secondPlaces: 0, // Would need to add this data
        thirdPlaces: entry.podiums - entry.victories,
      })),
      totalTournaments: selectedSeason._count?.tournaments || 0,
    });
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('leaderboard-content');
    if (element && selectedSeason) {
      try {
        await exportToPDF({
          element,
          filename: `classement_${selectedSeason.name.toLowerCase().replace(/\s+/g, '_')}_${selectedSeason.year}`,
          orientation: 'portrait',
        });
      } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Erreur lors de l\'export PDF');
      }
    }
  };

  const handleExportFullReport = async () => {
    if (!selectedSeason || leaderboard.length === 0) return;

    try {
      // Fetch tournament data for the season
      const tournamentResponse = await fetch(`/api/seasons/${selectedSeason.id}/tournaments`);
      const tournaments = await tournamentResponse.json();

      // Prepare tournament data
      const tournamentData = tournaments
        .filter((t: any) => t.status === 'FINISHED')
        .map((t: any) => ({
          name: t.name,
          date: t.date,
          playerCount: t.tournamentPlayers?.length || 0,
          winner: t.tournamentPlayers?.find((tp: any) => tp.finalRank === 1)?.player?.nickname || 'N/A',
          prizePool: t.prizePool || 0,
        }));

      // Calculate total entries
      const totalEntries = tournaments.reduce(
        (sum: number, t: any) => sum + (t.tournamentPlayers?.length || 0),
        0
      );

      // Calculate total prize pool
      const totalPrizePool = tournaments.reduce(
        (sum: number, t: any) => sum + (t.prizePool || 0),
        0
      );

      generateSeasonReportPDF({
        season: {
          name: selectedSeason.name,
          year: selectedSeason.year,
          startDate: selectedSeason.startDate,
          endDate: selectedSeason.endDate || new Date().toISOString(),
        },
        overview: {
          totalTournaments: tournaments.length,
          finishedTournaments: tournaments.filter((t: any) => t.status === 'FINISHED').length,
          totalPlayers: leaderboard.length,
          totalEntries,
          avgPlayersPerTournament: Math.round(totalEntries / tournaments.length) || 0,
          totalPrizePool,
        },
        leaderboard: leaderboard.map(entry => ({
          rank: entry.rank,
          player: {
            firstName: entry.player.firstName,
            lastName: entry.player.lastName,
            nickname: entry.player.nickname,
          },
          totalPoints: entry.totalPoints,
          tournamentsPlayed: entry.tournamentsCount,
          victories: entry.victories,
          podiums: entry.podiums,
          totalEliminations: 0, // Would need to add this data
        })),
        tournaments: tournamentData,
      });
    } catch (error) {
      console.error('Error generating full report:', error);
      alert('Erreur lors de la génération du rapport complet');
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
            <p className="text-muted-foreground">Aucune saison disponible pour le moment</p>
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
            {leaderboard.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="no-print">
                    <FileDown className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    CSV - Tableau Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportText}>
                    <FileText className="h-4 w-4 mr-2" />
                    Texte - WhatsApp/SMS
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileDown className="h-4 w-4 mr-2" />
                    PDF - Classement simple
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportFullReport}>
                    <FileDown className="h-4 w-4 mr-2" />
                    📊 Rapport complet de saison
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="no-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
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
          </div>
        }
      />

      <div id="leaderboard-content">
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
                      <span className="text-3xl font-bold">#{entry.rank}</span>
                    </div>
                    {isValidAvatarUrl(entry.player.avatar) && entry.player.avatar && (
                      <Image
                        src={entry.player.avatar}
                        alt={entry.player.nickname}
                        width={64}
                        height={64}
                        className="rounded-full"
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
              <CardTitle>Classement complet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/player/${entry.playerId}`)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold w-8 ${entry.rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                        #{entry.rank}
                      </span>
                      {isValidAvatarUrl(entry.player.avatar) && entry.player.avatar ? (
                        <Image
                          src={entry.player.avatar}
                          alt={entry.player.nickname}
                          width={40}
                          height={40}
                          className="rounded-full"
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </div>
  );
}
