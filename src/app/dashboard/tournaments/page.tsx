'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calendar, Users, Trophy, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

type TournamentStatus = 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';

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
  season: {
    id: string;
    name: string;
    year: number;
  } | null;
  _count: {
    tournamentPlayers: number;
  };
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
  DRAFT: { label: 'Brouillon', variant: 'outline' as const, color: 'text-gray-500' },
  PLANNED: { label: 'Planifié', variant: 'default' as const, color: 'text-blue-500' },
  IN_PROGRESS: { label: 'En cours', variant: 'default' as const, color: 'text-green-500' },
  COMPLETED: { label: 'Terminé', variant: 'secondary' as const, color: 'text-gray-500' },
  CANCELLED: { label: 'Annulé', variant: 'destructive' as const, color: 'text-red-500' },
};

export default function TournamentsPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState(DEFAULT_TOURNAMENT);
  const [loading, setLoading] = useState(false);
  const [filterSeasonId, setFilterSeasonId] = useState<string>('all');

  useEffect(() => {
    fetchTournaments();
    fetchSeasons();
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
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border-2 border-border">
        <div>
          <h1 className="text-4xl font-bold">Tournois</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Gérez les tournois de poker
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau tournoi
            </Button>
          </DialogTrigger>
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
      </div>

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
                      {tournament.season.name} ({tournament.season.year})
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tournament)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(tournament.id)}
                    disabled={tournament.status === 'FINISHED' || tournament._count.tournamentPlayers > 0}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
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
      </div>
    </div>
  );
}
