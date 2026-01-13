'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Calendar, Users, Trophy, Edit2, Tv, Copy, Check } from 'lucide-react';
import type { PlayerRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionCard } from '@/components/ui/section-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BlindStructureEditor from '@/components/BlindStructureEditor';
import ChipSetSelector from '@/components/ChipSetSelector';
import ChipConfigDisplay from '@/components/ChipConfigDisplay';
import TournamentPlayersManager from '@/components/TournamentPlayersManager';
import TournamentTimer from '@/components/TournamentTimer';
import EliminationManager from '@/components/EliminationManager';
import TableDistribution from '@/components/TableDistribution';
import TournamentResults from '@/components/TournamentResults';
import PrizePoolManager from '@/components/PrizePoolManager';
import TournamentDirectorsManager from '@/components/TournamentDirectorsManager';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type TournamentStatus = 'PLANNED' | 'REGISTRATION' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

interface Tournament {
  id: string;
  name: string | null;
  seasonId: string | null;
  date: string;
  buyInAmount: number;
  startingChips: number;
  targetDuration: number;
  totalPlayers?: number | null;
  status: TournamentStatus;
  levelDuration: number;
  prizePool?: number | null;
  season: {
    id: string;
    name: string;
    year: number;
  } | null;
  _count: {
    tournamentPlayers: number;
    blindLevels: number;
  };
}

const STATUS_CONFIG = {
  PLANNED: { label: 'Planifié', variant: 'default' as const },
  REGISTRATION: { label: 'Inscriptions', variant: 'default' as const },
  IN_PROGRESS: { label: 'En cours', variant: 'default' as const },
  FINISHED: { label: 'Terminé', variant: 'secondary' as const },
  CANCELLED: { label: 'Annulé', variant: 'destructive' as const },
};

/**
 * Safely parse JSON response, checking Content-Type first
 */
