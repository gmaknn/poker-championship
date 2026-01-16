'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Plus, Calendar, Users, Trophy, Edit2, Trash2, Eye, Grid3x3, List, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import Image from 'next/image';
import { PageHeader } from '@/components/PageHeader';

type TournamentStatus = 'PLANNED' | 'REGISTRATION' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
type PlayerRole = 'PLAYER' | 'TOURNAMENT_DIRECTOR' | 'ADMIN';

interface Tournament {
  id: string;
  name: string | null;
  seasonId: string | null;
  createdById?: string | null;
  date: string;
  buyInAmount: number;
  startingChips: number;
  targetDuration: number;
  totalPlayers?: number | null;
  status: TournamentStatus;
  season: {
    id: string;
    name: string;
    year: number;
  } | null;
  _count: {
    tournamentPlayers: number;
  };
  podium?: Array<{
    finalRank: number;
    player: {
      id: string;
      firstName: string;
      lastName: string;
      nickname: string;
      avatar: string | null;
    };
    totalPoints: number;
    prizeAmount: number | null;
  }>;
}

interface Season {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string | null;
}

const DEFAULT_TOURNAMENT = {
  name: '',
  seasonId: '',
  type: 'CHAMPIONSHIP',
  date: new Date().toISOString().slice(0, 16),
  buyInAmount: 10,
  startingChips: 5000,
  targetDuration: 180,
  totalPlayers: 20,
  status: 'PLANNED' as TournamentStatus,
};

