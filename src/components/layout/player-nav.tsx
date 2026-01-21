'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Home,
  Trophy,
  Calendar,
  Users,
  User,
  LogOut,
  Spade,
  Menu,
  X,
  LogIn,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getAvatarUrl } from '@/lib/avatar';

// Navigation items for player area
const navItems = [
  { icon: Home, label: 'Accueil', href: '/player', mobileLabel: 'Accueil' },
  { icon: Trophy, label: 'Classement', href: '/player/leaderboard', mobileLabel: 'Classement' },
  { icon: Calendar, label: 'Tournois', href: '/player/tournaments', mobileLabel: 'Tournois' },
  { icon: Users, label: 'Joueurs', href: '/player/players', mobileLabel: 'Joueurs' },
  { icon: User, label: 'Mon Profil', href: '/player/profile', mobileLabel: 'Profil', requiresAuth: true },
];

// Stats item (only in sidebar, not bottom nav)
const statsItem = { icon: BarChart3, label: 'Statistiques', href: '/player/stats' };

interface CurrentPlayer {
  id: string;
  nickname: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

// Hook to get current player from session
export function useCurrentPlayer() {
  const [currentPlayer, setCurrentPlayer] = useState<CurrentPlayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const cookies = document.cookie;
        const playerIdMatch = cookies.match(/player-id=([^;]+)/);

        if (playerIdMatch) {
          const playerId = playerIdMatch[1];
          const res = await fetch(`/api/players/${playerId}`);
          if (res.ok) {
            const player = await res.json();
            setCurrentPlayer({
              id: player.id,
              nickname: player.nickname,
              firstName: player.firstName,
              lastName: player.lastName,
              avatar: player.avatar,
            });
          } else {
            setCurrentPlayer(null);
          }
        } else {
          setCurrentPlayer(null);
        }
      } catch (err) {
        console.error('Error checking player session:', err);
        setCurrentPlayer(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [pathname]);

  return { currentPlayer, isLoading };
}

// Desktop Sidebar Component
export function PlayerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();

  const handleLogout = () => {
    document.cookie = 'player-id=; path=/; max-age=0';
    document.cookie = 'player-session=; path=/; max-age=0';
    router.push('/player/login');
    router.refresh();
  };

  return (
    <div className="hidden lg:flex h-full w-64 flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Spade className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold">WPT VILLELAURE</h1>
          <p className="text-xs text-muted-foreground">Espace Joueur</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navItems.map((item) => {
          // Skip auth-required items if not logged in
          if (item.requiresAuth && !currentPlayer) return null;

          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/player' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Stats - only for logged in users */}
        {currentPlayer && (
          <Link
            href={statsItem.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
              pathname === statsItem.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <statsItem.icon className="h-5 w-5 flex-shrink-0" />
            {statsItem.label}
          </Link>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        {currentPlayer ? (
          <>
            {/* User info */}
            <Link
              href="/player/profile"
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <img
                src={getAvatarUrl(currentPlayer.avatar, currentPlayer.nickname)}
                alt={currentPlayer.nickname}
                className="w-10 h-10 rounded-full border-2 border-border"
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{currentPlayer.nickname}</div>
                <p className="text-xs text-muted-foreground truncate">
                  {currentPlayer.firstName} {currentPlayer.lastName}
                </p>
              </div>
            </Link>

            <Button
              variant="ghost"
              className="w-full justify-start min-h-[44px]"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Déconnexion
            </Button>
          </>
        ) : (
          <Link href="/player/login">
            <Button variant="default" className="w-full min-h-[44px]">
              <LogIn className="mr-2 h-5 w-5" />
              Se connecter
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// Mobile Header with burger menu
export function PlayerMobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { currentPlayer } = useCurrentPlayer();

  return (
    <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2">
          <Spade className="h-6 w-6 text-primary" />
          <span className="font-bold text-sm sm:text-base">WPT VILLELAURE</span>
        </div>
      </div>

      {currentPlayer ? (
        <Link href="/player/profile" className="p-1">
          <img
            src={getAvatarUrl(currentPlayer.avatar, currentPlayer.nickname)}
            alt={currentPlayer.nickname}
            className="w-8 h-8 rounded-full border-2 border-border"
          />
        </Link>
      ) : (
        <Link href="/player/login">
          <Button variant="ghost" size="sm" className="min-h-[44px]">
            <LogIn className="h-5 w-5" />
          </Button>
        </Link>
      )}
    </header>
  );
}

// Mobile Drawer (slide from left)
export function PlayerMobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentPlayer } = useCurrentPlayer();

  const handleLogout = () => {
    document.cookie = 'player-id=; path=/; max-age=0';
    document.cookie = 'player-session=; path=/; max-age=0';
    onClose();
    router.push('/player/login');
    router.refresh();
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
        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col bg-card border-r shadow-xl lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-4">
          <div className="flex items-center gap-2">
            <Spade className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-bold">WPT VILLELAURE</h1>
              <p className="text-xs text-muted-foreground">Espace Joueur</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            if (item.requiresAuth && !currentPlayer) return null;

            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/player' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {currentPlayer && (
            <Link
              href={statsItem.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]',
                pathname === statsItem.href
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <statsItem.icon className="h-5 w-5 flex-shrink-0" />
              {statsItem.label}
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t p-4 space-y-3">
          {currentPlayer ? (
            <>
              <Link
                href="/player/profile"
                onClick={onClose}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <img
                  src={getAvatarUrl(currentPlayer.avatar, currentPlayer.nickname)}
                  alt={currentPlayer.nickname}
                  className="w-10 h-10 rounded-full border-2 border-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{currentPlayer.nickname}</div>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentPlayer.firstName} {currentPlayer.lastName}
                  </p>
                </div>
              </Link>

              <Button
                variant="ghost"
                className="w-full justify-start min-h-[48px]"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Déconnexion
              </Button>
            </>
          ) : (
            <Link href="/player/login" onClick={onClose}>
              <Button variant="default" className="w-full min-h-[48px]">
                <LogIn className="mr-2 h-5 w-5" />
                Se connecter
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

// Mobile Bottom Navigation Bar
export function PlayerBottomNav() {
  const pathname = usePathname();
  const { currentPlayer } = useCurrentPlayer();

  // Filter items based on auth status (profile requires auth)
  const visibleItems = navItems.filter(item => !item.requiresAuth || currentPlayer);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/player' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full min-w-[64px] px-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 mb-1', isActive && 'scale-110')} />
              <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">
                {item.mobileLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
