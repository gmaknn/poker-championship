'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Trophy, Calendar, Award, Clock } from 'lucide-react';
import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques"
        description="Analyses et statistiques du championnat"
        icon={<BarChart3 className="h-10 w-10 text-primary" />}
      />

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
        {/* Statistiques par saison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Statistiques par saison
            </CardTitle>
            <CardDescription>
              Résumé de l'activité par saison
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.seasonStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune saison disponible</p>
            ) : (
              <div className="space-y-4">
                {data.seasonStats.map(season => (
                  <div key={season.id} className="border-l-4 border-primary pl-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {season.name}
                          {season.isActive && (
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {season.totalTournaments} tournois • {season.totalPlayers} inscriptions
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{season.avgPlayersPerTournament}</div>
                        <p className="text-xs text-muted-foreground">moy. joueurs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top joueurs actifs */}
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
            {data.topPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun joueur disponible</p>
            ) : (
              <div className="space-y-3">
                {data.topPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 text-center font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div className="flex-shrink-0">
                      {player.avatar ? (
                        <Image
                          src={player.avatar}
                          alt={player.name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{player.name}</p>
                      <p className="text-sm text-muted-foreground truncate">@{player.nickname}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{player.tournamentsPlayed}</div>
                      <p className="text-xs text-muted-foreground">tournois</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Évolution mensuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Évolution sur 12 mois
          </CardTitle>
          <CardDescription>
            Nombre de joueurs par tournoi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-end gap-2 h-48">
                {data.monthlyData.map((item, index) => {
                  const maxPlayers = Math.max(...data.monthlyData.map(d => d.playerCount));
                  const heightPercent = maxPlayers > 0 ? (item.playerCount / maxPlayers) * 100 : 0;

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-primary/20 hover:bg-primary/30 rounded-t transition-colors relative group">
                        <div
                          className="bg-primary rounded-t transition-all"
                          style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '20px' : '0' }}
                        />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap">
                            {item.playerCount} joueurs
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-center rotate-45 origin-left whitespace-nowrap">
                        {item.month}
                      </div>
                    </div>
                  );
                })}
              </div>
              {data.monthlyData.length > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">
                  Derniers tournois organisés
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
