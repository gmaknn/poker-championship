'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Spade,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Award, label: 'Saisons', href: '/dashboard/seasons' },
  { icon: Calendar, label: 'Tournois', href: '/dashboard/tournaments' },
  { icon: Users, label: 'Joueurs', href: '/dashboard/players' },
  { icon: Trophy, label: 'Classement', href: '/dashboard/leaderboard' },
  { icon: BarChart3, label: 'Statistiques', href: '/dashboard/statistics' },
  { icon: Settings, label: 'Paramètres', href: '/dashboard/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex items-center gap-2 border-b px-6 py-4">
        <Spade className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Poker Championship</h1>
          <p className="text-xs text-muted-foreground">Le Cyclope</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
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

      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
