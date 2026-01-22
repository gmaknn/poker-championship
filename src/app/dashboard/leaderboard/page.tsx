'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, Users, Calendar, Download } from 'lucide-react';
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

type Season = {
  id: string;
  name: string;
  year: number;
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
        backgroundColor: '#0a0a0a',
        pixelRatio: 2,
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
                      <span className="text-3xl font-bold">#{entry.rank}</span>
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
              <CardTitle>Classement complet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/dashboard/players/${entry.playerId}`)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold w-8 ${entry.rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                        #{entry.rank}
                      </span>
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Zone d'export cachée - pour générer le PNG avec titre (fond sombre) */}
      {leaderboard.length > 0 && (
        <div
          ref={exportRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '0',
            width: '1200px',
            backgroundColor: '#0a0a0a',
            padding: '32px',
            color: '#fafafa',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fafafa', margin: '0 0 8px 0' }}>
              Classement Général - {selectedSeason?.name} {selectedSeason?.year}
            </h1>
            <p style={{ color: '#a1a1aa', margin: '0', fontSize: '16px' }}>
              {Math.max(...leaderboard.map(e => e.tournamentsCount))} tournoi(s) joué(s)
            </p>
          </div>

          {/* Podium Top 3 */}
          {leaderboard.length >= 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '48px', marginBottom: '40px' }}>
              {/* 2ème */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {isValidAvatarUrl(leaderboard[1].player.avatar) && (
                  <img
                    src={normalizeAvatarSrc(leaderboard[1].player.avatar)!}
                    alt=""
                    style={{ width: '72px', height: '72px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #a1a1aa' }}
                  />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#a1a1aa' }}>#2</div>
                  <div style={{ fontWeight: '600', color: '#fafafa', fontSize: '16px' }}>{leaderboard[1].player.firstName} {leaderboard[1].player.lastName}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d4d4d8' }}>{leaderboard[1].totalPoints} pts</div>
                </div>
              </div>

              {/* 1er */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Trophy style={{ width: '40px', height: '40px', marginBottom: '8px', color: '#eab308' }} />
                {isValidAvatarUrl(leaderboard[0].player.avatar) && (
                  <img
                    src={normalizeAvatarSrc(leaderboard[0].player.avatar)!}
                    alt=""
                    style={{ width: '88px', height: '88px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #eab308' }}
                  />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#eab308' }}>#1</div>
                  <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#fafafa' }}>{leaderboard[0].player.firstName} {leaderboard[0].player.lastName}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#facc15' }}>{leaderboard[0].totalPoints} pts</div>
                </div>
              </div>

              {/* 3ème */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {isValidAvatarUrl(leaderboard[2].player.avatar) && (
                  <img
                    src={normalizeAvatarSrc(leaderboard[2].player.avatar)!}
                    alt=""
                    style={{ width: '72px', height: '72px', borderRadius: '50%', marginBottom: '12px', border: '4px solid #ea580c' }}
                  />
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ea580c' }}>#3</div>
                  <div style={{ fontWeight: '600', color: '#fafafa', fontSize: '16px' }}>{leaderboard[2].player.firstName} {leaderboard[2].player.lastName}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fb923c' }}>{leaderboard[2].totalPoints} pts</div>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fafafa' }}>
            <thead>
              <tr style={{ backgroundColor: '#27272a' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', border: '1px solid #3f3f46', color: '#fafafa', fontSize: '14px' }}>Rang</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', border: '1px solid #3f3f46', color: '#fafafa', fontSize: '14px' }}>Joueur</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', border: '1px solid #3f3f46', color: '#fafafa', fontSize: '14px' }}>Points</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', border: '1px solid #3f3f46', color: '#fafafa', fontSize: '14px' }}>Moyenne</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', border: '1px solid #3f3f46', color: '#fafafa', fontSize: '14px' }}>Tournois</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.playerId} style={{ backgroundColor: entry.rank <= 3 ? '#1c1917' : '#18181b' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', border: '1px solid #3f3f46', color: entry.rank === 1 ? '#eab308' : entry.rank === 2 ? '#a1a1aa' : entry.rank === 3 ? '#ea580c' : '#fafafa' }}>#{entry.rank}</td>
                  <td style={{ padding: '12px 16px', border: '1px solid #3f3f46', color: '#fafafa' }}>
                    {entry.player.firstName} {entry.player.lastName}
                    <span style={{ color: '#71717a', marginLeft: '8px' }}>@{entry.player.nickname}</span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #3f3f46', color: '#22c55e', fontSize: '16px' }}>{entry.totalPoints}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', border: '1px solid #3f3f46', color: '#d4d4d8' }}>{entry.averagePoints}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', border: '1px solid #3f3f46', color: '#d4d4d8' }}>{entry.tournamentsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
