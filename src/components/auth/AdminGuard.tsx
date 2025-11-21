'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AdminGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // true = ADMIN uniquement, false = ADMIN ou TOURNAMENT_DIRECTOR
}

export function AdminGuard({ children, requireAdmin = false }: AdminGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const isAdmin = session.user.userType === 'admin' || session.user.role === 'ADMIN';
    const isTournamentDirector = session.user.role === 'TOURNAMENT_DIRECTOR';

    // Si on requiert ADMIN et que l'utilisateur n'est pas admin
    if (requireAdmin && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    // Si on requiert au moins TD et que l'utilisateur n'est ni admin ni TD
    if (!requireAdmin && !isAdmin && !isTournamentDirector) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router, requireAdmin]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isAdmin = session.user.userType === 'admin' || session.user.role === 'ADMIN';
  const isTournamentDirector = session.user.role === 'TOURNAMENT_DIRECTOR';

  // Vérifications finales
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Accès refusé</CardTitle>
            </div>
            <CardDescription>
              Cette page est réservée aux administrateurs uniquement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!requireAdmin && !isAdmin && !isTournamentDirector) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Accès refusé</CardTitle>
            </div>
            <CardDescription>
              Cette page est réservée aux administrateurs et directeurs de tournoi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Retour au dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
