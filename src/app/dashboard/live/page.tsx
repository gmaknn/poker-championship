'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Calendar, DollarSign, Users, ArrowRight } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
  buyInAmount: number;
  startingChips: number;
  totalPlayers: number;
  season: {
    name: string;
  } | null;
}

export default function LiveDashboardPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveTournaments = async () => {
      try {
        const res = await fetch('/api/tournaments');
        if (res.ok) {
          const data = await res.json();
          // Filter for active tournaments (IN_PROGRESS or REGISTRATION)
          const activeTournaments = data.filter(
            (t: Tournament) => t.status === 'IN_PROGRESS' || t.status === 'REGISTRATION'
          );
          setTournaments(activeTournaments);
        }
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveTournaments();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-500/5 rounded-lg p-6 border-2 border-border">
        <h1 className="text-4xl font-bold flex items-center gap-3">
          <Trophy className="h-10 w-10 text-yellow-500" />
          Classements en Direct
        </h1>
        <p className="text-muted-foreground mt-1 text-base">
          Suivez les tournois en cours en temps réel
        </p>
      </div>

      {/* Active Tournaments */}
      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun tournoi actif</h3>
              <p className="text-muted-foreground">
                Il n'y a pas de tournoi en cours pour le moment.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tournaments.map((tournament) => {
            const tournamentDate = new Date(tournament.date);
            const isInProgress = tournament.status === 'IN_PROGRESS';

            return (
              <Card
                key={tournament.id}
                className={`hover:shadow-lg transition-all cursor-pointer ${
                  isInProgress ? 'border-yellow-500/50 bg-yellow-500/5' : ''
                }`}
                onClick={() => router.push(`/dashboard/tournaments/${tournament.id}/live`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{tournament.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {tournament.season?.name || 'Hors saison'}
                      </CardDescription>
                    </div>
                    <Badge variant={isInProgress ? 'default' : 'secondary'} className="flex items-center gap-1">
                      {isInProgress ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          En cours
                        </>
                      ) : (
                        'Inscription'
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tournament Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{tournamentDate.toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{tournament.buyInAmount}€ buy-in</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{tournament.totalPlayers} joueurs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-muted-foreground" />
                      <span>{tournament.startingChips.toLocaleString('fr-FR')} jetons</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button className="w-full" variant={isInProgress ? 'default' : 'outline'}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Voir le classement en direct
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong>Classements en temps réel :</strong> Suivez l'évolution des points de chaque joueur pendant le tournoi.
              Les classements se mettent à jour automatiquement toutes les 10 secondes et affichent les points accumulés
              grâce aux éliminations, bonus et malus.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