async function safeJsonParse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON but received: ${contentType || 'unknown'}`);
  }
  return response.json();
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<PlayerRole | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    date: '',
    buyInAmount: 0,
    startingChips: 0,
    targetDuration: 0,
    totalPlayers: 0,
    status: 'PLANNED' as TournamentStatus,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [currentTab, setCurrentTab] = useState('structure');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isUnsavedChangesDialogOpen, setIsUnsavedChangesDialogOpen] = useState(false);

  const isAdmin = currentUserRole === 'ADMIN';

  const loadCurrentUser = async () => {
    try {
      // 1. Vérifier la session NextAuth (production)
      if (session?.user?.role) {
        setCurrentUserRole(session.user.role as PlayerRole);
        return;
      }

      // 2. Fallback: cookie player-id (dev mode)
      const cookies = document.cookie;
      const playerIdMatch = cookies.match(/player-id=([^;]+)/);

      if (playerIdMatch) {
        const playerId = playerIdMatch[1];
        const response = await fetch(`/api/players/${playerId}`);
        if (response.ok) {
          const player = await response.json();
          setCurrentUserRole(player.role);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments/${id}`);
      if (response.ok) {
        const data = await safeJsonParse(response);
        setTournament(data);
      } else {
        router.push('/dashboard/tournaments');
      }
    } catch (error) {
      console.error('Error fetching tournament:', error);
      router.push('/dashboard/tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = () => {
    if (!tournament) return;
    setEditFormData({
      name: tournament.name || '',
      date: new Date(tournament.date).toISOString().slice(0, 16),
      buyInAmount: tournament.buyInAmount,
      startingChips: tournament.startingChips,
      targetDuration: tournament.targetDuration,
      totalPlayers: tournament.totalPlayers || 0,
      status: tournament.status,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          date: new Date(editFormData.date).toISOString(),
        }),
      });

      if (response.ok) {
        await fetchTournament();
        setIsEditDialogOpen(false);
      } else {
        try {
          const error = await safeJsonParse(response);
          alert(error.error || 'Erreur lors de la modification');
        } catch {
          // If parsing fails, show generic error
          alert(`Erreur lors de la modification (${response.status})`);
        }
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      alert('Erreur lors de la modification');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTvUrl = async () => {
    const tvUrl = `${window.location.origin}/tv-v3/${tournament?.id}`;

    try {
      await navigator.clipboard.writeText(tvUrl);
      setIsCopied(true);

      // Reset après 2 secondes
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      alert('Impossible de copier l\'URL');
    }
  };

  const handleTabChange = (newTab: string) => {
    // If trying to leave structure tab with unsaved changes, show warning
    if (currentTab === 'structure' && hasUnsavedChanges && newTab !== 'structure') {
      setPendingTab(newTab);
      setIsUnsavedChangesDialogOpen(true);
    } else {
      setCurrentTab(newTab);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setIsUnsavedChangesDialogOpen(false);
    if (pendingTab) {
      setCurrentTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleCancelTabChange = () => {
    setIsUnsavedChangesDialogOpen(false);
    setPendingTab(null);
  };

  // Effect to load initial data
  useEffect(() => {
    fetchTournament();
    loadCurrentUser();
  }, [id, session]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!tournament) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[tournament.status];

  return (
    <div className="space-y-6">
      {/* Header - Zone HERO avec variant ink */}
      <SectionCard variant="ink" noPadding className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/tournaments')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{tournament.name}</h1>
                <Badge variant={statusConfig.variant} className="text-lg px-4 py-1">{statusConfig.label}</Badge>
              </div>
              <p className="text-ink-foreground/70 mt-1 text-base">
                {tournament.season?.name} ({tournament.season?.year})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(`/tv-v3/${tournament.id}`, '_blank')}
            >
              <Tv className="mr-2 h-4 w-4" />
              Vue TV
            </Button>
            <Button
              variant="outline"
              onClick={handleCopyTvUrl}
              title="Copier l'URL du mode TV"
            >
              {isCopied ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {isCopied ? 'Copié !' : 'Copier URL'}
            </Button>
            <Button
              variant="outline"
              onClick={handleEditClick}
              disabled={tournament.status === 'FINISHED'}
              title={tournament.status === 'FINISHED' ? 'Impossible de modifier un tournoi terminé' : ''}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Info cards - KPIs avec variant ink */}
      <div className="grid gap-4 md:grid-cols-4">
        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Date</span>
            <Calendar className="h-4 w-4 text-ink-foreground/50" />
          </div>
          <div className="text-lg font-bold">
            {format(new Date(tournament.date), 'd MMM yyyy', { locale: fr })}
          </div>
          <p className="text-xs text-ink-foreground/60">
            {format(new Date(tournament.date), "HH'h'mm", { locale: fr })}
          </p>
        </SectionCard>

        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Joueurs</span>
            <Users className="h-4 w-4 text-ink-foreground/50" />
          </div>
          <div className="text-lg font-bold">
            {tournament._count.tournamentPlayers}
            {tournament.totalPlayers && ` / ${tournament.totalPlayers}`}
          </div>
          <p className="text-xs text-ink-foreground/60">inscrits</p>
        </SectionCard>

        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Buy-in</span>
            <Trophy className="h-4 w-4 text-ink-foreground/50" />
          </div>
          <div className="text-lg font-bold">{tournament.buyInAmount}€</div>
          <p className="text-xs text-ink-foreground/60">
            {tournament.startingChips.toLocaleString()} jetons
          </p>
        </SectionCard>

        <SectionCard variant="ink" noPadding className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink-foreground/70">Structure</span>
            <Trophy className="h-4 w-4 text-ink-foreground/50" />
          </div>
          <div className="text-lg font-bold">
            {tournament._count.blindLevels} niveaux
          </div>
          <p className="text-xs text-ink-foreground/60">
            {Math.floor(tournament.targetDuration / 60)}h
            {tournament.targetDuration % 60}min
          </p>
        </SectionCard>
      </div>

      {/* Tabs - Navigation avec fond ink */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <div className="bg-ink rounded-lg p-1 border border-border shadow-md">
          <TabsList className="bg-transparent w-full justify-start">
            <TabsTrigger value="structure">Structure des blinds</TabsTrigger>
            <TabsTrigger value="config">Jetons</TabsTrigger>
            <TabsTrigger value="players" data-admin-tab="players">Joueurs & Recaves</TabsTrigger>
            <TabsTrigger value="tables" data-admin-tab="tables">Tables</TabsTrigger>
            <TabsTrigger value="timer">Timer</TabsTrigger>
            <TabsTrigger value="eliminations">Éliminations</TabsTrigger>
            <TabsTrigger value="prizepool">Prize Pool</TabsTrigger>
            <TabsTrigger value="results" data-admin-tab="results">Résultats</TabsTrigger>
            {isAdmin && <TabsTrigger value="directors">Directeurs</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="structure" className="mt-6">
          {tournament.status === 'FINISHED' ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl font-bold text-green-600 mb-4">
                  Terminé
                </div>
                <p className="text-muted-foreground">
                  Le tournoi est terminé. Les modifications ne sont plus possibles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <BlindStructureEditor
              tournamentId={tournament.id}
              startingChips={tournament.startingChips}
              onSave={() => fetchTournament()}
              onUnsavedChangesChange={setHasUnsavedChanges}
            />
          )}
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          {tournament.status === 'FINISHED' ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl font-bold text-green-600 mb-4">
                  Terminé
                </div>
                <p className="text-muted-foreground">
                  Le tournoi est terminé. Les modifications ne sont plus possibles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ChipSetSelector
              tournamentId={tournament.id}
              startingChips={tournament.startingChips}
              totalPlayers={tournament.totalPlayers || tournament._count.tournamentPlayers || 10}
              onUpdate={() => fetchTournament()}
            />
          )}
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          {tournament.status === 'FINISHED' ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl font-bold text-green-600 mb-4">
                  Terminé
                </div>
                <p className="text-muted-foreground">
                  Le tournoi est terminé. Les modifications ne sont plus possibles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <TournamentPlayersManager
              tournamentId={tournament.id}
              tournament={{
                id: tournament.id,
                status: tournament.status,
                buyInAmount: tournament.buyInAmount,
              }}
              onUpdate={() => fetchTournament()}
            />
          )}
        </TabsContent>

        <TabsContent value="tables" className="mt-6">
          {tournament.status === 'FINISHED' ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl font-bold text-green-600 mb-4">
                  Terminé
                </div>
                <p className="text-muted-foreground">
                  Le tournoi est terminé. Les modifications ne sont plus possibles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <TableDistribution
              tournamentId={tournament.id}
              onUpdate={() => fetchTournament()}
            />
          )}
        </TabsContent>

        <TabsContent value="timer" className="mt-6">
          <TournamentTimer
            tournamentId={tournament.id}
            tournamentStatus={tournament.status}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>

        <TabsContent value="eliminations" className="mt-6">
          {tournament.status === 'FINISHED' ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl font-bold text-green-600 mb-4">
                  Terminé
                </div>
                <p className="text-muted-foreground">
                  Le tournoi est terminé. Les modifications ne sont plus possibles.
                </p>
              </CardContent>
            </Card>
          ) : (
            <EliminationManager
              tournamentId={tournament.id}
              onUpdate={() => fetchTournament()}
            />
          )}
        </TabsContent>

        <TabsContent value="prizepool" className="mt-6">
          <PrizePoolManager
            tournamentId={tournament.id}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <TournamentResults
            tournamentId={tournament.id}
            onUpdate={() => fetchTournament()}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="directors" className="mt-6">
            <TournamentDirectorsManager
              tournamentId={tournament.id}
              isAdmin={isAdmin}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier le tournoi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nom du tournoi *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date et heure *</Label>
                  <Input
                    id="edit-date"
                    type="datetime-local"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Statut</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value: TournamentStatus) =>
                      setEditFormData({ ...editFormData, status: value })
                    }
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANNED">Planifié</SelectItem>
                      <SelectItem value="REGISTRATION">Inscriptions</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="FINISHED">Terminé</SelectItem>
                      <SelectItem value="CANCELLED">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-buyin">Buy-in (€)</Label>
                  <Input
                    id="edit-buyin"
                    type="number"
                    min="0"
                    value={editFormData.buyInAmount}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, buyInAmount: parseFloat(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-chips">Jetons de départ</Label>
                  <Input
                    id="edit-chips"
                    type="number"
                    min="1000"
                    value={editFormData.startingChips}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, startingChips: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Durée cible (minutes)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min="30"
                    value={editFormData.targetDuration}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, targetDuration: parseInt(e.target.value) })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-players">Nombre de joueurs</Label>
                  <Input
                    id="edit-players"
                    type="number"
                    min="2"
                    value={editFormData.totalPlayers}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, totalPlayers: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSaving}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes warning dialog */}
      <Dialog open={isUnsavedChangesDialogOpen} onOpenChange={setIsUnsavedChangesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifications non sauvegardées</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Vous avez des modifications non sauvegardées dans la structure des blinds.
              Que souhaitez-vous faire ?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCancelTabChange}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscardChanges}
            >
              Abandonner les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
