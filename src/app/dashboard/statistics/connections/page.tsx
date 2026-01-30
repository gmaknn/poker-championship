'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  Search,
  ArrowUpDown,
  LogIn,
  Shield,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) return avatar;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

interface PlayerConnection {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  hasAccount: boolean;
  lastLoginAt: string | null;
  loginCount: number;
  createdAt: string;
}

interface ConnectionStats {
  totalPlayers: number;
  activatedAccounts: number;
  inactivatedAccounts: number;
  connectionsToday: number;
  connectionsThisWeek: number;
  neverConnected: number;
}

interface ConnectionData {
  stats: ConnectionStats;
  players: PlayerConnection[];
}

type SortField = 'lastLoginAt' | 'loginCount' | 'nickname' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function ConnectionStatisticsPage() {
  const [data, setData] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivated, setFilterActivated] = useState<'all' | 'activated' | 'notActivated'>('all');
  const [sortField, setSortField] = useState<SortField>('lastLoginAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    fetch('/api/statistics/connections')
      .then(res => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error('Accès réservé aux administrateurs');
          }
          throw new Error('Erreur lors du chargement');
        }
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Statistiques de connexion"
          description="Chargement..."
          icon={<LogIn className="h-10 w-10 text-primary" />}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Statistiques de connexion"
          description=""
          icon={<LogIn className="h-10 w-10 text-primary" />}
        />
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-destructive">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Filtrage et tri
  let filteredPlayers = data.players.filter(player => {
    const matchesSearch =
      player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.nickname.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterActivated === 'all' ||
      (filterActivated === 'activated' && player.hasAccount) ||
      (filterActivated === 'notActivated' && !player.hasAccount);

    return matchesSearch && matchesFilter;
  });

  // Tri
  filteredPlayers = filteredPlayers.sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'lastLoginAt':
        const dateA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const dateB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        comparison = dateA - dateB;
        break;
      case 'loginCount':
        comparison = a.loginCount - b.loginCount;
        break;
      case 'nickname':
        comparison = a.nickname.localeCompare(b.nickname);
        break;
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques de connexion"
        description="Suivi des connexions des joueurs"
        icon={<LogIn className="h-10 w-10 text-primary" />}
      />

      {/* Stats globales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comptes activés</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.activatedAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Sur {data.stats.totalPlayers} joueurs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente d'activation</CardTitle>
            <UserX className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.inactivatedAccounts}</div>
            <p className="text-xs text-muted-foreground">
              Comptes non activés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connexions aujourd'hui</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.connectionsToday}</div>
            <p className="text-xs text-muted-foreground">
              Joueurs connectés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cette semaine</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.connectionsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              7 derniers jours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des connexions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Détail des connexions
          </CardTitle>
          <CardDescription>
            Liste de tous les joueurs avec leurs statistiques de connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un joueur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActivated === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActivated('all')}
              >
                Tous
              </Button>
              <Button
                variant={filterActivated === 'activated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActivated('activated')}
              >
                Activés
              </Button>
              <Button
                variant={filterActivated === 'notActivated' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterActivated('notActivated')}
              >
                Non activés
              </Button>
            </div>
          </div>

          {/* Tableau */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Joueur</th>
                  <th className="text-left py-3 px-2 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-primary"
                      onClick={() => handleSort('lastLoginAt')}
                    >
                      Dernière connexion
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-center py-3 px-2 font-medium">
                    <button
                      className="flex items-center gap-1 hover:text-primary mx-auto"
                      onClick={() => handleSort('loginCount')}
                    >
                      Connexions
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="text-center py-3 px-2 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      Aucun joueur trouvé
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((player) => (
                    <tr key={player.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          {player.avatar && getAvatarUrl(player.avatar) ? (
                            <img
                              src={getAvatarUrl(player.avatar)!}
                              alt={player.nickname}
                              className="w-10 h-10 rounded-full border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{player.nickname}</div>
                            <div className="text-sm text-muted-foreground">
                              {player.firstName} {player.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {player.lastLoginAt ? (
                          <div>
                            <div className="font-medium">
                              {format(new Date(player.lastLoginAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(player.lastLoginAt), { addSuffix: true, locale: fr })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Jamais</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-bold text-lg">{player.loginCount}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {player.hasAccount ? (
                          player.loginCount > 0 ? (
                            <Badge variant="default" className="bg-green-500">
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Activé
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            En attente
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Stats de bas de page */}
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            {filteredPlayers.length} joueur{filteredPlayers.length > 1 ? 's' : ''} affiché{filteredPlayers.length > 1 ? 's' : ''}
            {data.stats.neverConnected > 0 && (
              <span className="ml-4">
                • {data.stats.neverConnected} compte{data.stats.neverConnected > 1 ? 's' : ''} activé{data.stats.neverConnected > 1 ? 's' : ''} jamais connecté{data.stats.neverConnected > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
