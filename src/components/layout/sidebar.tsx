'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Spade,
  Award,
  Calculator,
  Shield,
  Crown,
  MessageSquare,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: TrendingUp, label: 'En Direct', href: '/dashboard/live', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: Award, label: 'Saisons', href: '/dashboard/seasons', roles: ['ADMIN'] },
  { icon: Calendar, label: 'Tournois', href: '/dashboard/tournaments', roles: ['TOURNAMENT_DIRECTOR', 'ADMIN'] },
  { icon: Users, label: 'Joueurs', href: '/dashboard/players', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: Trophy, label: 'Classement', href: '/dashboard/leaderboard', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: BarChart3, label: 'Statistiques', href: '/dashboard/statistics', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: MessageSquare, label: 'Communication', href: '/dashboard/communication', roles: ['ANIMATOR', 'ADMIN'] },
  { icon: Calculator, label: 'Assistant Jetons', href: '/dashboard/chip-assistant', roles: ['TOURNAMENT_DIRECTOR', 'ADMIN'] },
  { icon: Settings, label: 'Paramètres', href: '/dashboard/settings', roles: ['ADMIN'] },
];

const ROLE_CONFIG = {
  PLAYER: { label: 'Joueur', icon: Users, color: 'bg-blue-500' },
  TOURNAMENT_DIRECTOR: { label: 'TD', icon: Shield, color: 'bg-purple-500' },
  ANIMATOR: { label: 'Animateur', icon: MessageSquare, color: 'bg-green-500' },
  ADMIN: { label: 'Admin', icon: Crown, color: 'bg-amber-500' },
};

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  if (avatar.startsWith('/')) return avatar;
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

interface CurrentPlayer {
  id: string;
  nickname: string;
  avatar: string | null;
  role: 'PLAYER' | 'TOURNAMENT_DIRECTOR' | 'ANIMATOR' | 'ADMIN';
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);

  useEffect(() => {
    // Lire le cookie player-id
    const cookies = document.cookie;
    const playerIdMatch = cookies.match(/player-id=([^;]+)/);

    if (playerIdMatch) {
      const playerId = playerIdMatch[1];

      // Récupérer les infos du joueur
      fetch(`/api/players/${playerId}`)
        .then(res => res.ok ? res.json() : null)
        .then(player => {
          if (player) {
            setCurrentPlayer({
              id: player.id,
              nickname: player.nickname,
              avatar: player.avatar,
              role: player.role,
            });
          }
        })
        .catch(err => console.error('Error loading current player:', err));
    }
  }, []);

  const handleLogout = () => {
    // Supprimer le cookie
    document.cookie = 'player-id=; path=/; max-age=0';
    // Rediriger vers la page de login
    router.push('/dev-login');
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Spade className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold">WPT VILLELAURE</h1>
          <p className="text-xs text-muted-foreground">Poker Championship</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems
          .filter((item) => !currentPlayer || item.roles.includes(currentPlayer.role))
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t p-4 space-y-3">
        {/* Utilisateur connecté */}
        {currentPlayer && (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            {currentPlayer.avatar && getAvatarUrl(currentPlayer.avatar) ? (
              <img
                src={getAvatarUrl(currentPlayer.avatar)!}
                alt={currentPlayer.nickname}
                className="w-10 h-10 rounded-full border-2 border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{currentPlayer.nickname}</div>
              <Badge variant="outline" className="text-xs mt-0.5">
                {ROLE_CONFIG[currentPlayer.role].label}
              </Badge>
            </div>
          </div>
        )}

        {/* Bouton déconnexion */}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
