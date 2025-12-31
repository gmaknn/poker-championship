'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, Trophy, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { PlayerRole } from '@prisma/client';

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

type CurrentPlayer = {
  id: string;
  role: PlayerRole;
  nickname: string;
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

// Rôles autorisés pour la page directeur
const ALLOWED_ROLES: PlayerRole[] = ['TOURNAMENT_DIRECTOR', 'ADMIN'];

export default function DirectorDashboard() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Vérifier l'authentification et récupérer le joueur courant
  useEffect(() => {
    const checkAuthAndFetchPlayer = async () => {
      // Attendre que la session soit chargée
      if (sessionStatus === 'loading') return;

      // Si pas de session NextAuth, vérifier le cookie player-id (mode dev)
      if (sessionStatus === 'unauthenticated' || !session?.user) {
        const cookies = document.cookie;
        const playerIdMatch = cookies.match(/player-id=([^;]+)/);

        if (!playerIdMatch) {
          setAuthError('Non authentifié');
          setIsLoading(false);
          return;
        }

        // Mode dev: récupérer le joueur via le cookie
        try {
          const response = await fetch(`/api/players/${playerIdMatch[1]}`);
          if (!response.ok) {
            setAuthError('Joueur non trouvé');
            setIsLoading(false);
            return;
          }

          const player = await response.json();

          // Vérifier le rôle
          if (!ALLOWED_ROLES.includes(player.role)) {
            setAuthError('Accès refusé - Rôle insuffisant');
            setIsLoading(false);
            return;
          }

          setCurrentPlayer({
            id: player.id,
            role: player.role,
            nickname: player.nickname,
          });
        } catch (error) {
          console.error('Error fetching player:', error);
          setAuthError('Erreur lors de la vérification');
          setIsLoading(false);
          return;
        }
      } else {
        // Mode production avec NextAuth
        // Récupérer le joueur associé à la session
        try {
          const response = await fetch('/api/players');
          if (!response.ok) {
            setAuthError('Erreur lors de la récupération des joueurs');
            setIsLoading(false);
            return;
          }

          const players = await response.json();
          const matchingPlayer = players.find(
            (p: { email?: string; role: PlayerRole }) =>
              p.email === session.user?.email
          );

          if (!matchingPlayer) {
            setAuthError('Joueur non associé à ce compte');
            setIsLoading(false);
            return;
          }

          // Vérifier le rôle
          if (!ALLOWED_ROLES.includes(matchingPlayer.role)) {
            setAuthError('Accès refusé - Rôle insuffisant');
            setIsLoading(false);
            return;
          }

          setCurrentPlayer({
            id: matchingPlayer.id,
            role: matchingPlayer.role,
            nickname: matchingPlayer.nickname,
          });
        } catch (error) {
          console.error('Error fetching player:', error);
          setAuthError('Erreur lors de la vérification');
          setIsLoading(false);
          return;
        }
      }
    };

    checkAuthAndFetchPlayer();
  }, [session, sessionStatus]);

  // Charger les tournois une fois authentifié
  useEffect(() => {
    if (!currentPlayer) return;

    const fetchMyTournaments = async () => {
      try {
        const response = await fetch(`/api/tournaments?createdById=${currentPlayer.id}`);
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

    fetchMyTournaments();
  }, [currentPlayer]);

  const handleCreateTournament = () => {
    router.push('/dashboard/tournaments/new');
  };

  const handleViewTournament = (tournamentId: string) => {
    router.push(`/dashboard/tournaments/${tournamentId}`);
  };

  // État de chargement initial
  if (sessionStatus === 'loading' || (isLoading && !authError)) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Vérification de l&apos;accès...</span>
        </div>
      </div>
    );
  }

  // Erreur d'authentification ou de permissions
  if (authError) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>
              {authError === 'Non authentifié' ? 'Connexion requise' : 'Accès non autorisé'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {authError === 'Non authentifié'
                ? 'Vous devez être connecté pour accéder à cette page.'
                : authError === 'Accès refusé - Rôle insuffisant'
                ? 'Seuls les directeurs de tournoi et administrateurs peuvent accéder à cette page.'
                : authError}
            </p>
            <div className="flex gap-2">
              {authError === 'Non authentifié' ? (
                <Button onClick={() => router.push('/login')}>
                  Se connecter
                </Button>
              ) : (
                <Button onClick={() => router.push('/dashboard')}>
                  Retour au dashboard
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pas de joueur trouvé (ne devrait pas arriver si authError est bien géré)
  if (!currentPlayer) {
    return null;
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
            Bienvenue {currentPlayer.nickname} - Gérez vos tournois et suivez leurs progrès
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
