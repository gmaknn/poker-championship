'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  status: string;
};

export default function PlayerSelectPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Espace Joueur</h1>
        <p className="text-xl text-muted-foreground">
          Sélectionnez votre profil pour accéder à vos statistiques
        </p>
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
            className="pl-10"
          />
        </div>
      </div>

      {/* Players Grid */}
      <div className="max-w-4xl mx-auto">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlayers.map((player) => (
              <Card
                key={player.id}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handlePlayerSelect(player.id)}
              >
                <CardHeader>
                  <CardTitle className="text-xl">
                    {player.firstName} {player.lastName}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {player.nickname}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
