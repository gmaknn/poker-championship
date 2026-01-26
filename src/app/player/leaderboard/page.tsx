'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Users, Star } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentPlayer } from '@/components/layout/player-nav';

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

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) return avatar;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function PlayerLeaderboardPage() {
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);

    try {
      const response = await fetch(`/api/seasons/${seasonId}/leaderboard`);

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        setError('Erreur lors du chargement du classement.');
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Erreur lors du chargement du classement.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    fetchLeaderboard(seasonId);
  };

  const handlePlayerClick = (playerId: string) => {
    router.push(`/player/${playerId}`);
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1)
      return (
        <span className="w-8 h-8 rounded-full bg-yellow-500 text-yellow-950 flex items-center justify-center font-bold">
          1
        </span>
      );
    if (rank === 2)
      return (
        <span className="w-8 h-8 rounded-full bg-gray-400 text-gray-950 flex items-center justify-center font-bold">
          2
        </span>
      );
    if (rank === 3)
      return (
        <span className="w-8 h-8 rounded-full bg-amber-600 text-amber-950 flex items-center justify-center font-bold">
          3
        </span>
      );
    return (
      <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground">
        {rank}
      </span>
    );
  };

  // Error state
  if (error) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Erreur</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement du classement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
            Classement
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Top joueurs de la saison
          </p>
        </div>

        {/* Season Selector */}
        {seasons.length > 0 && (
          <Select value={selectedSeasonId} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
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
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {leaderboard.length} joueur{leaderboard.length > 1 ? 's' : ''} classé
            {leaderboard.length > 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leaderboard.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Aucun classement disponible pour cette saison.
            </div>
          ) : (
            <div className="divide-y">
              {/* Zone Master indicator */}
              {leaderboard.length > 0 && (
                <div className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-yellow-500/10 via-yellow-500/20 to-yellow-500/10 border-b">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-bold text-yellow-600">Zone Master - Top 10</span>
                  <Star className="h-4 w-4 text-yellow-500" />
                </div>
              )}
              {leaderboard.map((entry) => {
                const isCurrentPlayer = currentPlayer?.id === entry.playerId;

                const isTop10 = entry.rank <= 10;

                return (
                  <>
                    {/* Separator after Top 10 */}
                    {entry.rank === 11 && (
                      <div key="separator" className="flex items-center gap-3 py-2 px-4 bg-muted/30">
                        <div className="flex-1 h-px bg-yellow-500/50" />
                        <span className="text-xs text-muted-foreground">Hors Zone Master</span>
                        <div className="flex-1 h-px bg-yellow-500/50" />
                      </div>
                    )}
                    <div
                      key={entry.playerId}
                      className={`flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                        isCurrentPlayer ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      } ${isTop10 && !isCurrentPlayer ? 'bg-yellow-500/5' : ''}`}
                      onClick={() => handlePlayerClick(entry.playerId)}
                    >
                    {/* Rank */}
                    <div className="flex-shrink-0">{getRankDisplay(entry.rank)}</div>

                    {/* Avatar */}
                    {entry.player.avatar && getAvatarUrl(entry.player.avatar) ? (
                      <img
                        src={getAvatarUrl(entry.player.avatar)!}
                        alt={entry.player.nickname}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {entry.player.nickname}
                        {isCurrentPlayer && (
                          <span className="text-xs text-primary ml-2">(vous)</span>
                        )}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {entry.tournamentsCount} tournoi
                        {entry.tournamentsCount > 1 ? 's' : ''}
                        {entry.victories > 0 && (
                          <span className="text-yellow-600">
                            {' '}
                            - {entry.victories} victoire
                            {entry.victories > 1 ? 's' : ''}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-lg sm:text-xl text-primary">
                        {entry.totalPoints}
                      </p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                    </div>
                  </>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
