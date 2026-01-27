'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, BarChart3, Image, Archive } from 'lucide-react';
import { useCurrentPlayer } from '@/components/layout/player-nav';
import { Season } from '@prisma/client';

type SeasonWithCount = Season & {
  _count?: {
    tournaments: number;
  };
};

export default function PlayerSeasonsPage() {
  const router = useRouter();
  const { currentPlayer, isLoading: isLoadingPlayer } = useCurrentPlayer();
  const [seasons, setSeasons] = useState<SeasonWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redirect non-ANIMATOR/ADMIN users
    if (!isLoadingPlayer && currentPlayer) {
      if (currentPlayer.role !== 'ANIMATOR' && currentPlayer.role !== 'ADMIN') {
        router.push('/player');
      }
    } else if (!isLoadingPlayer && !currentPlayer) {
      router.push('/player/login');
    }
  }, [currentPlayer, isLoadingPlayer, router]);

  useEffect(() => {
    if (currentPlayer && (currentPlayer.role === 'ANIMATOR' || currentPlayer.role === 'ADMIN')) {
      fetchSeasons();
    }
  }, [currentPlayer]);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking permissions
  if (isLoadingPlayer || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Check permissions
  if (!currentPlayer || (currentPlayer.role !== 'ANIMATOR' && currentPlayer.role !== 'ADMIN')) {
    return null; // Will redirect
  }

  const activeSeasons = seasons.filter(s => s.status === 'ACTIVE');
  const archivedSeasons = seasons.filter(s => s.status === 'ARCHIVED');

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Saisons</h1>
        </div>
        <p className="text-muted-foreground">
          Consultez les saisons et exportez les classements
        </p>
      </div>

      {activeSeasons.length === 0 && archivedSeasons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune saison</h3>
            <p className="text-muted-foreground">
              Aucune saison disponible pour le moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Seasons */}
          {activeSeasons.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Saisons actives
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeSeasons.map((season) => (
                  <Card key={season.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{season.name}</CardTitle>
                        <CardDescription>Annee {season.year}</CardDescription>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Debut : </span>
                          <span>{new Date(season.startDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {season.endDate && (
                          <div>
                            <span className="text-muted-foreground">Fin : </span>
                            <span>{new Date(season.endDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Tournois : </span>
                          <span className="font-medium">{season._count?.tournaments || 0}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/player/seasons/${season.id}/leaderboard`)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Classement
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/player/seasons/${season.id}/exports`)}
                        >
                          <Image className="mr-2 h-4 w-4" />
                          Exports
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Archived Seasons */}
          {archivedSeasons.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Archive className="h-5 w-5 text-muted-foreground" />
                Saisons archivees
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedSeasons.map((season) => (
                  <Card key={season.id} className="opacity-75">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{season.name}</CardTitle>
                        <CardDescription>Annee {season.year}</CardDescription>
                      </div>
                      <Badge variant="outline">Archivee</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tournois : </span>
                          <span className="font-medium">{season._count?.tournaments || 0}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/player/seasons/${season.id}/leaderboard`)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Classement
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/player/seasons/${season.id}/exports`)}
                        >
                          <Image className="mr-2 h-4 w-4" />
                          Exports
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
