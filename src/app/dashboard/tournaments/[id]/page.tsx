'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Users, Trophy, Edit2, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BlindStructureEditor from '@/components/BlindStructureEditor';
import ChipManager from '@/components/ChipManager';
import ChipConfigDisplay from '@/components/ChipConfigDisplay';
import TournamentPlayersManager from '@/components/TournamentPlayersManager';
import TournamentTimer from '@/components/TournamentTimer';
import EliminationManager from '@/components/EliminationManager';
import TableDistribution from '@/components/TableDistribution';
import TournamentResults from '@/components/TournamentResults';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type TournamentStatus = 'PLANNED' | 'REGISTRATION' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

interface Tournament {
  id: string;
  name: string | null;
  seasonId: string | null;
  date: string;
  buyInAmount: number;
  startingChips: number;
  targetDuration: number;
  totalPlayers?: number | null;
  status: TournamentStatus;
  levelDuration: number;
  season: {
    id: string;
    name: string;
    year: number;
  } | null;
  _count: {
    tournamentPlayers: number;
    blindLevels: number;
  };
}

const STATUS_CONFIG = {
  PLANNED: { label: 'Planifié', variant: 'default' as const },
  REGISTRATION: { label: 'Inscriptions', variant: 'default' as const },
  IN_PROGRESS: { label: 'En cours', variant: 'default' as const },
  FINISHED: { label: 'Terminé', variant: 'secondary' as const },
  CANCELLED: { label: 'Annulé', variant: 'destructive' as const },
};

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTournament();
  }, [id]);

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTournament(data);
      } else {
        router.push('/dashboard/tournaments');
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      router.push('/dashboard/tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[tournament.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg p-6 border-2 border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/tournaments')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <Badge variant={statusConfig.variant} className="text-lg px-4 py-1">{statusConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-base">
              {tournament.season?.name} ({tournament.season?.year})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/tv/${tournament.id}`, '_blank')}
          >
            <Tv className="mr-2 h-4 w-4" />
            Vue TV
          </Button>
          <Button variant="outline">
            <Edit2 className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {format(new Date(tournament.date), 'd MMM yyyy', { locale: fr })}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(tournament.date), "HH'h'mm", { locale: fr })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Joueurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {tournament._count.tournamentPlayers}
              {tournament.totalPlayers && ` / ${tournament.totalPlayers}`}
            </div>
            <p className="text-xs text-muted-foreground">inscrits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buy-in</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{tournament.buyInAmount}€</div>
            <p className="text-xs text-muted-foreground">
              {tournament.startingChips.toLocaleString()} jetons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Structure</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {tournament._count.blindLevels} niveaux
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.floor(tournament.targetDuration / 60)}h
              {tournament.targetDuration % 60}min
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="structure" className="w-full">
        <TabsList>
          <TabsTrigger value="structure">Structure des blinds</TabsTrigger>
          <TabsTrigger value="config">Jetons</TabsTrigger>
          <TabsTrigger value="players">Joueurs inscrits</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="timer">Timer</TabsTrigger>
          <TabsTrigger value="eliminations">Éliminations</TabsTrigger>
          <TabsTrigger value="results">Résultats</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-6">
          <BlindStructureEditor
            tournamentId={tournament.id}
            startingChips={tournament.startingChips}
            onSave={() => fetchTournament()}
          />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <div className="space-y-6">
            <ChipConfigDisplay
              tournamentId={tournament.id}
              onUpdate={() => fetchTournament()}
            />
            <ChipManager
              tournamentId={tournament.id}
              onUpdate={() => fetchTournament()}
            />
          </div>
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <TournamentPlayersManager
            tournamentId={tournament.id}
            tournament={{
              id: tournament.id,
              status: tournament.status,
              buyInAmount: tournament.buyInAmount,
            }}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>

        <TabsContent value="tables" className="mt-6">
          <TableDistribution
            tournamentId={tournament.id}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>

        <TabsContent value="timer" className="mt-6">
          <TournamentTimer
            tournamentId={tournament.id}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>

        <TabsContent value="eliminations" className="mt-6">
          <EliminationManager
            tournamentId={tournament.id}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <TournamentResults
            tournamentId={tournament.id}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
