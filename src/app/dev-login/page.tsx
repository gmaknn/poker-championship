'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, Crown, LogIn, MessageSquare } from 'lucide-react';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  role: 'PLAYER' | 'TOURNAMENT_DIRECTOR' | 'ANIMATOR' | 'ADMIN';
  avatar: string | null;
}

const ROLE_CONFIG = {
  PLAYER: { label: 'Joueur', icon: Users, color: 'bg-blue-500' },
  TOURNAMENT_DIRECTOR: { label: 'Directeur de Tournoi', icon: Shield, color: 'bg-purple-500' },
  ANIMATOR: { label: 'Animateur', icon: MessageSquare, color: 'bg-green-500' },
  ADMIN: { label: 'Administrateur', icon: Crown, color: 'bg-amber-500' },
};

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) return avatar;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function DevLoginPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        // Vérifier que data est bien un tableau
        if (Array.isArray(data)) {
          setPlayers(data);
        } else {
          console.error('Expected array but got:', data);
          setPlayers([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading players:', err);
        setPlayers([]);
        setLoading(false);
      });
  }, []);

  const handleLogin = async (playerId: string) => {
    // Stocker dans un cookie
    document.cookie = `player-id=${playerId}; path=/; max-age=86400`; // 24h

    // Rediriger vers le dashboard
    router.push('/dashboard');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            🎰 Poker Championship
          </CardTitle>
          <CardDescription className="text-center">
            Sélectionnez un joueur pour vous connecter (Dev Mode)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {players.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucun joueur disponible. Créez-en un dans la page Players.
              </div>
            ) : (
              players.map((player) => {
                const roleConfig = ROLE_CONFIG[player.role];
                const RoleIcon = roleConfig.icon;

                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {player.avatar && getAvatarUrl(player.avatar) ? (
                        <img
                          src={getAvatarUrl(player.avatar)!}
                          alt={player.nickname}
                          className="w-12 h-12 rounded-full border-2 border-border"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}

                      {/* Info */}
                      <div>
                        <div className="font-semibold text-lg">{player.nickname}</div>
                        <div className="text-sm text-muted-foreground">
                          {player.firstName} {player.lastName}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          <RoleIcon className="h-3 w-3 mr-1" />
                          {roleConfig.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Button */}
                    <Button onClick={() => handleLogin(player.id)}>
                      <LogIn className="mr-2 h-4 w-4" />
                      Se connecter
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <strong>Note :</strong> Cette page est temporaire pour le développement.
            Elle sera remplacée par une vraie authentification plus tard.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
