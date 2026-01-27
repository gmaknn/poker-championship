'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Archive, Trophy, BarChart3, Image } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
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
import RecavePenaltyTiersEditor from '@/components/RecavePenaltyTiersEditor';
import { RecavePenaltyTier } from '@/lib/scoring';

type PlayerRole = 'PLAYER' | 'TOURNAMENT_DIRECTOR' | 'ANIMATOR' | 'ADMIN';

// Type for detailed points configuration
interface DetailedPointsConfig {
  type: 'DETAILED';
  byRank: Record<string, number>;
  rank19Plus: number;
}

// Default championship 2026 points
const CHAMPIONSHIP_2026_POINTS: DetailedPointsConfig = {
  type: 'DETAILED',
  byRank: {
    '1': 1500, '2': 1000, '3': 700, '4': 500, '5': 400, '6': 300,
    '7': 250, '8': 200, '9': 180, '10': 160, '11': 140, '12': 120,
    '13': 100, '14': 90, '15': 80, '16': 70, '17': 60, '18': 50,
  },
  rank19Plus: 0,
};

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
  bustEliminationBonus: 25,
  leaderKillerBonus: 25,
  freeRebuysCount: 2,
  rebuyPenaltyTier1: -50,
  rebuyPenaltyTier2: -100,
  rebuyPenaltyTier3: -150,
  recavePenaltyTiers: [
    { fromRecaves: 3, penaltyPoints: -50 },
    { fromRecaves: 4, penaltyPoints: -100 },
    { fromRecaves: 5, penaltyPoints: -150 },
  ] as RecavePenaltyTier[],
  detailedPointsConfig: null as DetailedPointsConfig | null,
};

