'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<'admin' | 'player'>('admin');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        userType,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === 'Account not activated') {
          setError('Compte non activé. Vérifiez votre email pour activer votre compte.');
        } else {
          setError('Email ou mot de passe incorrect');
        }
      } else {
        // Redirection selon le type d'utilisateur
        if (userType === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/player');
        }
        router.refresh();
      }
    } catch (error) {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
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
            Le Cyclope - Connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="admin"
            className="w-full"
            onValueChange={(value) => {
              setUserType(value as 'admin' | 'player');
              setError('');
            }}
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="admin">Administrateur</TabsTrigger>
              <TabsTrigger value="player">Joueur</TabsTrigger>
            </TabsList>
            <TabsContent value="admin">
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
                  <div className="text-sm text-destructive text-center">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="player">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="player-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="player-email"
                    type="email"
                    placeholder="joueur@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="player-password" className="text-sm font-medium">
                    Mot de passe
                  </label>
                  <Input
                    id="player-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                {error && (
                  <div className="text-sm text-destructive text-center">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
