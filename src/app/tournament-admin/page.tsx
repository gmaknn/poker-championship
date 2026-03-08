'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, KeyRound } from 'lucide-react';

export default function TournamentAdminLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/tournament-admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Code invalide');
        return;
      }

      // Redirection vers la page de gestion du tournoi
      router.push(`/dashboard/tournaments/${data.tournamentId}`);
      router.refresh();
    } catch (err) {
      console.error('Login error:', err);
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Tournoi</CardTitle>
          <CardDescription>
            Entrez le code d&apos;accès affiché sur l&apos;écran du tournoi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Code 6 caractères"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  className="pl-10 text-center text-2xl tracking-[0.5em] font-mono uppercase"
                  maxLength={6}
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive text-center bg-destructive/10 rounded-lg p-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? 'Connexion...' : 'Accéder au tournoi'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
