'use client';

import { useEffect, useState } from 'react';
import { UserPlus, X, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Director {
  id: string;
  playerId: string;
  assignedAt: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    nickname: string;
    role: string;
  };
}

interface AvailableDirector {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  role: string;
}

interface TournamentDirectorsManagerProps {
  tournamentId: string;
  isAdmin: boolean;
}

export default function TournamentDirectorsManager({
  tournamentId,
  isAdmin,
}: TournamentDirectorsManagerProps) {
  const [directors, setDirectors] = useState<Director[]>([]);
  const [availableDirectors, setAvailableDirectors] = useState<AvailableDirector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [confirmRemoveDirector, setConfirmRemoveDirector] = useState<Director | null>(null);

  useEffect(() => {
    fetchDirectors();
  }, [tournamentId]);

  const fetchDirectors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch current directors
      const directorsRes = await fetch(`/api/tournaments/${tournamentId}/directors`);
      if (!directorsRes.ok) {
        throw new Error('Failed to fetch directors');
      }
      const directorsData = await directorsRes.json();
      setDirectors(directorsData.directors || []);
      setAvailableDirectors(directorsData.availableDirectors || []);
    } catch (err) {
      console.error('Error fetching directors:', err);
      setError('Erreur lors du chargement des directeurs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDirector = async () => {
    if (!selectedPlayerId) return;

    try {
      setIsAdding(true);
      setError(null);

      const response = await fetch(`/api/tournaments/${tournamentId}/directors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selectedPlayerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add director');
      }

      setSelectedPlayerId('');
      await fetchDirectors();
    } catch (err) {
      console.error('Error adding director:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDirector = async (playerId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/tournaments/${tournamentId}/directors`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove director');
      }

      setConfirmRemoveDirector(null);
      await fetchDirectors();
    } catch (err) {
      console.error('Error removing director:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Directeurs de tournoi
          </CardTitle>
          <CardDescription>
            Les directeurs assignés peuvent gérer ce tournoi (inscriptions, timer, éliminations, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Current directors list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Directeurs actuels</h4>
            {directors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun directeur assigné. Le créateur du tournoi a les droits de gestion par défaut.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {directors.map((director) => (
                  <Badge
                    key={director.id}
                    variant="secondary"
                    className="flex items-center gap-2 py-2 px-3"
                  >
                    <span>
                      {director.player.nickname}
                      <span className="text-muted-foreground ml-1">
                        ({director.player.firstName} {director.player.lastName})
                      </span>
                    </span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-destructive/20"
                        onClick={() => setConfirmRemoveDirector(director)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add director section (Admin only) */}
          {isAdmin && (
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium">Ajouter un directeur</h4>
              {availableDirectors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun directeur de tournoi disponible. Créez d&apos;abord un joueur avec le rôle
                  &quot;Tournament Director&quot;.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Sélectionner un directeur..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDirectors.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.nickname} ({player.firstName} {player.lastName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddDirector}
                    disabled={!selectedPlayerId || isAdding}
                  >
                    {isAdding ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Ajouter
                  </Button>
                </div>
              )}
            </div>
          )}

          {!isAdmin && (
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Seuls les administrateurs peuvent modifier les directeurs assignés.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirm remove dialog */}
      <Dialog open={!!confirmRemoveDirector} onOpenChange={() => setConfirmRemoveDirector(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer le directeur</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment retirer {confirmRemoveDirector?.player.nickname} des directeurs
              de ce tournoi ? Cette personne ne pourra plus gérer ce tournoi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemoveDirector(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRemoveDirector && handleRemoveDirector(confirmRemoveDirector.playerId)}
            >
              Retirer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
