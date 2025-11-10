'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Users } from 'lucide-react';

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
  };
  totalPoints: number;
  tournamentsCount: number;
  averagePoints: number;
  victories: number;
  podiums: number;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchActiveSeason();
  }, []);

  const fetchActiveSeason = async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const seasons = await response.json();
        const active = seasons.find((s: Season) => s.status === 'ACTIVE');
        if (active) {
          setActiveSeason(active);
          fetchLeaderboard(active.id);
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching active season:', error);
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Classement</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Classement</h1>
          <p className="text-muted-foreground">Aucune saison active</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Créez une saison active pour voir le classement</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Classement</h1>
        <p className="text-muted-foreground">
          {activeSeason.name} {activeSeason.year}
        </p>
      </div>

      {leaderboard.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun résultat pour le moment</p>
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
                  </div>
                  <CardTitle className="text-xl">
                    {entry.player.firstName} {entry.player.lastName}
                  </CardTitle>
                  <CardDescription>{entry.player.nickname}</CardDescription>
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
                    onClick={() => router.push(`/player/${entry.playerId}`)}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold w-8 ${entry.rank <= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                        #{entry.rank}
                      </span>
                      <div>
                        <div className="font-medium">
                          {entry.player.firstName} {entry.player.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{entry.player.nickname}</div>
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
    </div>
  );
}
