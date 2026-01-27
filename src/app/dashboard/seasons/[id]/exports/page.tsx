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
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import { preloadImagesAsBase64 } from '@/lib/preload-images';
import SeasonLeaderboardChart from '@/components/exports/SeasonLeaderboardChart';
import SeasonDetailedTable from '@/components/exports/SeasonDetailedTable';
import SeasonLeaderboardWithEliminations from '@/components/exports/SeasonLeaderboardWithEliminations';
import SeasonEvolutionChart from '@/components/exports/SeasonEvolutionChart';
import SeasonConfrontationsMatrix from '@/components/exports/SeasonConfrontationsMatrix';
import LeaderboardExportPng from '@/components/exports/LeaderboardExportPng';
import TournamentExportPng from '@/components/exports/TournamentExportPng';

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

export default function SeasonExportsPage() {
  const params = useParams();
  const router = useRouter();
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

  const chartRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const eliminationsRef = useRef<HTMLDivElement>(null);
  const evolutionRef = useRef<HTMLDivElement>(null);
  const confrontationsRef = useRef<HTMLDivElement>(null);
  const generalLeaderboardRef = useRef<HTMLDivElement>(null);
  const tournamentExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSeasonData();
  }, [seasonId]);

  // Fetch tournament data when selection changes
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
        // Store tournaments list (sorted from most recent to oldest)
        const tournamentsList = (detailsData.tournaments || []).reverse();
        setTournaments(tournamentsList);
        // Select the most recent tournament by default
        if (tournamentsList.length > 0) {
          setSelectedTournamentId(tournamentsList[0].id);
        }
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
      // Pré-charger les images externes en base64 pour éviter les problèmes CORS
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

  // Fonction utilitaire pour convertir un data URL en Blob sans fetch
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleExportAll = async () => {
    if (!chartRef.current || !tableRef.current || !eliminationsRef.current || !evolutionRef.current || !confrontationsRef.current || !generalLeaderboardRef.current || !season) return;

    setIsExporting(true);
    const zip = new JSZip();
    const exportFunction = exportFormat === 'png' ? toPng : toJpeg;

    // Options de base pour html-to-image
    const baseOptions = {
      pixelRatio: 3,
      quality: exportFormat === 'jpg' ? 0.95 : undefined,
      cacheBust: true,
      skipFonts: true,
    };

    const slateOptions = { ...baseOptions, backgroundColor: '#0f172a' };
    const whiteOptions = { ...baseOptions, backgroundColor: '#ffffff' };

    // Liste des exports à effectuer séquentiellement
    const exports = [
      { ref: chartRef, name: `${season.name}_sharks`, options: whiteOptions, label: 'Top Sharks' },
      { ref: tableRef, name: `${season.name}_tableau`, options: slateOptions, label: 'Tableau détaillé' },
      { ref: eliminationsRef, name: `${season.name}_eliminations`, options: slateOptions, label: 'Éliminations' },
      { ref: evolutionRef, name: `${season.name}_evolution`, options: slateOptions, label: 'Évolution' },
      { ref: confrontationsRef, name: `${season.name}_confrontations`, options: slateOptions, label: 'Confrontations' },
      { ref: generalLeaderboardRef, name: `Saison_${season.year}_classement_general`, options: slateOptions, label: 'Classement général' },
    ];

    let successCount = 0;
    const errors: string[] = [];

    // Capture séquentielle avec try/catch individuel
    for (const exp of exports) {
      if (!exp.ref.current) {
        console.warn(`[ZIP Export] Ref manquante pour ${exp.label}`);
        errors.push(`${exp.label}: référence manquante`);
        continue;
      }

      try {
        console.log(`[ZIP Export] Début capture: ${exp.label}`);
        // Pré-charger les images externes en base64
        await preloadImagesAsBase64(exp.ref.current);
        const dataUrl = await exportFunction(exp.ref.current, exp.options);
        console.log(`[ZIP Export] Capture réussie: ${exp.label} (${dataUrl.length} chars)`);

        const blob = dataUrlToBlob(dataUrl);
        zip.file(`${exp.name}.${exportFormat}`, blob);
        successCount++;
        console.log(`[ZIP Export] Ajouté au ZIP: ${exp.name}.${exportFormat}`);
      } catch (error) {
        console.error(`[ZIP Export] Erreur capture ${exp.label}:`, error);
        errors.push(`${exp.label}: ${error instanceof Error ? error.message : 'erreur inconnue'}`);
      }
    }

    // Générer le ZIP même si certaines captures ont échoué
    if (successCount > 0) {
      try {
        console.log(`[ZIP Export] Génération du ZIP avec ${successCount} fichiers...`);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        console.log(`[ZIP Export] ZIP généré: ${zipBlob.size} bytes`);

        // Téléchargement via création d'un lien
        const link = document.createElement('a');
        link.download = `${season.name}_exports_${new Date().getTime()}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        console.log(`[ZIP Export] Téléchargement lancé`);
      } catch (zipError) {
        console.error('[ZIP Export] Erreur génération ZIP:', zipError);
        alert('Erreur lors de la création du fichier ZIP');
      }
    }

    if (errors.length > 0) {
      console.warn(`[ZIP Export] ${errors.length} erreur(s):`, errors);
      if (successCount === 0) {
        alert(`Échec de l'export. Erreurs:\n${errors.join('\n')}`);
      } else {
        alert(`Export partiel (${successCount}/${exports.length} fichiers).\nErreurs:\n${errors.join('\n')}`);
      }
    }

    setIsExporting(false);
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

  // Use real tournament details data - include avatar info
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
      firstName: entry.player.firstName,
      lastName: entry.player.lastName,
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
          {/* TODO: Réactiver quand le bug ZIP sera corrigé
          <Button
            onClick={handleExportAll}
            disabled={isExporting}
            size="lg"
            className="gap-2"
          >
            <Download className="h-5 w-5" />
            {isExporting ? 'Export en cours...' : 'Tout télécharger (ZIP)'}
          </Button>
          */}
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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="tournaments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Tournois
          </TabsTrigger>
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

        {/* Export: Individual Tournament */}
        <TabsContent value="tournaments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Export Tournoi</CardTitle>
                  {tournaments.length > 0 && (
                    <Select
                      value={selectedTournamentId}
                      onValueChange={setSelectedTournamentId}
                    >
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Sélectionner un tournoi" />
                      </SelectTrigger>
                      <SelectContent>
                        {tournaments.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            Tournoi #{t.number} - {new Date(t.date).toLocaleDateString('fr-FR')}
                            {t.name && ` (${t.name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {selectedTournamentData && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleExportImage(
                        tournamentExportRef,
                        `Tournoi_${tournaments.find(t => t.id === selectedTournamentId)?.number || 'export'}`,
                        undefined,
                        '#0f172a'
                      )}
                      disabled={isExporting || isLoadingTournament}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isExporting ? 'Export...' : `Télécharger ${exportFormat.toUpperCase()}`}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {tournaments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Aucun tournoi joué pour le moment</p>
                  <p className="text-sm">Les tournois terminés apparaîtront ici</p>
                </div>
              ) : isLoadingTournament ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Chargement du tournoi...</p>
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
                  <p>Sélectionnez un tournoi pour voir les résultats</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export #0: General Leaderboard */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Classement Général</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportImage(generalLeaderboardRef, `Saison_${season.year}_classement_general`, undefined, '#0f172a')}
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
                    onClick={() => handleExportImage(tableRef, `${season.name}_tableau`, undefined, '#0f172a')}
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
                      handleExportImage(eliminationsRef, `${season.name}_eliminations`, undefined, '#0f172a')
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
                      handleExportImage(evolutionRef, `${season.name}_evolution`, undefined, '#0f172a')
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
                      handleExportImage(confrontationsRef, `${season.name}_confrontations`, undefined, '#0f172a')
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
