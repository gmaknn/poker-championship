'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowLeft, Medal, LogIn } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
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
  victories: number;
  podiums: number;
};

type AuthError = {
  type: 'unauthenticated' | 'inactive' | 'error';
  message: string;
};

export default function PlayerLeaderboardPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<AuthError | null>(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const allSeasons = await response.json();
        setSeasons(allSeasons);

        const active = allSeasons.find((s: Season) => s.status === 'ACTIVE');
        const defaultSeason = active || allSeasons[0];

        if (defaultSeason) {
          setSelectedSeasonId(defaultSeason.id);
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

  const fetchLeaderboard = async (seasonId: string) => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const response = await fetch(`/api/seasons/${seasonId}/leaderboard`);

      if (response.status === 401) {
        setAuthError({
          type: 'unauthenticated',
          message: 'Vous devez vous connecter pour voir le classement.',
        });
        setIsLoading(false);
        return;
      }

      if (response.status === 403) {
        setAuthError({
          type: 'inactive',
          message: 'Votre compte est inactif. Veuillez activer votre compte pour acceder au classement.',
        });
        setIsLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setAuthError({
        type: 'error',
        message: 'Erreur lors du chargement du classement.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    fetchLeaderboard(seasonId);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="w-5 text-center font-mono">{rank}</span>;
  };

  // Error state
  if (authError) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-lg mx-auto pt-20">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Trophy className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold">Acces restreint</h2>
                <p className="text-muted-foreground">{authError.message}</p>
                <div className="flex flex-col gap-2 pt-4">
                  {authError.type === 'unauthenticated' && (
                    <Button onClick={() => router.push('/login')}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Se connecter
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => router.push('/player')}>
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/player')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Classement General
            </h1>
          </div>
        </div>

        {/* Season Selector */}
        {seasons.length > 0 && (
          <Select value={selectedSeasonId} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir une saison" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name} {season.status === 'ACTIVE' && '(en cours)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Leaderboard */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Top Joueurs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {leaderboard.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                Aucun classement disponible pour cette saison.
              </div>
            ) : (
              <div className="divide-y">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.playerId}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    {/* Rank */}
                    <div className="w-8 flex justify-center">
                      {getRankIcon(entry.rank)}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.player.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.tournamentsCount} tournoi{entry.tournamentsCount > 1 ? 's' : ''}
                        {entry.victories > 0 && ` - ${entry.victories} victoire${entry.victories > 1 ? 's' : ''}`}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <p className="font-bold text-lg">{entry.totalPoints}</p>
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
