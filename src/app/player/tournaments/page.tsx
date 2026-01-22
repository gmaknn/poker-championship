'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Users, Trophy, Clock, Euro, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type Season = {
  id: string;
  name: string;
  year: number;
  status: string;
};

type Tournament = {
  id: string;
  name: string;
  date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  buyInAmount: number;
  prizePool: number | null;
  _count: {
    tournamentPlayers: number;
  };
  podium?: Array<{
    finalRank: number;
    player: {
      id: string;
      nickname: string;
      firstName: string;
      lastName: string;
    };
    totalPoints: number;
    prizeAmount: number | null;
  }>;
};

const statusConfig = {
  PLANNED: { label: 'Planifié', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'En cours', color: 'bg-green-500' },
  FINISHED: { label: 'Terminé', color: 'bg-gray-500' },
  CANCELLED: { label: 'Annulé', color: 'bg-red-500' },
};

export default function PlayerTournamentsPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          fetchTournaments(defaultSeason.id);
        } else {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      setIsLoading(false);
    }
  };

  const fetchTournaments = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/tournaments');
      if (response.ok) {
        const allTournaments = await response.json();
        // Filter by season
        const seasonTournaments = allTournaments.filter(
          (t: Tournament & { seasonId: string }) => t.seasonId === seasonId
        );
        // Sort by date descending (most recent first)
        seasonTournaments.sort(
          (a: Tournament, b: Tournament) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTournaments(seasonTournaments);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
    fetchTournaments(seasonId);
  };

  const handleTournamentClick = (tournamentId: string) => {
    router.push(`/player/tournaments/${tournamentId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement des tournois...</p>
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
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Tournois
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Historique des tournois de la saison
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

      {/* Tournaments List */}
      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Aucun tournoi pour cette saison
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleTournamentClick(tournament.id)}
            >
              <CardHeader className="pb-2 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl truncate">
                      {tournament.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(tournament.date), "EEEE d MMMM yyyy 'à' HH:mm", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`${statusConfig[tournament.status].color} text-white`}
                    >
                      {statusConfig[tournament.status].label}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground hidden sm:block" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Stats row */}
                <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{tournament._count.tournamentPlayers} joueurs</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Euro className="h-4 w-4 text-muted-foreground" />
                    <span>Buy-in : {tournament.buyInAmount}€</span>
                  </div>
                  {tournament.prizePool && (
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span>Prize Pool : {tournament.prizePool}€</span>
                    </div>
                  )}
                </div>

                {/* Podium for finished tournaments */}
                {tournament.status === 'FINISHED' && tournament.podium && tournament.podium.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">PODIUM</p>
                    <div className="flex flex-wrap gap-2 sm:gap-4">
                      {tournament.podium.slice(0, 3).map((entry) => (
                        <div
                          key={entry.player.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              entry.finalRank === 1
                                ? 'bg-yellow-500 text-yellow-950'
                                : entry.finalRank === 2
                                ? 'bg-gray-400 text-gray-950'
                                : 'bg-amber-600 text-amber-950'
                            }`}
                          >
                            {entry.finalRank}
                          </span>
                          <span className="truncate max-w-[100px] sm:max-w-none">
                            {entry.player.nickname}
                          </span>
                          {entry.prizeAmount && (
                            <span className="text-green-600 font-medium">
                              {entry.prizeAmount}€
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
