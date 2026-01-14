'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

// Dev login is only visible when NEXT_PUBLIC_DEV_LOGIN=1
const IS_DEV_LOGIN_ENABLED = process.env.NEXT_PUBLIC_DEV_LOGIN === '1';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDevLoading, setIsDevLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email ou mot de passe incorrect');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Dev-only admin login
   * 1. Calls /api/dev/login to setup admin user
   * 2. Uses returned credentials with standard signIn
   */
  const handleDevLogin = async () => {
    setError('');
    setIsDevLoading(true);

    try {
      // Step 1: Setup dev admin user
      const setupResponse = await fetch('/api/dev/login', {
        method: 'POST',
      });

      if (setupResponse.status === 404) {
        setError('Dev login non disponible');
        return;
      }

      if (!setupResponse.ok) {
        setError('Erreur lors de la configuration admin');
        return;
      }

      const { credentials } = await setupResponse.json();

      // Step 2: Sign in with the credentials
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Erreur de connexion admin');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setError('Une erreur est survenue');
    } finally {
      setIsDevLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            Poker Championship
          </CardTitle>
          <CardDescription className="text-center">
            Le Cyclope - Connexion Administrateur
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
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
              />
            </div>
            {error && (
              <div className="text-sm text-destructive text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          {/* Dev-only admin login button */}
          {IS_DEV_LOGIN_ENABLED && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center gap-2 mb-3 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Mode Développement</span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                onClick={handleDevLogin}
                disabled={isDevLoading || isLoading}
              >
                {isDevLoading ? 'Connexion...' : 'Connexion Admin (local)'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Crée un compte admin@local.test pour les tests E2E
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
