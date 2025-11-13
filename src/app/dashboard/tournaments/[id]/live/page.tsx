'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  TrendingUp,
  Target,
  Users,
  RefreshCw,
  ArrowLeft,
  Skull,
  Award,
  AlertTriangle
} from 'lucide-react';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatar: string | null;
}

interface LeaderboardEntry {
  player: Player;
  currentRank: number;
  eliminationsCount: number;
  leaderKills: number;
  rebuysCount: number;
  lightRebuyUsed: boolean;
  eliminationPoints: number;
  bonusPoints: number;
  penaltyPoints: number;
  currentPoints: number;
  isEliminated: boolean;
  finalRank: number | null;
}

interface LiveLeaderboardData {
  tournament: {
    id: string;
    name: string;
    date: string;
    status: string;
    buyInAmount: number;
    startingChips: number;
    currentLevel: number | null;
  };
  season: {
    name: string;
    eliminationPoints: number;
    leaderKillerBonus: number;
  };
  leaderboard: LeaderboardEntry[];
  stats: {
    totalPlayers: number;
    remainingPlayers: number;
    eliminatedPlayers: number;
    totalEliminations: number;
    totalRebuys: number;
    leaderKillsTotal: number;
  };
}

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) return avatar;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function LiveLeaderboardPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id as string;

  const [data, setData] = useState<LiveLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/live-leaderboard`);
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching live leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [tournamentId]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, tournamentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Chargement du classement...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <div className="text-lg">Impossible de charger le classement</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                Classement en Direct
              </h1>
              <p className="text-muted-foreground mt-1">
                {data.tournament.name} • {data.season.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
          </div>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto' : 'Manuel'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLeaderboard()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Joueurs restants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.remainingPlayers}</div>
            <p className="text-xs text-muted-foreground">
              sur {data.stats.totalPlayers} joueurs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éliminations</CardTitle>
            <Skull className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalEliminations}</div>
            <p className="text-xs text-muted-foreground">
              {data.stats.eliminatedPlayers} joueurs éliminés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leader Kills</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.leaderKillsTotal}</div>
            <p className="text-xs text-muted-foreground">
              +{data.season.leaderKillerBonus} points chacun
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recaves totales</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalRebuys}</div>
            <p className="text-xs text-muted-foreground">
              Recaves effectuées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Classement en Temps Réel
          </CardTitle>
          <CardDescription>
            Points basés sur les éliminations, bonus et malus actuels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.leaderboard.map((entry) => {
              const isLeader = entry.currentRank === 1;
              const isPodium = entry.currentRank <= 3;
              const avatarUrl = getAvatarUrl(entry.player.avatar);

              return (
                <div
                  key={entry.player.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    entry.isEliminated
                      ? 'bg-muted/50 opacity-60'
                      : isPodium
                      ? 'bg-yellow-500/5 border-yellow-500/20'
                      : 'hover:bg-accent'
                  }`}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 text-center">
                    {isPodium && !entry.isEliminated ? (
                      <Trophy className={`h-8 w-8 mx-auto ${
                        isLeader ? 'text-yellow-500' : entry.currentRank === 2 ? 'text-gray-400' : 'text-amber-600'
                      }`} />
                    ) : (
                      <div className={`text-2xl font-bold ${entry.isEliminated ? 'text-muted-foreground' : ''}`}>
                        #{entry.currentRank}
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={entry.player.nickname}
                        className="w-12 h-12 rounded-full border-2 border-border"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-lg">{entry.player.nickname}</div>
                      {entry.isEliminated && (
                        <Badge variant="destructive" className="text-xs">
                          Éliminé (#{entry.finalRank})
                        </Badge>
                      )}
                      {isLeader && !entry.isEliminated && (
                        <Badge variant="default" className="bg-yellow-500 text-xs">
                          Leader
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.player.firstName} {entry.player.lastName}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    {entry.eliminationsCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-red-500" />
                        <span>{entry.eliminationsCount} élim.</span>
                      </div>
                    )}
                    {entry.leaderKills > 0 && (
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span>{entry.leaderKills} LK</span>
                      </div>
                    )}
                    {entry.rebuysCount > 0 && (
                      <div className="flex items-center gap-1">
                        <RefreshCw className="h-4 w-4 text-orange-500" />
                        <span>{entry.rebuysCount} recaves</span>
                      </div>
                    )}
                  </div>

                  {/* Points Breakdown */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-2xl font-bold">
                      {entry.currentPoints >= 0 ? '+' : ''}{entry.currentPoints} pts
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {entry.eliminationPoints > 0 && (
                        <span className="text-green-600">+{entry.eliminationPoints} élim.</span>
                      )}
                      {entry.bonusPoints > 0 && (
                        <span className="text-purple-600">+{entry.bonusPoints} bonus</span>
                      )}
                      {entry.penaltyPoints < 0 && (
                        <span className="text-red-600">{entry.penaltyPoints} malus</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Note */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Classement en temps réel :</strong> Les points affichés sont basés uniquement sur les éliminations,
              les bonus Leader Killer et les malus de recaves. Les points de classement final seront attribués à la fin du tournoi.
              Cette page se met à jour automatiquement toutes les 10 secondes.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
