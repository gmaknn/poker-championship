'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search, Trophy, Zap, Calendar, LogIn, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCurrentPlayer } from '@/components/layout/player-nav';
import Link from 'next/link';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatar: string | null;
  status: string;
};

type TableDirectorAssignment = {
  tournamentId: string;
  tournamentName: string;
  tableNumber: number;
  activePlayersCount: number;
  tournamentStatus: string;
};

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) return avatar;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function PlayerHomePage() {
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableDirectorAssignments, setTableDirectorAssignments] = useState<TableDirectorAssignment[]>([]);

  useEffect(() => {
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (currentPlayer) {
      fetchTableDirectorAssignments(currentPlayer.id);
    }
  }, [currentPlayer]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPlayers(players);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = players.filter(
        (player) =>
          player.firstName.toLowerCase().includes(query) ||
          player.lastName.toLowerCase().includes(query) ||
          player.nickname.toLowerCase().includes(query)
      );
      setFilteredPlayers(filtered);
    }
  }, [searchQuery, players]);

  const fetchTableDirectorAssignments = async (playerId: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}/table-director`);
      if (response.ok) {
        const data = await response.json();
        setTableDirectorAssignments(data.tableDirectorAssignments || []);
      }
    } catch (error) {
      console.error('Error fetching table director assignments:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        const activePlayers = data.filter((p: Player) => p.status === 'ACTIVE');
        setPlayers(activePlayers);
        setFilteredPlayers(activePlayers);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayerSelect = (playerId: string) => {
    router.push(`/player/${playerId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-bold">Bienvenue</h1>
        <p className="text-sm sm:text-xl text-muted-foreground">
          {currentPlayer
            ? `Bonjour ${currentPlayer.firstName} !`
            : 'Connectez-vous pour accéder à votre profil'}
        </p>
        {!currentPlayer && (
          <Button
            onClick={() => router.push('/player/login')}
            className="mt-4 min-h-[44px]"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Se connecter
          </Button>
        )}
      </div>

      {/* Table Director Block */}
      {tableDirectorAssignments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-amber-500" />
            <h2 className="text-lg sm:text-xl font-bold text-amber-500">Gérer ma table</h2>
          </div>
          <div className="space-y-3">
            {tableDirectorAssignments.map((assignment) => (
              <div
                key={`${assignment.tournamentId}-${assignment.tableNumber}`}
                className="flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    Table {assignment.tableNumber} - {assignment.tournamentName}
                  </p>
                  <p className="text-sm text-slate-400">
                    {assignment.activePlayersCount} joueurs actifs
                  </p>
                </div>
                <Link
                  href={`/director/${assignment.tournamentId}/table/${assignment.tableNumber}`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold text-base sm:text-lg whitespace-nowrap flex-shrink-0 transition-colors"
                >
                  Accéder
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/20"
          onClick={() => router.push('/player/leaderboard')}
        >
          <CardHeader className="flex flex-row items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Classement</CardTitle>
              <CardDescription className="text-sm truncate">
                Saison en cours
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/20"
          onClick={() => router.push('/player/tournaments')}
        >
          <CardHeader className="flex flex-row items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Tournois</CardTitle>
              <CardDescription className="text-sm truncate">
                Historique et résultats
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors border-primary/20 sm:col-span-2 lg:col-span-1"
          onClick={() => router.push('/player/live')}
        >
          <CardHeader className="flex flex-row items-center gap-3 sm:gap-4 p-4 sm:p-6">
            <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-orange-500 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Live</CardTitle>
              <CardDescription className="text-sm truncate">
                Points en direct
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un joueur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>
      </div>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'Aucun joueur trouvé' : 'Aucun joueur disponible'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <Card
              key={player.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handlePlayerSelect(player.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                {/* Avatar */}
                {player.avatar && getAvatarUrl(player.avatar) ? (
                  <img
                    src={getAvatarUrl(player.avatar)!}
                    alt={player.nickname}
                    className="w-10 h-10 rounded-full border border-border flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border flex-shrink-0">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">
                    {player.firstName} {player.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {player.nickname}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
