'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, Trophy, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type Tournament = {
  id: string;
  name: string;
  date: string;
  status: string;
  season?: {
    id: string;
    name: string;
    year: number;
  };
  _count: {
    tournamentPlayers: number;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
  };
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifié',
  REGISTRATION: 'Inscriptions',
  IN_PROGRESS: 'En cours',
  FINISHED: 'Terminé',
  CANCELLED: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  REGISTRATION: 'bg-green-500/10 text-green-500 border-green-500/20',
  IN_PROGRESS: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  FINISHED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function DirectorDashboard() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pour la démo, on utilise le premier joueur avec rôle TOURNAMENT_DIRECTOR
  // TODO: Remplacer par une vraie authentification
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchMyTournaments();
    }
  }, [currentUserId]);

  const fetchCurrentUser = async () => {
    try {
      // Pour la démo, on récupère tous les joueurs et on prend le premier Tournament Director
      const response = await fetch('/api/players');
      if (response.ok) {
        const players = await response.json();
        const director = players.find((p: any) => p.role === 'TOURNAMENT_DIRECTOR' || p.role === 'ADMIN');
        if (director) {
          setCurrentUserId(director.id);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchMyTournaments = async () => {
    if (!currentUserId) return;

    try {
      const response = await fetch(`/api/tournaments?createdById=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTournament = () => {
    router.push('/dashboard/tournaments/new');
  };

  const handleViewTournament = (tournamentId: string) => {
    router.push(`/dashboard/tournaments/${tournamentId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès non autorisé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vous devez être un directeur de tournoi pour accéder à cette page.
            </p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingTournaments = tournaments.filter(
    (t) => t.status === 'PLANNED' || t.status === 'REGISTRATION' || t.status === 'IN_PROGRESS'
  );
  const pastTournaments = tournaments.filter((t) => t.status === 'FINISHED');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Directeur de Tournoi</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos tournois et suivez leurs progrès
          </p>
        </div>
        <Button onClick={handleCreateTournament} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nouveau Tournoi
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tournois</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tournaments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À venir</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTournaments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terminés</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastTournaments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tournaments.reduce((acc, t) => acc + (t._count?.tournamentPlayers || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tournaments */}
      {upcomingTournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tournois à venir</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleViewTournament(tournament.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{tournament.name}</h3>
                      <Badge className={STATUS_COLORS[tournament.status]}>
                        {STATUS_LABELS[tournament.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(tournament.date), "EEEE d MMMM yyyy 'à' HH'h'mm", {
                          locale: fr,
                        })}
                      </div>
                      {tournament.season && (
                        <div>
                          {tournament.season.name} {tournament.season.year}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold">
                        {tournament._count?.tournamentPlayers || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Joueurs</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Tournaments */}
      {pastTournaments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tournois terminés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleViewTournament(tournament.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{tournament.name}</h3>
                      <Badge className={STATUS_COLORS[tournament.status]}>
                        {STATUS_LABELS[tournament.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(tournament.date), "d MMMM yyyy", { locale: fr })}
                      </div>
                      {tournament.season && (
                        <div>
                          {tournament.season.name} {tournament.season.year}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold">
                        {tournament._count?.tournamentPlayers || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Joueurs</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {tournaments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun tournoi créé</h3>
            <p className="text-muted-foreground text-center mb-4">
              Commencez par créer votre premier tournoi
            </p>
            <Button onClick={handleCreateTournament}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un tournoi
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
