'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Phone, Lock } from 'lucide-react';

export default function PlayerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/player-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Identifiant ou mot de passe incorrect');
        return;
      }

      // Redirection selon le rôle du joueur
      const role = data.player?.role;
      let redirectUrl = '/player'; // Par défaut pour PLAYER et ANIMATOR

      if (role === 'ADMIN') {
        redirectUrl = '/dashboard';
      } else if (role === 'TOURNAMENT_DIRECTOR') {
        redirectUrl = '/director';
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Espace Joueur
          </CardTitle>
          <CardDescription className="text-center">
            Connectez-vous pour accéder à votre profil et vos statistiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Téléphone ou Email
              </label>
              <Input
                id="identifier"
                type="text"
                placeholder="06 12 34 56 78 ou email@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Pas encore de compte ? Contactez un administrateur pour recevoir une invitation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