export default function SeasonsPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState<SeasonWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<SeasonWithCount | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<PlayerRole | null>(null);
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

  // Vérifier si l'utilisateur peut modifier (Admin uniquement)
  const canEdit = currentUserRole === 'ADMIN';

  useEffect(() => {
    fetchSeasons();
    fetchCurrentUserRole();
  }, []);

  const fetchCurrentUserRole = async () => {
    try {
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
      console.error('Error fetching current user role:', error);
    }
  };

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
        bustEliminationBonus: (season as { bustEliminationBonus?: number }).bustEliminationBonus ?? 25,
        leaderKillerBonus: season.leaderKillerBonus,
        freeRebuysCount: season.freeRebuysCount,
        rebuyPenaltyTier1: season.rebuyPenaltyTier1,
        rebuyPenaltyTier2: season.rebuyPenaltyTier2,
        rebuyPenaltyTier3: season.rebuyPenaltyTier3,
        // Charger les paliers dynamiques ou créer depuis legacy
        recavePenaltyTiers: (season.recavePenaltyTiers as RecavePenaltyTier[] | null) || [
          { fromRecaves: season.freeRebuysCount + 1, penaltyPoints: season.rebuyPenaltyTier1 },
          { fromRecaves: season.freeRebuysCount + 2, penaltyPoints: season.rebuyPenaltyTier2 },
          { fromRecaves: season.freeRebuysCount + 3, penaltyPoints: season.rebuyPenaltyTier3 },
        ],
        // Charger la config de points détaillée si présente
        detailedPointsConfig: (season.detailedPointsConfig as DetailedPointsConfig | null) || null,
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
        bustEliminationBonus: formData.bustEliminationBonus,
        leaderKillerBonus: formData.leaderKillerBonus,
        freeRebuysCount: formData.freeRebuysCount,
        rebuyPenaltyTier1: formData.rebuyPenaltyTier1,
        rebuyPenaltyTier2: formData.rebuyPenaltyTier2,
        rebuyPenaltyTier3: formData.rebuyPenaltyTier3,
        recavePenaltyTiers: formData.recavePenaltyTiers,
        detailedPointsConfig: formData.detailedPointsConfig,
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
      <PageHeader
        title="Saisons"
        description={canEdit ? "Gérez les saisons du championnat" : "Consultez les saisons du championnat"}
        icon={<Trophy className="h-10 w-10" />}
        actions={
          canEdit ? (
            <Button onClick={() => handleOpenDialog()} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Nouvelle saison
            </Button>
          ) : undefined
        }
      />

      {activeSeasons.length === 0 && archivedSeasons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune saison</h3>
            <p className="text-muted-foreground mb-4">
              {canEdit ? "Commencez par créer votre première saison" : "Aucune saison disponible pour le moment"}
            </p>
            {canEdit && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle saison
              </Button>
            )}
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
                      <div className="flex flex-col gap-2 mt-4">
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => router.push(`/dashboard/seasons/${season.id}/leaderboard`)}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Classement
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => router.push(`/dashboard/seasons/${season.id}/exports`)}
                          >
                            <Image className="mr-2 h-4 w-4" />
                            Exports
                          </Button>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
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
                        )}
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
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/dashboard/seasons/${season.id}/leaderboard`)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          Classement
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/dashboard/seasons/${season.id}/exports`)}
                        >
                          <Image className="mr-2 h-4 w-4" />
                          Exports
                        </Button>
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Barème de points par classement (1-18, 19+)</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          detailedPointsConfig: { ...CHAMPIONSHIP_2026_POINTS },
                        });
                      }}
                    >
                      Appliquer barème 2026
                    </Button>
                  </div>

                  {/* Grille des places 1-18 */}
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 18 }, (_, i) => i + 1).map((rank) => (
                      <div key={rank} className="space-y-1">
                        <Label htmlFor={`rank-${rank}`} className="text-xs">
                          {rank}{rank === 1 ? 'er' : 'e'}
                        </Label>
                        <Input
                          id={`rank-${rank}`}
                          type="number"
                          min="0"
                          className="h-8 text-sm"
                          value={formData.detailedPointsConfig?.byRank?.[String(rank)] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                            const currentConfig = formData.detailedPointsConfig || {
                              type: 'DETAILED' as const,
                              byRank: {},
                              rank19Plus: 0,
                            };
                            setFormData({
                              ...formData,
                              detailedPointsConfig: {
                                ...currentConfig,
                                byRank: {
                                  ...currentConfig.byRank,
                                  [String(rank)]: value,
                                },
                              },
                            });
                          }}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Place 19+ */}
                  <div className="mt-4 flex items-center gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="rank19Plus" className="text-sm font-medium">
                        19e place et au-delà
                      </Label>
                      <Input
                        id="rank19Plus"
                        type="number"
                        min="0"
                        className="w-24 h-8 text-sm"
                        value={formData.detailedPointsConfig?.rank19Plus ?? 0}
                        onChange={(e) => {
                          const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                          const currentConfig = formData.detailedPointsConfig || {
                            type: 'DETAILED' as const,
                            byRank: {},
                            rank19Plus: 0,
                          };
                          setFormData({
                            ...formData,
                            detailedPointsConfig: {
                              ...currentConfig,
                              rank19Plus: value,
                            },
                          });
                        }}
                        placeholder="0"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Points attribués aux joueurs classés 19e ou plus
                    </p>
                  </div>

                  {!formData.detailedPointsConfig && (
                    <p className="text-sm text-amber-600 mt-3 p-2 bg-amber-50 rounded border border-amber-200">
                      Cliquez sur &quot;Appliquer barème 2026&quot; pour initialiser le barème détaillé,
                      ou remplissez manuellement les champs ci-dessus.
                    </p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Bonus d&apos;élimination</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bustEliminationBonus">Bonus élim bust</Label>
                      <Input
                        id="bustEliminationBonus"
                        type="number"
                        value={formData.bustEliminationBonus}
                        onChange={(e) =>
                          setFormData({ ...formData, bustEliminationBonus: parseInt(e.target.value) })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Pendant la période de recaves
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eliminationPoints">Bonus élim finale</Label>
                      <Input
                        id="eliminationPoints"
                        type="number"
                        value={formData.eliminationPoints}
                        onChange={(e) =>
                          setFormData({ ...formData, eliminationPoints: parseInt(e.target.value) })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Après la fin des recaves
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
                        Pour élim du leader (après recaves)
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rebuys" className="space-y-4 py-4">
                <RecavePenaltyTiersEditor
                  freeRebuysCount={formData.freeRebuysCount}
                  tiers={formData.recavePenaltyTiers}
                  onFreeRebuysChange={(count) =>
                    setFormData({ ...formData, freeRebuysCount: count })
                  }
                  onTiersChange={(tiers) =>
                    setFormData({ ...formData, recavePenaltyTiers: tiers })
                  }
                />
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
