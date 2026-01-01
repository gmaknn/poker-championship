'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, ArrowLeft, Calendar, Users, Trophy, LogIn, ChevronRight } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
  buyInAmount: number;
  totalPlayers: number;
  season: {
    name: string;
  } | null;
}

interface LeaderboardEntry {
  player: {
    id: string;
    nickname: string;
  };
  currentPoints: number;
  currentRank: number;
  eliminationsCount: number;
}

type AuthError = {
  type: 'unauthenticated' | 'inactive' | 'error';
  message: string;
};

export default function PlayerLivePage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  useEffect(() => {
    fetchActiveTournaments();
  }, []);

  const fetchActiveTournaments = async () => {
    try {
      const res = await fetch('/api/tournaments');
      if (res.ok) {
        const data = await res.json();
        const activeTournaments = data.filter(
          (t: Tournament) => t.status === 'IN_PROGRESS' || t.status === 'REGISTRATION'
        );
        setTournaments(activeTournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveLeaderboard = async (tournament: Tournament) => {
    setSelectedTournament(tournament);
    setIsLoadingLeaderboard(true);
    setAuthError(null);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/live-leaderboard`);

      if (response.status === 401) {
        setAuthError({
          type: 'unauthenticated',
          message: 'Vous devez vous connecter pour voir le classement en direct.',
        });
        setIsLoadingLeaderboard(false);
        return;
      }

      if (response.status === 403) {
        setAuthError({
          type: 'inactive',
          message: 'Votre compte est inactif. Veuillez activer votre compte.',
        });
        setIsLoadingLeaderboard(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching live leaderboard:', error);
      setAuthError({
        type: 'error',
        message: 'Erreur lors du chargement du classement.',
      });
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleBack = () => {
    if (selectedTournament) {
      setSelectedTournament(null);
      setLeaderboard([]);
      setAuthError(null);
    } else {
      router.push('/player');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Auth error state (when viewing leaderboard)
  if (authError && selectedTournament) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-lg mx-auto pt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Zap className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold">Acces restreint</h2>
                <p className="text-muted-foreground">{authError.message}</p>
                <div className="flex flex-col gap-2 pt-4">
                  {authError.type === 'unauthenticated' && (
                    <Button onClick={() => router.push('/login')}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Se connecter
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Leaderboard view
  if (selectedTournament) {
    return (
      <div className="min-h-screen p-4 pb-20">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold truncate">{selectedTournament.name}</h1>
              <p className="text-sm text-muted-foreground">
                {selectedTournament.season?.name || 'Hors saison'}
              </p>
            </div>
            <Badge variant={selectedTournament.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
              {selectedTournament.status === 'IN_PROGRESS' ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  En cours
                </span>
              ) : (
                'Inscription'
              )}
            </Badge>
          </div>

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Classement Live
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingLeaderboard ? (
                <div className="p-6 text-center">
                  <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Aucun classement disponible.
                </div>
              ) : (
                <div className="divide-y">
                  {leaderboard.slice(0, 20).map((entry) => (
                    <div
                      key={entry.player.id}
                      className="flex items-center gap-3 p-3"
                    >
                      {/* Rank */}
                      <div className="w-8 text-center">
                        {entry.currentRank <= 3 ? (
                          <Trophy className={`h-5 w-5 mx-auto ${
                            entry.currentRank === 1 ? 'text-yellow-500' :
                            entry.currentRank === 2 ? 'text-gray-400' : 'text-amber-600'
                          }`} />
                        ) : (
                          <span className="font-mono text-muted-foreground">{entry.currentRank}</span>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.player.nickname}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.eliminationsCount} elimination{entry.eliminationsCount !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <p className="font-bold text-lg">{entry.currentPoints}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Tournament list view
  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/player')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-orange-500" />
              Classements Live
            </h1>
          </div>
        </div>

        {/* Tournament Cards */}
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Aucun tournoi actif</h3>
                <p className="text-sm text-muted-foreground">
                  Revenez plus tard pour suivre les tournois en cours.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tournaments.map((tournament) => {
              const isInProgress = tournament.status === 'IN_PROGRESS';

              return (
                <Card
                  key={tournament.id}
                  className={`cursor-pointer hover:shadow-md transition-all ${
                    isInProgress ? 'border-orange-500/50' : ''
                  }`}
                  onClick={() => fetchLiveLeaderboard(tournament)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{tournament.name}</CardTitle>
                        <CardDescription>{tournament.season?.name || 'Hors saison'}</CardDescription>
                      </div>
                      <Badge variant={isInProgress ? 'default' : 'secondary'}>
                        {isInProgress ? (
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            En cours
                          </span>
                        ) : (
                          'Inscription'
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(tournament.date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {tournament.totalPlayers}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
