'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy,
  Calendar,
  TrendingUp,
  Target,
  Skull,
  Heart,
  Award,
  Users,
  History,
  Edit,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type DashboardData = any; // Type complet à définir si nécessaire

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Whiskers', 'Salem', 'Misty', 'Shadow',
  'Lucky', 'Ace', 'King', 'Queen', 'Jack', 'Joker',
  'Diamond', 'Spade', 'Heart', 'Club', 'Chip', 'Bluff',
  'River', 'Flop', 'Turn', 'Poker', 'Royal', 'Flush',
];

const getAvatarUrl = (seed: string | null) => {
  if (!seed) return null;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
};

export default function PlayerDashboardPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, [playerId]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}/dashboard`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
        setSelectedAvatar(dashboardData.player.avatar || null);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (seed: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.player.firstName,
          lastName: data.player.lastName,
          nickname: data.player.nickname,
          email: data.player.email || '',
          avatar: seed,
        }),
      });

      if (response.ok) {
        setSelectedAvatar(seed);
        setData((prev: any) => ({
          ...prev,
          player: { ...prev.player, avatar: seed },
        }));
        setIsAvatarDialogOpen(false);
      } else {
        console.error('Failed to update avatar:', await response.json());
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Erreur lors du chargement du dashboard</p>
      </div>
    );
  }

  const { player, activeSeason, upcomingTournaments, lastTournament, myRanking, leaderboardTop10, tournamentHistory, funStats } = data;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          {selectedAvatar && getAvatarUrl(selectedAvatar) ? (
            <img
              src={getAvatarUrl(selectedAvatar)!}
              alt="Avatar"
              className="w-32 h-32 rounded-full border-4 border-primary"
            />
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-primary bg-muted flex items-center justify-center">
              <Users className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
          <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Choisir un avatar</DialogTitle>
                <DialogDescription>
                  Sélectionnez un avatar pour personnaliser votre profil
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-6 gap-4 p-4">
                {AVATAR_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    onClick={() => handleAvatarChange(seed)}
                    className={`relative rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                      selectedAvatar === seed
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={getAvatarUrl(seed)!}
                      alt={seed}
                      className="w-full h-full rounded"
                    />
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div>
          <h1 className="text-4xl font-bold">
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-xl text-muted-foreground">{player.nickname}</p>
        </div>
        {activeSeason && (
          <Badge variant="outline" className="text-lg">
            {activeSeason.name} {activeSeason.year}
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournois</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funStats.totalTournaments}</div>
            <p className="text-xs text-muted-foreground">Joués</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Victoires</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funStats.victories}</div>
            <p className="text-xs text-muted-foreground">
              {funStats.totalTournaments > 0
                ? `${Math.round((funStats.victories / funStats.totalTournaments) * 100)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Podiums</CardTitle>
            <Trophy className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funStats.podiums}</div>
            <p className="text-xs text-muted-foreground">Top 3</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éliminations</CardTitle>
            <Target className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funStats.totalEliminations}</div>
            <p className="text-xs text-muted-foreground">
              {funStats.totalLeaderKills} Leader Kills
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Tournaments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Prochains Tournois
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingTournaments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucun tournoi planifié
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingTournaments.map((tournament: any) => (
                  <div
                    key={tournament.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/dashboard/tournaments/${tournament.id}`)}
                  >
                    <div>
                      <div className="font-medium">{tournament.name || 'Tournoi'}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(tournament.date), "EEEE d MMMM 'à' HH'h'mm", {
                          locale: fr,
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge>{tournament._count.tournamentPlayers} inscrits</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Tournament */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Dernier Tournoi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!lastTournament ? (
              <p className="text-muted-foreground text-center py-4">
                Aucun tournoi complété
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="font-medium text-lg">
                    {lastTournament.tournament.name || 'Tournoi'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(
                      new Date(lastTournament.tournament.date),
                      "d MMMM yyyy",
                      { locale: fr }
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">
                      #{lastTournament.finalRank || '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">Classement</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {lastTournament.totalPoints}
                    </div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {lastTournament.eliminationsCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Éliminations</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* My Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mon Classement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!myRanking ? (
              <p className="text-muted-foreground text-center py-4">
                Pas encore de classement
              </p>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    #{myRanking.rank}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    sur {leaderboardTop10?.length || 0} joueurs
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold">{myRanking.totalPoints}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">
                      {myRanking.tournamentsCount}
                    </div>
                    <div className="text-xs text-muted-foreground">Tournois</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{myRanking.averagePoints}</div>
                    <div className="text-xs text-muted-foreground">Moyenne</div>
                  </div>
                </div>
                {activeSeason && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      router.push(`/dashboard/seasons/${activeSeason.id}/leaderboard`)
                    }
                  >
                    Voir le classement complet
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fun Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Stats Amusantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funStats.nemesis && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Skull className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-sm font-medium">Némésis</div>
                    <div className="text-xs text-muted-foreground">
                      {funStats.nemesis.player.firstName}{' '}
                      {funStats.nemesis.player.lastName}
                    </div>
                  </div>
                </div>
                <Badge variant="destructive">{funStats.nemesis.count}×</Badge>
              </div>
            )}

            {funStats.favoriteVictim && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <div>
                    <div className="text-sm font-medium">Victime Favorite</div>
                    <div className="text-xs text-muted-foreground">
                      {funStats.favoriteVictim.player.firstName}{' '}
                      {funStats.favoriteVictim.player.lastName}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{funStats.favoriteVictim.count}×</Badge>
              </div>
            )}

            <div className="pt-2 space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Total Recaves:</span>
                <span className="font-medium">{funStats.totalRebuys}</span>
              </div>
              <div className="flex justify-between">
                <span>Leader Kills:</span>
                <span className="font-medium">{funStats.totalLeaderKills}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tournament History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Tournois</CardTitle>
        </CardHeader>
        <CardContent>
          {tournamentHistory.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun historique disponible
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tournamentHistory.map((tp: any) => (
                <div
                  key={tp.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => router.push(`/dashboard/tournaments/${tp.tournament.id}`)}
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {tp.tournament.name || 'Tournoi'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(tp.tournament.date), 'd MMMM yyyy', {
                        locale: fr,
                      })}{' '}
                      • {tp.tournament.season?.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {tp.finalRank !== null && (
                      <div className="text-center">
                        <div className="text-lg font-bold">#{tp.finalRank}</div>
                        <div className="text-xs text-muted-foreground">Rank</div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">
                        {tp.totalPoints}
                      </div>
                      <div className="text-xs text-muted-foreground">Points</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm">{tp.eliminationsCount}</div>
                      <div className="text-xs text-muted-foreground">Élim.</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* TOP 10 Leaderboard */}
      {leaderboardTop10 && leaderboardTop10.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>TOP 10 - Classement Général</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboardTop10.map((entry: any) => (
                <div
                  key={entry.playerId}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    entry.playerId === playerId ? 'bg-primary/10 border-primary' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-muted-foreground w-8">
                      #{entry.rank}
                    </span>
                    <div>
                      <div className="font-medium">
                        {entry.player.firstName} {entry.player.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.player.nickname}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-primary">
                    {entry.totalPoints} pts
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
