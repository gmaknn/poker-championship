'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, TrendingUp, Plus, LayoutDashboard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { RecentActivityChart } from '@/components/charts/RecentActivityChart';

interface DashboardStats {
  activePlayers: number;
  totalTournaments: number;
  currentSeasonTournaments: number;
  leader: {
    nickname: string;
    points: number;
  } | null;
  nextTournament: {
    name: string;
    date: string;
  } | null;
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
  tournamentPlayers: any[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    activePlayers: 0,
    totalTournaments: 0,
    currentSeasonTournaments: 0,
    leader: null,
    nextTournament: null,
  });
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔍 Dashboard useEffect started');
    console.log('👤 Session:', session);

    // Charger les statistiques du dashboard
    console.log('📊 Starting to fetch dashboard stats...');
    Promise.all([
      fetch('/api/players'),
      fetch('/api/tournaments'),
      fetch('/api/seasons'),
    ])
      .then(([playersRes, tournamentsRes, seasonsRes]) => {
        console.log('📥 API responses received:', {
          players: playersRes.status,
          tournaments: tournamentsRes.status,
          seasons: seasonsRes.status
        });
        return Promise.all([playersRes.json(), tournamentsRes.json(), seasonsRes.json()]);
      })
      .then(([players, tournamentData, seasons]) => {
        console.log('📦 Data parsed:', {
          playersCount: players?.length,
          tournamentsCount: tournamentData?.length,
          seasonsCount: seasons?.length
        });
        // Valeurs par défaut si les données ne sont pas au bon format
        const safePlayers = Array.isArray(players) ? players : [];
        const safeTournaments = Array.isArray(tournamentData) ? tournamentData : [];
        const safeSeasons = Array.isArray(seasons) ? seasons : [];

        // Store tournaments for activity chart
        setTournaments(safeTournaments);

        const activePlayers = safePlayers.filter((p: any) => p.status === 'ACTIVE').length;
        const activeSeason = safeSeasons.find((s: any) => s.status === 'ACTIVE');
        console.log('🔍 Active season:', activeSeason);
        console.log('🔍 All seasons:', safeSeasons.map((s: any) => ({ name: s.name, status: s.status })));

        const currentSeasonTournaments = activeSeason
          ? safeTournaments.filter((t: any) => t.seasonId === activeSeason.id).length
          : 0;

        console.log('🔍 Tournaments in active season:', currentSeasonTournaments);

        // Trouver le prochain tournoi
        const now = new Date();
        console.log('📅 Current date:', now.toISOString());
        console.log('📅 All tournaments:', safeTournaments.map((t: any) => ({
          name: t.name,
          date: t.date,
          status: t.status,
          isFuture: new Date(t.date) > now
        })));
        const upcomingTournaments = safeTournaments
          .filter((t: any) => new Date(t.date) > now && (t.status === 'PLANNED' || t.status === 'REGISTRATION'))
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        console.log('🔜 Upcoming tournaments:', upcomingTournaments);
        const nextTournament = upcomingTournaments[0];
        console.log('🎯 Next tournament:', nextTournament);

        // Mettre à jour les stats de base immédiatement
        const baseStats = {
          activePlayers,
          totalTournaments: safeTournaments.length,
          currentSeasonTournaments,
          leader: null,
          nextTournament: nextTournament ? {
            name: nextTournament.name,
            date: nextTournament.date,
          } : null,
        };

        console.log('✅ Setting stats:', baseStats);
        setStats(baseStats);
        setLoading(false);
        console.log('✅ Stats updated, loading set to false');

        // Calculer le leader (optionnel)
        if (activeSeason) {
          fetch(`/api/seasons/${activeSeason.id}/leaderboard`)
            .then(r => r.json())
            .then(seasonData => {
              console.log('📊 Leaderboard data:', seasonData);
              if (seasonData && seasonData.leaderboard && seasonData.leaderboard.length > 0) {
                const topPlayer = seasonData.leaderboard[0];
                console.log('🏆 Top player:', topPlayer);
                setStats(prev => ({
                  ...prev,
                  leader: {
                    nickname: topPlayer.player.nickname,
                    points: topPlayer.totalPoints,
                  }
                }));
              } else {
                console.log('⚠️ No leaderboard data found');
              }
            })
            .catch(err => console.error('Error loading leader:', err));
        }
      })
      .catch(err => {
        console.error('Error loading dashboard stats:', err);
        setLoading(false);
      });
  }, []);

  // Admin peut toujours créer des tournois
  // Les joueurs avec rôle TOURNAMENT_DIRECTOR ou ADMIN peuvent aussi créer
  const canCreateTournament = session?.user && (
    session.user.userType === 'admin' ||
    session.user.role === 'ADMIN' ||
    session.user.role === 'TOURNAMENT_DIRECTOR'
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble du championnat"
        icon={<LayoutDashboard className="h-10 w-10" />}
        variant="simple"
        actions={
          canCreateTournament ? (
            <Button
              size="lg"
              onClick={() => router.push('/dashboard/tournaments')}
              className="gap-2"
            >
              <Plus className="h-5 w-5" />
              Nouveau tournoi
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Joueurs actifs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.activePlayers}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.activePlayers === 0 ? 'Aucun joueur enregistré' : 'Joueurs inscrits'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tournois</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.currentSeasonTournaments}
            </div>
            <p className="text-xs text-muted-foreground">
              Cette saison ({stats.totalTournaments} au total)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leader actuel</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.leader ? stats.leader.nickname : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.leader ? `${stats.leader.points.toLocaleString()} points` : 'Aucun classement'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prochain tournoi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {loading ? '...' : stats.nextTournament ? stats.nextTournament.name : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.nextTournament
                ? new Date(stats.nextTournament.date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long'
                  })
                : 'Aucun prévu'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bienvenue</CardTitle>
            <CardDescription>
              Commencez par ajouter des joueurs pour démarrer votre championnat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">Étapes de démarrage :</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Créer une saison de championnat</li>
                  <li>Ajouter des joueurs</li>
                  <li>Planifier votre premier tournoi</li>
                  <li>Configurer la structure des blindes</li>
                  <li>Lancer le tournoi !</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Activité récente
            </CardTitle>
            <CardDescription>
              Participation aux 5 derniers tournois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivityChart
              tournaments={tournaments
                .filter(t => t.status === 'FINISHED' || t.status === 'IN_PROGRESS')
                .map(t => ({
                  id: t.id,
                  name: t.name,
                  date: t.date,
                  playerCount: t.tournamentPlayers?.length || 0,
                  status: t.status
                }))
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
