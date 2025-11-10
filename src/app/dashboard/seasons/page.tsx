'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Archive, Trophy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Season } from '@prisma/client';

type SeasonWithCount = Season & {
  _count?: {
    tournaments: number;
  };
};

const DEFAULT_SEASON_PARAMS = {
  pointsFirst: 1500,
  pointsSecond: 1000,
  pointsThird: 700,
  pointsFourth: 500,
  pointsFifth: 400,
  pointsSixth: 300,
  pointsSeventh: 200,
  pointsEighth: 200,
  pointsNinth: 200,
  pointsTenth: 200,
  pointsEleventh: 100,
  pointsSixteenth: 50,
  eliminationPoints: 50,
  leaderKillerBonus: 25,
  freeRebuysCount: 2,
  rebuyPenaltyTier1: -50,
  rebuyPenaltyTier2: -100,
  rebuyPenaltyTier3: -150,
};

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<SeasonWithCount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    year: new Date().getFullYear(),
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    totalTournamentsCount: '',
    bestTournamentsCount: '',
    ...DEFAULT_SEASON_PARAMS,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      if (response.ok) {
        const data = await response.json();
        setSeasons(data);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (season?: SeasonWithCount) => {
    if (season) {
      setEditingSeason(season);
      setFormData({
        name: season.name,
        year: season.year,
        startDate: new Date(season.startDate).toISOString().split('T')[0],
        endDate: season.endDate ? new Date(season.endDate).toISOString().split('T')[0] : '',
        totalTournamentsCount: season.totalTournamentsCount?.toString() || '',
        bestTournamentsCount: season.bestTournamentsCount?.toString() || '',
        pointsFirst: season.pointsFirst,
        pointsSecond: season.pointsSecond,
        pointsThird: season.pointsThird,
        pointsFourth: season.pointsFourth,
        pointsFifth: season.pointsFifth,
        pointsSixth: season.pointsSixth,
        pointsSeventh: season.pointsSeventh,
        pointsEighth: season.pointsEighth,
        pointsNinth: season.pointsNinth,
        pointsTenth: season.pointsTenth,
        pointsEleventh: season.pointsEleventh,
        pointsSixteenth: season.pointsSixteenth,
        eliminationPoints: season.eliminationPoints,
        leaderKillerBonus: season.leaderKillerBonus,
        freeRebuysCount: season.freeRebuysCount,
        rebuyPenaltyTier1: season.rebuyPenaltyTier1,
        rebuyPenaltyTier2: season.rebuyPenaltyTier2,
        rebuyPenaltyTier3: season.rebuyPenaltyTier3,
      });
    } else {
      setEditingSeason(null);
      const currentYear = new Date().getFullYear();
      setFormData({
        name: `Saison ${currentYear}`,
        year: currentYear,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        totalTournamentsCount: '',
        bestTournamentsCount: '',
        ...DEFAULT_SEASON_PARAMS,
      });
    }
    setError('');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        name: formData.name,
        year: formData.year,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        totalTournamentsCount: formData.totalTournamentsCount ? parseInt(formData.totalTournamentsCount) : null,
        bestTournamentsCount: formData.bestTournamentsCount ? parseInt(formData.bestTournamentsCount) : null,
        pointsFirst: formData.pointsFirst,
        pointsSecond: formData.pointsSecond,
        pointsThird: formData.pointsThird,
        pointsFourth: formData.pointsFourth,
        pointsFifth: formData.pointsFifth,
        pointsSixth: formData.pointsSixth,
        pointsSeventh: formData.pointsSeventh,
        pointsEighth: formData.pointsEighth,
        pointsNinth: formData.pointsNinth,
        pointsTenth: formData.pointsTenth,
        pointsEleventh: formData.pointsEleventh,
        pointsSixteenth: formData.pointsSixteenth,
        eliminationPoints: formData.eliminationPoints,
        leaderKillerBonus: formData.leaderKillerBonus,
        freeRebuysCount: formData.freeRebuysCount,
        rebuyPenaltyTier1: formData.rebuyPenaltyTier1,
        rebuyPenaltyTier2: formData.rebuyPenaltyTier2,
        rebuyPenaltyTier3: formData.rebuyPenaltyTier3,
      };

      const url = editingSeason ? `/api/seasons/${editingSeason.id}` : '/api/seasons';
      const method = editingSeason ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchSeasons();
      } else {
        const data = await response.json();
        setError(data.error || 'Une erreur est survenue');
      }
    } catch (error) {
      setError('Une erreur est survenue');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver cette saison ?')) return;

    try {
      const response = await fetch(`/api/seasons/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSeasons();
      }
    } catch (error) {
      console.error('Error archiving season:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const activeSeasons = seasons.filter(s => s.status === 'ACTIVE');
  const archivedSeasons = seasons.filter(s => s.status === 'ARCHIVED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border-2 border-border">
        <div>
          <h1 className="text-4xl font-bold">Saisons</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Gérez les saisons du championnat
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Nouvelle saison
        </Button>
      </div>

      {activeSeasons.length === 0 && archivedSeasons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune saison</h3>
            <p className="text-muted-foreground mb-4">
              Commencez par créer votre première saison
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle saison
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeSeasons.length > 0 && (
            <div className="bg-muted/20 rounded-lg p-6 border-2 border-border">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                Saisons actives
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {activeSeasons.map((season) => (
                  <Card key={season.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{season.name}</CardTitle>
                        <CardDescription>Année {season.year}</CardDescription>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Début : </span>
                          <span>{new Date(season.startDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        {season.endDate && (
                          <div>
                            <span className="text-muted-foreground">Fin : </span>
                            <span>{new Date(season.endDate).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Tournois : </span>
                          <span className="font-medium">{season._count?.tournaments || 0}</span>
                        </div>
                        {season.bestTournamentsCount && (
                          <div>
                            <span className="text-muted-foreground">Meilleurs scores : </span>
                            <span className="font-medium">
                              {season.bestTournamentsCount}
                              {season.totalTournamentsCount && ` / ${season.totalTournamentsCount}`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenDialog(season)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleArchive(season.id)}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {archivedSeasons.length > 0 && (
            <div className="bg-muted/20 rounded-lg p-6 border-2 border-border">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Archive className="h-6 w-6 text-muted-foreground" />
                Saisons archivées
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {archivedSeasons.map((season) => (
                  <Card key={season.id} className="opacity-75">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{season.name}</CardTitle>
                        <CardDescription>Année {season.year}</CardDescription>
                      </div>
                      <Badge variant="outline">Archivée</Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tournois : </span>
                          <span className="font-medium">{season._count?.tournaments || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSeason ? 'Modifier la saison' : 'Nouvelle saison'}
            </DialogTitle>
            <DialogDescription>
              Configurez les paramètres de la saison et le système de points
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="points">Points</TabsTrigger>
                <TabsTrigger value="rebuys">Recaves</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la saison</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Année</Label>
                    <Input
                      id="year"
                      type="number"
                      min="2020"
                      max="2100"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({ ...formData, year: parseInt(e.target.value) })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Date de fin (optionnel)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Système de meilleures performances</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="totalTournaments">
                        Nombre total de tournois prévus
                      </Label>
                      <Input
                        id="totalTournaments"
                        type="number"
                        min="1"
                        placeholder="Ex: 12"
                        value={formData.totalTournamentsCount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            totalTournamentsCount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bestTournaments">
                        Meilleurs tournois à retenir
                      </Label>
                      <Input
                        id="bestTournaments"
                        type="number"
                        min="1"
                        placeholder="Ex: 10"
                        value={formData.bestTournamentsCount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bestTournamentsCount: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Le classement final ne retiendra que les meilleurs scores de chaque joueur
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="points" className="space-y-4 py-4">
                <div>
                  <h3 className="font-semibold mb-3">Barème de points par classement</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pointsFirst">1er place</Label>
                      <Input
                        id="pointsFirst"
                        type="number"
                        value={formData.pointsFirst}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsFirst: parseInt(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsSecond">2e place</Label>
                      <Input
                        id="pointsSecond"
                        type="number"
                        value={formData.pointsSecond}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsSecond: parseInt(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsThird">3e place</Label>
                      <Input
                        id="pointsThird"
                        type="number"
                        value={formData.pointsThird}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsThird: parseInt(e.target.value) })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsFourth">4e place</Label>
                      <Input
                        id="pointsFourth"
                        type="number"
                        value={formData.pointsFourth}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsFourth: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsFifth">5e place</Label>
                      <Input
                        id="pointsFifth"
                        type="number"
                        value={formData.pointsFifth}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsFifth: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsSixth">6e place</Label>
                      <Input
                        id="pointsSixth"
                        type="number"
                        value={formData.pointsSixth}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsSixth: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsSeventh">7-10e places</Label>
                      <Input
                        id="pointsSeventh"
                        type="number"
                        value={formData.pointsSeventh}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsSeventh: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsEleventh">11-15e places</Label>
                      <Input
                        id="pointsEleventh"
                        type="number"
                        value={formData.pointsEleventh}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsEleventh: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pointsSixteenth">16e+ places</Label>
                      <Input
                        id="pointsSixteenth"
                        type="number"
                        value={formData.pointsSixteenth}
                        onChange={(e) =>
                          setFormData({ ...formData, pointsSixteenth: parseInt(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Bonus</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="eliminationPoints">Points par élimination</Label>
                      <Input
                        id="eliminationPoints"
                        type="number"
                        value={formData.eliminationPoints}
                        onChange={(e) =>
                          setFormData({ ...formData, eliminationPoints: parseInt(e.target.value) })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Après la fin de la période de recave
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leaderKillerBonus">Bonus Leader Killer</Label>
                      <Input
                        id="leaderKillerBonus"
                        type="number"
                        value={formData.leaderKillerBonus}
                        onChange={(e) =>
                          setFormData({ ...formData, leaderKillerBonus: parseInt(e.target.value) })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Pour élimination du leader
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rebuys" className="space-y-4 py-4">
                <div>
                  <h3 className="font-semibold mb-3">Système de malus de recave</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="freeRebuysCount">Nombre de recaves gratuites</Label>
                      <Input
                        id="freeRebuysCount"
                        type="number"
                        min="0"
                        value={formData.freeRebuysCount}
                        onChange={(e) =>
                          setFormData({ ...formData, freeRebuysCount: parseInt(e.target.value) })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Aucun malus jusqu'à ce nombre de recaves
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rebuyPenaltyTier1">Malus 3 recaves</Label>
                        <Input
                          id="rebuyPenaltyTier1"
                          type="number"
                          value={formData.rebuyPenaltyTier1}
                          onChange={(e) =>
                            setFormData({ ...formData, rebuyPenaltyTier1: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rebuyPenaltyTier2">Malus 4 recaves</Label>
                        <Input
                          id="rebuyPenaltyTier2"
                          type="number"
                          value={formData.rebuyPenaltyTier2}
                          onChange={(e) =>
                            setFormData({ ...formData, rebuyPenaltyTier2: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rebuyPenaltyTier3">Malus 5+ recaves</Label>
                        <Input
                          id="rebuyPenaltyTier3"
                          type="number"
                          value={formData.rebuyPenaltyTier3}
                          onChange={(e) =>
                            setFormData({ ...formData, rebuyPenaltyTier3: parseInt(e.target.value) })
                          }
                        />
                      </div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Aperçu du système</h4>
                      <ul className="text-sm space-y-1">
                        <li>• 0-{formData.freeRebuysCount} recaves : 0 point de malus</li>
                        <li>• 3 recaves : {formData.rebuyPenaltyTier1} points</li>
                        <li>• 4 recaves : {formData.rebuyPenaltyTier2} points</li>
                        <li>• 5+ recaves : {formData.rebuyPenaltyTier3} points</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {error && (
              <div className="text-sm text-destructive my-4">{error}</div>
            )}
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingSeason ? 'Modifier' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
