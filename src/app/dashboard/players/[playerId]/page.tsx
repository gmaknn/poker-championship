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
  Zap,
  DollarSign,
  Percent,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type DashboardData = any; // Type complet à définir si nécessaire

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) {
    return avatar;
  }
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [playerId]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/players/${playerId}/dashboard`);
      if (response.ok) {
        const dashboardData = await response.json();
        setData(dashboardData);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setIsLoading(false);
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

  const { player, activeSeason, upcomingTournaments, lastTournament, myRanking, leaderboardTop10, tournamentHistory, funStats, badges } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Bouton retour */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/players')}
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la liste
      </Button>

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          {player.avatar && getAvatarUrl(player.avatar) ? (
            <img
              src={getAvatarUrl(player.avatar)!}
              alt="Avatar"
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary"
            />
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary bg-muted flex items-center justify-center">
              <Users className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">{player.nickname}</p>
        </div>
        {activeSeason && (
          <Badge variant="outline" className="text-base sm:text-lg">
            {activeSeason.name} {activeSeason.year}
          </Badge>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Tournois</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{funStats.totalTournaments}</div>
            <p className="text-xs text-muted-foreground">Joués</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Victoires</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{funStats.victories}</div>
            <p className="text-xs text-muted-foreground">
              {funStats.totalTournaments > 0
                ? `${Math.round((funStats.victories / funStats.totalTournaments) * 100)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Podiums</CardTitle>
            <Trophy className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{funStats.podiums}</div>
            <p className="text-xs text-muted-foreground">Top 3</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Éliminations</CardTitle>
            <Target className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold">{funStats.totalEliminations}</div>
            <p className="text-xs text-muted-foreground">
              {funStats.totalLeaderKills} LK
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      {badges && badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Badges & Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge: any) => (
                <div
                  key={badge.id}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg ${
                    badge.rarity === 'legendary'
                      ? 'border-yellow-500 bg-yellow-500/5'
                      : badge.rarity === 'epic'
                      ? 'border-purple-500 bg-purple-500/5'
                      : badge.rarity === 'gold'
                      ? 'border-amber-500 bg-amber-500/5'
                      : badge.rarity === 'rare'
                      ? 'border-blue-500 bg-blue-500/5'
                      : 'border-gray-500 bg-gray-500/5'
                  }`}
                >
                  <div className="text-4xl">{badge.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{badge.name}</div>
                    <div className="text-xs text-muted-foreground">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Upcoming Tournaments */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
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
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
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

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* My Ranking */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="h-5 w-5" />
              Classement
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
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="h-5 w-5" />
              Stats Amusantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funStats.nemesis && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-red-500/5">
                <div className="flex items-center gap-2">
                  <Skull className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="text-sm font-medium">Son bourreau</div>
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
              <div className="flex items-center justify-between p-3 border rounded-lg bg-pink-500/5">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  <div>
                    <div className="text-sm font-medium">Sa victime favorite</div>
                    <div className="text-xs text-muted-foreground">
                      {funStats.favoriteVictim.player.firstName}{' '}
                      {funStats.favoriteVictim.player.lastName}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{funStats.favoriteVictim.count}×</Badge>
              </div>
            )}

            {funStats.deadliestTournament && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-orange-500/5">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-medium">Tournoi le plus meurtrier</div>
                    <div className="text-xs text-muted-foreground">
                      {funStats.deadliestTournament.eliminationsCount} éliminations
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{new Date(funStats.deadliestTournament.tournamentDate).toLocaleDateString('fr-FR')}</Badge>
              </div>
            )}

            {funStats.bestComeback && (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-500/5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-sm font-medium">Meilleur Comeback</div>
                    <div className="text-xs text-muted-foreground">
                      Victoire avec {funStats.bestComeback.rebuysCount} recave{funStats.bestComeback.rebuysCount > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">{new Date(funStats.bestComeback.tournamentDate).toLocaleDateString('fr-FR')}</Badge>
              </div>
            )}

            <div className="pt-2 space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 rounded hover:bg-accent">
                <span className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <span>Taux de victoire</span>
                </span>
                <span className="font-bold text-primary">{funStats.winRate}%</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded hover:bg-accent">
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span>ITM Rate (Top 3)</span>
                </span>
                <span className="font-bold text-primary">{funStats.itmRate}%</span>
              </div>
              {/* Section Gains et Pertes */}
              <div className="p-3 rounded-lg border bg-card/50 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Gains et pertes</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Gains</span>
                  <span className="font-bold text-green-600">{funStats.totalWinnings?.toFixed(0) || 0} €</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Pertes</span>
                  <span className="font-bold text-red-500">{funStats.totalLosses?.toFixed(0) || 0} €</span>
                </div>
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-medium">Total</span>
                  <span className={`font-bold text-lg ${(funStats.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(funStats.netProfit || 0) >= 0 ? '+' : ''}{funStats.netProfit?.toFixed(0) || 0} €
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center p-2 rounded hover:bg-accent">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span>Meilleure série (podiums)</span>
                </span>
                <span className="font-bold">{funStats.bestStreak}</span>
              </div>
              {funStats.bubbleBoyCount > 0 && (
                <div className="flex justify-between items-center p-2 rounded hover:bg-accent">
                  <span className="flex items-center gap-2">
                    <Skull className="h-4 w-4 text-muted-foreground" />
                    <span>Bubble Boy (4ème place)</span>
                  </span>
                  <span className="font-bold text-yellow-600">{funStats.bubbleBoyCount}×</span>
                </div>
              )}
              <div className="flex justify-between items-center p-2 rounded hover:bg-accent">
                <span className="text-muted-foreground">Tournois sans recave</span>
                <span className="font-bold">{funStats.ironManTournaments}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded hover:bg-accent">
                <span className="text-muted-foreground">Total Recaves</span>
                <span className="font-bold">{funStats.totalRebuys}</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded hover:bg-accent">
                <span className="text-muted-foreground">Leader Kills</span>
                <span className="font-bold">{funStats.totalLeaderKills}</span>
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
