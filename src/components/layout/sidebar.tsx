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
  TrendingUp,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: TrendingUp, label: 'En Direct', href: '/dashboard/live', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: Award, label: 'Saisons', href: '/dashboard/seasons', roles: ['ANIMATOR', 'ADMIN'] },
  { icon: Calendar, label: 'Tournois', href: '/dashboard/tournaments', roles: ['TOURNAMENT_DIRECTOR', 'ADMIN'] },
  { icon: Users, label: 'Joueurs', href: '/dashboard/players', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: Trophy, label: 'Classement', href: '/dashboard/leaderboard', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  { icon: BarChart3, label: 'Statistiques', href: '/dashboard/statistics', roles: ['PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN'] },
  // Communication masqué pour tous les profils (fonctionnalité désactivée temporairement)
  // { icon: MessageSquare, label: 'Communication', href: '/dashboard/communication', roles: ['ANIMATOR', 'ADMIN'] },
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);

  useEffect(() => {
    // Lire le cookie player-id - se re-exécute à chaque changement de page
    const cookies = document.cookie;
    const playerIdMatch = cookies.match(/player-id=([^;]+)/);

    if (playerIdMatch) {
      const playerId = playerIdMatch[1];

      // Ne refetch que si le joueur a changé
      if (currentPlayer?.id !== playerId) {
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
    } else {
      // Pas de cookie, réinitialiser le joueur
      setCurrentPlayer(null);
    }
  }, [pathname, currentPlayer?.id]);

  const handleLogout = () => {
    // Supprimer le cookie
    document.cookie = 'player-id=; path=/; max-age=0';
    // Rediriger vers la page de login joueur
    router.push('/player/login');
  };

  const handleNavClick = () => {
    // Fermer le drawer mobile après navigation
    if (onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between gap-2 border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Spade className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">WPT VILLELAURE</h1>
            <p className="text-xs text-muted-foreground">Poker Championship</p>
          </div>
        </div>
        {/* Close button for mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-accent"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {menuItems
          .filter((item) => !currentPlayer || item.roles.includes(currentPlayer.role))
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
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
    </>
  );

  return (
    <div className={cn(
      "flex h-full w-64 flex-col bg-card border-r",
      // Desktop: always visible
      "hidden md:flex",
    )}>
      {sidebarContent}
    </div>
  );
}

// Mobile drawer component
export function MobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);

  useEffect(() => {
    const cookies = document.cookie;
    const playerIdMatch = cookies.match(/player-id=([^;]+)/);

    if (playerIdMatch) {
      const playerId = playerIdMatch[1];

      // Ne refetch que si le joueur a changé
      if (currentPlayer?.id !== playerId) {
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
    } else {
      // Pas de cookie, réinitialiser le joueur
      setCurrentPlayer(null);
    }
  }, [pathname, currentPlayer?.id]);

  const handleLogout = () => {
    document.cookie = 'player-id=; path=/; max-age=0';
    router.push('/player/login');
  };

  const handleNavClick = () => {
    onClose();
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-card border-r shadow-xl md:hidden transform transition-transform duration-200 ease-in-out">
        <div className="flex items-center justify-between gap-2 border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Spade className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">WPT VILLELAURE</h1>
              <p className="text-xs text-muted-foreground">Poker Championship</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {menuItems
            .filter((item) => !currentPlayer || item.roles.includes(currentPlayer.role))
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
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
    </>
  );
}

// Mobile header with burger button
export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-card border-b sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-accent"
        aria-label="Ouvrir le menu"
      >
        <Menu className="h-6 w-6" />
      </button>
      <div className="flex items-center gap-2">
        <Spade className="h-6 w-6 text-primary" />
        <span className="font-bold">WPT VILLELAURE</span>
      </div>
    </header>
  );
}
