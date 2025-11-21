import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [playerInfo, setPlayerInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const [success, setSuccess] = useState(false);

  // Valider le token au chargement
  useEffect(() => {
    if (!token) {
      setError('Token d\'activation manquant');
      setIsValidating(false);
      return;
    }

    fetch(`/api/auth/player/activate?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setIsValid(true);
          setPlayerInfo(data.player);
        } else {
          setError(data.error || 'Token invalide');
        }
      })
      .catch(() => {
        setError('Erreur lors de la validation du token');
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/player/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Erreur lors de l\'activation');
      }
    } catch (error) {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Validation du token en cours...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Compte activé !
            </CardTitle>
            <CardDescription className="text-center">
              Votre compte a été activé avec succès
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Redirection vers la page de connexion...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-destructive">
              Lien invalide
            </CardTitle>
            <CardDescription className="text-center">
              {error || 'Ce lien d\'activation n\'est pas valide ou a expiré'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
              variant="outline"
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Activez votre compte
          </CardTitle>
          <CardDescription className="text-center">
            Bienvenue {playerInfo?.firstName} ! <br />
            Créez votre mot de passe pour activer votre compte.
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
                value={playerInfo?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirmer le mot de passe
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirmez votre mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activation...
                </>
              ) : (
                'Activer mon compte'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