const STATUS_CONFIG = {
  PLANNED: { label: 'Planifié', variant: 'default' as const, color: 'text-blue-500' },
  REGISTRATION: { label: 'Inscriptions', variant: 'default' as const, color: 'text-cyan-500' },
  IN_PROGRESS: { label: 'En cours', variant: 'default' as const, color: 'text-green-500' },
  FINISHED: { label: 'Terminé', variant: 'secondary' as const, color: 'text-gray-500' },
  CANCELLED: { label: 'Annulé', variant: 'destructive' as const, color: 'text-red-500' },
};

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar || avatar.trim() === '') return null;

  // Check if it's already a valid URL
  if (avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('/')) {
    try {
      // Validate the URL
      if (avatar.startsWith('/')) {
        return avatar; // Relative URL, assume valid
      }
      new URL(avatar);
      return avatar;
    } catch {
      return null;
    }
  }

  // Si c'est juste un nom (comme "Heart"), générer une URL Dicebear
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function TournamentsPage() {
  console.log('🎬 TournamentsPage component loaded');
  const router = useRouter();
  const { data: session } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState(DEFAULT_TOURNAMENT);
  const [loading, setLoading] = useState(false);
  const [filterSeasonId, setFilterSeasonId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pendingBlindStructure, setPendingBlindStructure] = useState<any[] | null>(null);
  const [pendingChipConfig, setPendingChipConfig] = useState<any | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<PlayerRole | null>(null);

  useEffect(() => {
    fetchTournaments();
    fetchSeasons();
    loadCurrentUser();
  }, [session]);

  const loadCurrentUser = async () => {
    try {
      // 1. Vérifier la session NextAuth (production)
      if (session?.user?.role) {
        console.log('🔐 Session NextAuth role:', session.user.role);
        setCurrentUserRole(session.user.role as PlayerRole);
        return;
      }

      // 2. Fallback: cookie player-id (dev mode)
      const cookies = document.cookie;
      console.log('🍪 Cookies:', cookies);
      const playerIdMatch = cookies.match(/player-id=([^;]+)/);
      console.log('🔍 Player ID Match:', playerIdMatch);

      if (playerIdMatch) {
        const playerId = playerIdMatch[1];
        console.log('👤 Player ID:', playerId);
        const response = await fetch(`/api/players/${playerId}`);
        if (response.ok) {
          const player = await response.json();
          console.log('✅ Player loaded:', player);
          console.log('🎭 Player role:', player.role);
          setCurrentUserRole(player.role);
        } else {
          console.error('❌ Failed to fetch player:', response.status);
        }
      } else {
        console.warn('⚠️ No player-id cookie found');
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const canCreateTournament = () => {
    const canCreate = currentUserRole === 'TOURNAMENT_DIRECTOR' || currentUserRole === 'ADMIN';
    console.log('🔐 canCreateTournament:', { currentUserRole, canCreate });
    return canCreate;
  };

  const canEditTournament = (tournament: Tournament) => {
    const userId = getCurrentUserId();
    console.log('🔍 canEditTournament:', {
      currentUserRole,
      userId,
      tournamentId: tournament.id,
      tournamentCreatedById: tournament.createdById,
      match: tournament.createdById === userId,
    });

    if (currentUserRole === 'ADMIN') return true;
    if (currentUserRole === 'TOURNAMENT_DIRECTOR') {
      // TD can only edit their own tournaments
      return tournament.createdById === userId;
    }
    return false;
  };

  const canDeleteTournament = (tournament: Tournament) => {
    if (currentUserRole === 'ADMIN') return true;
    if (currentUserRole === 'TOURNAMENT_DIRECTOR') {
      // TD can only delete their own tournaments
      return tournament.createdById === getCurrentUserId();
    }
    return false;
  };

  const getCurrentUserId = () => {
    const cookies = document.cookie;
    const playerIdMatch = cookies.match(/player-id=([^;]+)/);
    return playerIdMatch ? playerIdMatch[1] : null;
  };

  // Vérifier si on vient de l'assistant jetons
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('create') === 'true') {
      const storedData = sessionStorage.getItem('recommendedTournament');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          setFormData(prev => ({
            ...prev,
            startingChips: data.startingChips,
            totalPlayers: data.totalPlayers,
            targetDuration: data.targetDuration,
          }));
          // Stocker la structure de blinds pour l'utiliser après la création
          if (data.blindStructure) {
            setPendingBlindStructure(data.blindStructure);
          }
          // Stocker la configuration des jetons pour l'utiliser après la création
          if (data.chipConfig) {
            setPendingChipConfig(data.chipConfig);
          }
          setIsDialogOpen(true);
          // Nettoyer après utilisation
          sessionStorage.removeItem('recommendedTournament');
        } catch (error) {
          console.error('Error parsing recommended tournament data:', error);
        }
      }
    }
  }, []);

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/tournaments');
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data);
        // Set default season to the most recent active one
        const activeSeason = data.find((s: Season) =>
          !s.endDate || new Date(s.endDate) > new Date()
        );
        if (activeSeason) {
          setFormData(prev => ({ ...prev, seasonId: activeSeason.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editingTournament
        ? `/api/tournaments/${editingTournament.id}`
        : '/api/tournaments';

      const method = editingTournament ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: new Date(formData.date).toISOString(),
        }),
      });

      if (response.ok) {
        const createdTournament = await response.json();

        // Si on a une structure de blinds en attente, la sauvegarder
        if (!editingTournament && pendingBlindStructure && pendingBlindStructure.length > 0) {
          try {
            await fetch(`/api/tournaments/${createdTournament.id}/blinds`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                levels: pendingBlindStructure,
              }),
            });
            setPendingBlindStructure(null);
          } catch (blindError) {
            console.error('Error saving blind structure:', blindError);
            // Ne pas bloquer la création du tournoi si la structure de blinds échoue
          }
        }

        // Si on a une configuration de jetons en attente, la sauvegarder
        if (!editingTournament && pendingChipConfig) {
          try {
            console.log('Saving chip config:', pendingChipConfig);
            const chipConfigResponse = await fetch(`/api/tournaments/${createdTournament.id}/chip-config`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pendingChipConfig),
            });

            if (chipConfigResponse.ok) {
              console.log('Chip config saved successfully');
            } else {
              const error = await chipConfigResponse.json();
              console.error('Error response from chip-config API:', error);
            }
            setPendingChipConfig(null);
          } catch (chipConfigError) {
            console.error('Error saving chip configuration:', chipConfigError);
            // Ne pas bloquer la création du tournoi si la config des jetons échoue
          }
        }

        await fetchTournaments();
        setIsDialogOpen(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving tournament:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name || '',
      type: (tournament as any).type || 'CHAMPIONSHIP',
      seasonId: tournament.seasonId || '',
      date: new Date(tournament.date).toISOString().slice(0, 16),
      buyInAmount: tournament.buyInAmount,
      startingChips: tournament.startingChips,
      targetDuration: tournament.targetDuration,
      totalPlayers: tournament.totalPlayers || 20,
      status: tournament.status,
    });
    setIsDialogOpen(true);
  };

  const handleClone = async (tournament: Tournament) => {
    try {
      setLoading(true);

      // Récupérer les détails complets du tournoi
      const response = await fetch(`/api/tournaments/${tournament.id}`);
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des détails du tournoi');
      }

      const tournamentDetails = await response.json();

      // Récupérer la structure des blinds
      const blindsResponse = await fetch(`/api/tournaments/${tournament.id}/blinds`);
      let blindStructure = null;
      if (blindsResponse.ok) {
        blindStructure = await blindsResponse.json();
      }

      // Récupérer la configuration des jetons
      const chipConfigResponse = await fetch(`/api/tournaments/${tournament.id}/chip-config`);
      let chipConfig = null;
      if (chipConfigResponse.ok) {
        chipConfig = await chipConfigResponse.json();
      }

      // Préparer le formulaire avec les données du tournoi source
      const clonedName = `${tournament.name} (copie)`;
      const now = new Date();
      const clonedDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 jours par défaut

      setFormData({
        name: clonedName,
        type: (tournamentDetails as any).type || 'CHAMPIONSHIP',
        seasonId: tournament.seasonId || '',
        date: clonedDate.toISOString().slice(0, 16),
        buyInAmount: tournament.buyInAmount,
        startingChips: tournament.startingChips,
        targetDuration: tournament.targetDuration,
        totalPlayers: tournament.totalPlayers || 20,
        status: 'PLANNED',
      });

      // Stocker la structure de blinds et la config de jetons pour la création
      if (blindStructure) {
        setPendingBlindStructure(blindStructure);
      }
      if (chipConfig) {
        setPendingChipConfig(chipConfig);
      }

      // Ouvrir le dialogue de création
      setEditingTournament(null);
      setIsDialogOpen(true);

    } catch (error) {
      console.error('Error cloning tournament:', error);
      alert('Erreur lors du clonage du tournoi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce tournoi ?')) return;

    try {
      const response = await fetch(`/api/tournaments/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTournaments();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditingTournament(null);
    setPendingBlindStructure(null);
    setPendingChipConfig(null);
    setFormData({
      ...DEFAULT_TOURNAMENT,
      seasonId: seasons[0]?.id || '',
    });
  };

  const filteredTournaments = filterSeasonId === 'all'
    ? tournaments
    : tournaments.filter(t => t.seasonId === filterSeasonId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournois"
        description="Gérez les tournois de poker"
        icon={<Trophy className="h-10 w-10 text-primary" />}
        actions={
          <div className="flex items-center gap-3">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
              <ToggleGroupItem value="grid" aria-label="Vue grille">
                <Grid3x3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Vue liste">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            {canCreateTournament() && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau tournoi
              </Button>
            )}
          </div>
        }
      />

      {/* Dialog pour créer/modifier un tournoi */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTournament ? 'Modifier le tournoi' : 'Créer un tournoi'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom du tournoi *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Tournoi hebdomadaire #1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="seasonId">Saison *</Label>
                    <select
                      id="seasonId"
                      value={formData.seasonId}
                      onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Sélectionner une saison</option>
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name} ({season.year})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="type">Type de tournoi *</Label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="CHAMPIONSHIP">Championnat</option>
                      <option value="CASUAL">Tournoi libre</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date et heure *</Label>
                      <Input
                        id="date"
                        type="datetime-local"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Statut</Label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as TournamentStatus })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                          <option key={value} value={value}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                </TabsContent>

                <TabsContent value="config" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyInAmount">Buy-in (€) *</Label>
                      <Input
                        id="buyInAmount"
                        type="number"
                        min="0"
                        value={formData.buyInAmount}
                        onChange={(e) => setFormData({ ...formData, buyInAmount: parseFloat(e.target.value) })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="startingChips">Jetons de départ *</Label>
                      <Input
                        id="startingChips"
                        type="number"
                        min="1000"
                        step="1000"
                        value={formData.startingChips}
                        onChange={(e) => setFormData({ ...formData, startingChips: parseInt(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="targetDuration">Durée estimée (minutes) *</Label>
                      <Input
                        id="targetDuration"
                        type="number"
                        min="30"
                        step="15"
                        value={formData.targetDuration}
                        onChange={(e) => setFormData({ ...formData, targetDuration: parseInt(e.target.value) })}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="totalPlayers">Nombre de joueurs</Label>
                      <Input
                        id="totalPlayers"
                        type="number"
                        min="2"
                        value={formData.totalPlayers}
                        onChange={(e) => setFormData({ ...formData, totalPlayers: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted p-4 space-y-2">
                    <h4 className="font-medium">Aperçu de la configuration</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Buy-in:</span> {formData.buyInAmount}€
                      </div>
                      <div>
                        <span className="text-muted-foreground">Jetons:</span> {formData.startingChips.toLocaleString()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Durée:</span> {Math.floor(formData.targetDuration / 60)}h{formData.targetDuration % 60}min
                      </div>
                      <div>
                        <span className="text-muted-foreground">Joueurs:</span> {formData.totalPlayers || 'Non spécifié'}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={loading}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Filter by season */}
      <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-4 border-2 border-border">
        <Label className="font-semibold">Filtrer par saison:</Label>
        <select
          value={filterSeasonId}
          onChange={(e) => setFilterSeasonId(e.target.value)}
          className="flex h-10 rounded-md border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">Toutes les saisons</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name} ({season.year})
            </option>
          ))}
        </select>
      </div>

      {/* Tournaments list */}
      <div className="bg-muted/20 rounded-lg p-6 border-2 border-border">
        <h2 className="text-2xl font-bold mb-6">Liste des Tournois ({filteredTournaments.length})</h2>

        {/* Vue Grille */}
        {viewMode === 'grid' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((tournament) => {
          const statusConfig = STATUS_CONFIG[tournament.status];
          return (
            <Card key={tournament.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{tournament.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tournament.season?.name} ({tournament.season?.year})
                    </p>
                  </div>
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(tournament.date), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {tournament._count.tournamentPlayers} joueur{tournament._count.tournamentPlayers > 1 ? 's' : ''}
                      {tournament.totalPlayers && ` / ${tournament.totalPlayers}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                    <span>Buy-in: {tournament.buyInAmount}€ • {tournament.startingChips.toLocaleString()} jetons</span>
                  </div>
                </div>

                {/* Podium pour tournois terminés */}
                {tournament.status === 'FINISHED' && tournament.podium && tournament.podium.length >= 3 && (
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-1 mb-2">
                      <Trophy className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-semibold text-muted-foreground">Podium</span>
                    </div>
                    <div className="flex gap-2">
                      {/* 1ère place */}
                      <div className="flex-1 flex flex-col items-center p-2 rounded-md border-2 border-yellow-500 bg-yellow-500/5">
                        {getAvatarUrl(tournament.podium[0].player.avatar) ? (
                          <Image
                            src={getAvatarUrl(tournament.podium[0].player.avatar)!}
                            alt={tournament.podium[0].player.nickname}
                            width={40}
                            height={40}
                            className="rounded-full border-2 border-yellow-500 mb-1"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-yellow-500 mb-1">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <Trophy className="h-3 w-3 text-yellow-500 mb-1" />
                        <span className="text-xs font-bold">#1</span>
                        <span className="text-xs text-center line-clamp-1" title={tournament.podium[0].player.nickname}>
                          {tournament.podium[0].player.nickname}
                        </span>
                      </div>

                      {/* 2e place */}
                      <div className="flex-1 flex flex-col items-center p-2 rounded-md border border-gray-400 bg-gray-400/5">
                        {getAvatarUrl(tournament.podium[1].player.avatar) ? (
                          <Image
                            src={getAvatarUrl(tournament.podium[1].player.avatar)!}
                            alt={tournament.podium[1].player.nickname}
                            width={32}
                            height={32}
                            className="rounded-full border border-gray-400 mb-1"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-gray-400 mb-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <Trophy className="h-3 w-3 text-gray-400 mb-1" />
                        <span className="text-xs font-bold">#2</span>
                        <span className="text-xs text-center line-clamp-1" title={tournament.podium[1].player.nickname}>
                          {tournament.podium[1].player.nickname}
                        </span>
                      </div>

                      {/* 3e place */}
                      <div className="flex-1 flex flex-col items-center p-2 rounded-md border border-amber-700 bg-amber-700/5">
                        {getAvatarUrl(tournament.podium[2].player.avatar) ? (
                          <Image
                            src={getAvatarUrl(tournament.podium[2].player.avatar)!}
                            alt={tournament.podium[2].player.nickname}
                            width={32}
                            height={32}
                            className="rounded-full border border-amber-700 mb-1"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-amber-700 mb-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <Trophy className="h-3 w-3 text-amber-700 mb-1" />
                        <span className="text-xs font-bold">#3</span>
                        <span className="text-xs text-center line-clamp-1" title={tournament.podium[2].player.nickname}>
                          {tournament.podium[2].player.nickname}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/dashboard/tournaments/${tournament.id}`)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    Détails
                  </Button>
                  {canCreateTournament() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(tournament)}
                      title="Cloner ce tournoi"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {canEditTournament(tournament) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tournament)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  {canDeleteTournament(tournament) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(tournament.id)}
                      disabled={tournament.status === 'FINISHED' || tournament._count.tournamentPlayers > 0}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filteredTournaments.length === 0 && (
          <div className="col-span-full">
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-semibold">Aucun tournoi trouvé</p>
                <p className="text-sm mt-2">
                  Créez votre premier tournoi pour commencer
                </p>
              </div>
            </Card>
          </div>
        )}
          </div>
        )}

        {/* Vue Liste */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {filteredTournaments.map((tournament) => {
              const statusConfig = STATUS_CONFIG[tournament.status];
              return (
                <div
                  key={tournament.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors gap-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1">
                    <div className="flex flex-col gap-1 sm:min-w-[180px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{tournament.name}</h3>
                        <Badge variant={statusConfig.variant} className="text-xs">
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {tournament.season?.name} ({tournament.season?.year})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-6 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {format(new Date(tournament.date), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {tournament._count.tournamentPlayers} joueur{tournament._count.tournamentPlayers > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                        <span>{tournament.buyInAmount}€ • {tournament.startingChips.toLocaleString()} jetons</span>
                      </div>
                    </div>

                    {/* Podium pour tournois terminés (vue liste) - caché sur mobile */}
                    {tournament.status === 'FINISHED' && tournament.podium && tournament.podium.length >= 3 && (
                      <div className="hidden lg:flex items-center gap-3 pl-6 border-l">
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs font-semibold text-muted-foreground">Podium:</span>
                        </div>
                        <div className="flex gap-2">
                          {/* 1ère place */}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md border-2 border-yellow-500 bg-yellow-500/5">
                            {tournament.podium[0].player.avatar ? (
                              <Image
                                src={tournament.podium[0].player.avatar}
                                alt={tournament.podium[0].player.nickname}
                                width={24}
                                height={24}
                                className="rounded-full border border-yellow-500"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-yellow-500">
                                <Users className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-xs font-bold text-yellow-600">1st</span>
                            <span className="text-xs max-w-[80px] truncate" title={tournament.podium[0].player.nickname}>
                              {tournament.podium[0].player.nickname}
                            </span>
                          </div>

                          {/* 2e place */}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-400 bg-gray-400/5">
                            {tournament.podium[1].player.avatar ? (
                              <Image
                                src={tournament.podium[1].player.avatar}
                                alt={tournament.podium[1].player.nickname}
                                width={24}
                                height={24}
                                className="rounded-full border border-gray-400"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-gray-400">
                                <Users className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-xs font-bold text-gray-500">2nd</span>
                            <span className="text-xs max-w-[80px] truncate" title={tournament.podium[1].player.nickname}>
                              {tournament.podium[1].player.nickname}
                            </span>
                          </div>

                          {/* 3e place */}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-700 bg-amber-700/5">
                            {tournament.podium[2].player.avatar ? (
                              <Image
                                src={tournament.podium[2].player.avatar}
                                alt={tournament.podium[2].player.nickname}
                                width={24}
                                height={24}
                                className="rounded-full border border-amber-700"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-amber-700">
                                <Users className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-xs font-bold text-amber-700">3rd</span>
                            <span className="text-xs max-w-[80px] truncate" title={tournament.podium[2].player.nickname}>
                              {tournament.podium[2].player.nickname}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                      onClick={() => router.push(`/dashboard/tournaments/${tournament.id}`)}
                    >
                      <Eye className="h-4 w-4 sm:mr-1 sm:h-3 sm:w-3" />
                      <span className="hidden sm:inline">Détails</span>
                    </Button>
                    {canCreateTournament() && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        onClick={() => handleClone(tournament)}
                        title="Cloner ce tournoi"
                      >
                        <Copy className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                    {canEditTournament(tournament) && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        onClick={() => handleEdit(tournament)}
                      >
                        <Edit2 className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                    {canDeleteTournament(tournament) && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        onClick={() => handleDelete(tournament.id)}
                        disabled={tournament.status === 'FINISHED' || tournament._count.tournamentPlayers > 0}
                      >
                        <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredTournaments.length === 0 && (
              <Card className="p-12">
                <div className="text-center text-muted-foreground">
                  <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-semibold">Aucun tournoi trouvé</p>
                  <p className="text-sm mt-2">
                    Créez votre premier tournoi pour commencer
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
