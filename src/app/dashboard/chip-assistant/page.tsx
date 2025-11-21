'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calculator,
  Package,
  Users,
  Coins,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Plus,
  Trash2,
  Trophy,
} from 'lucide-react';
import type { DistributionResult, ChipDistribution, TournamentStructure } from '@/lib/chipDistribution';
import { PageHeader } from '@/components/PageHeader';

import { AdminGuard } from '@/components/auth/AdminGuard';
type ChipSet = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  denominations: {
    id: string;
    value: number;
    quantity: number;
    color: string;
  }[];
};

type DenominationForm = {
  value: string;
  quantity: string;
  color: string;
};

type CalculationResult = DistributionResult & {
  tournamentStructure?: TournamentStructure;
};

export default function ChipAssistantPage() {
  const router = useRouter();
  const [chipSets, setChipSets] = useState<ChipSet[]>([]);
  const [selectedChipSets, setSelectedChipSets] = useState<string[]>([]);
  const [playersCount, setPlayersCount] = useState('10');
  const [stackSize, setStackSize] = useState('5000');
  const [targetDuration, setTargetDuration] = useState('180'); // 3 heures par défaut
  const [levelDuration, setLevelDuration] = useState('15'); // 15 min par défaut
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  // Dialog states for creating/editing chip set
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingChipSet, setEditingChipSet] = useState<ChipSet | null>(null);
  const [chipSetName, setChipSetName] = useState('');
  const [chipSetDescription, setChipSetDescription] = useState('');
  const [denominations, setDenominations] = useState<DenominationForm[]>([
    { value: '25', quantity: '100', color: '#FFFFFF' },
    { value: '100', quantity: '100', color: '#FF0000' },
    { value: '500', quantity: '50', color: '#00FF00' },
    { value: '1000', quantity: '25', color: '#000000' },
  ]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchChipSets();
  }, []);

  // Calculer automatiquement le stack optimal quand les mallettes ou le nombre de joueurs changent
  useEffect(() => {
    if (selectedChipSets.length > 0 && playersCount) {
      calculateOptimalStack();
    }
  }, [selectedChipSets, playersCount]);

  const calculateOptimalStack = () => {
    const selected = chipSets.filter((cs) => selectedChipSets.includes(cs.id));
    if (selected.length === 0) return;

    // Calculer le total de jetons disponibles
    let totalValue = 0;
    selected.forEach((chipSet) => {
      chipSet.denominations.forEach((d) => {
        totalValue += d.value * d.quantity;
      });
    });

    const players = parseInt(playersCount) || 10;
    const rebuysEstimated = Math.ceil(players * 0.6); // 60% de rebuys
    const totalStacks = players + rebuysEstimated;

    // Calculer le stack optimal
    const optimalStack = Math.floor(totalValue / totalStacks);

    // Arrondir à un multiple de 100
    const roundedStack = Math.round(optimalStack / 100) * 100;

    setStackSize(roundedStack.toString());
  };

  const fetchChipSets = async () => {
    try {
      const response = await fetch('/api/chip-sets');
      if (response.ok) {
        const data = await response.json();
        setChipSets(data.filter((cs: ChipSet) => cs.isActive));

        // Auto-sélectionner la première mallette active
        const activeChipSets = data.filter((cs: ChipSet) => cs.isActive);
        if (activeChipSets.length > 0) {
          setSelectedChipSets([activeChipSets[0].id]);
        }
      }
    } catch (error) {
      console.error('Error fetching chip sets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (selectedChipSets.length === 0) {
      alert('Sélectionnez au moins une mallette');
      return;
    }

    const players = parseInt(playersCount) || 10;
    const rebuysExpected = Math.ceil(players * 0.6); // 60% de rebuys automatique

    setIsCalculating(true);
    try {
      const response = await fetch('/api/chip-assistant/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chipSetIds: selectedChipSets,
          stackSize: parseInt(stackSize),
          playersCount: players,
          rebuysExpected,
          targetDuration: parseInt(targetDuration),
          levelDuration: parseInt(levelDuration),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors du calcul');
      }
    } catch (error) {
      console.error('Error calculating distribution:', error);
      alert('Erreur lors du calcul');
    } finally {
      setIsCalculating(false);
    }
  };

  const toggleChipSet = (id: string) => {
    setSelectedChipSets((prev) =>
      prev.includes(id) ? prev.filter((csId) => csId !== id) : [...prev, id]
    );
  };

  const handleAddDenomination = () => {
    setDenominations([
      ...denominations,
      { value: '', quantity: '', color: '#000000' },
    ]);
  };

  const handleRemoveDenomination = (index: number) => {
    setDenominations(denominations.filter((_, i) => i !== index));
  };

  const handleDenominationChange = (
    index: number,
    field: keyof DenominationForm,
    value: string
  ) => {
    const newDenominations = [...denominations];
    newDenominations[index] = { ...newDenominations[index], [field]: value };
    setDenominations(newDenominations);
  };

  const handleCreateChipSet = async () => {
    if (!chipSetName.trim()) {
      alert('Le nom de la mallette est requis');
      return;
    }

    // Valider les dénominations
    const validDenoms = denominations.filter(
      (d) => d.value && d.quantity && parseInt(d.value) > 0 && parseInt(d.quantity) > 0
    );

    if (validDenoms.length === 0) {
      alert('Ajoutez au moins une dénomination valide');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/chip-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: chipSetName,
          description: chipSetDescription || undefined,
          isActive: true,
          denominations: validDenoms.map((d) => ({
            value: parseInt(d.value),
            quantity: parseInt(d.quantity),
            color: d.color,
          })),
        }),
      });

      if (response.ok) {
        await fetchChipSets();
        setIsCreateDialogOpen(false);
        resetCreateForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating chip set:', error);
      alert('Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setChipSetName('');
    setChipSetDescription('');
    setDenominations([
      { value: '25', quantity: '100', color: '#FFFFFF' },
      { value: '100', quantity: '100', color: '#FF0000' },
      { value: '500', quantity: '50', color: '#00FF00' },
      { value: '1000', quantity: '25', color: '#000000' },
    ]);
    setEditingChipSet(null);
  };

  const handleOpenEditDialog = (chipSet: ChipSet) => {
    setEditingChipSet(chipSet);
    setChipSetName(chipSet.name);
    setChipSetDescription(chipSet.description || '');
    setDenominations(
      chipSet.denominations.map((d) => ({
        value: d.value.toString(),
        quantity: d.quantity.toString(),
        color: d.color,
      }))
    );
    setIsCreateDialogOpen(true);
  };

  const handleUpdateChipSet = async () => {
    if (!editingChipSet) return;

    if (!chipSetName.trim()) {
      alert('Le nom de la mallette est requis');
      return;
    }

    const validDenoms = denominations.filter(
      (d) => d.value && d.quantity && parseInt(d.value) > 0 && parseInt(d.quantity) > 0
    );

    if (validDenoms.length === 0) {
      alert('Ajoutez au moins une dénomination valide');
      return;
    }

    setIsCreating(true);
    try {
      // Mettre à jour les infos de la mallette
      const updateResponse = await fetch(`/api/chip-sets/${editingChipSet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: chipSetName,
          description: chipSetDescription || undefined,
          isActive: editingChipSet.isActive,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Erreur lors de la mise à jour de la mallette');
      }

      // Supprimer les anciennes dénominations
      await Promise.all(
        editingChipSet.denominations.map((d) =>
          fetch(`/api/chip-sets/${editingChipSet.id}/denominations/${d.id}`, {
            method: 'DELETE',
          })
        )
      );

      // Ajouter les nouvelles dénominations
      await Promise.all(
        validDenoms.map((d) =>
          fetch(`/api/chip-sets/${editingChipSet.id}/denominations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              value: parseInt(d.value),
              quantity: parseInt(d.quantity),
              color: d.color,
            }),
          })
        )
      );

      await fetchChipSets();
      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch (error) {
      console.error('Error updating chip set:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = () => {
    if (!result) return null;

    switch (result.status) {
      case 'sufficient':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'tight':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'insufficient':
        return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!result) return 'default';

    switch (result.status) {
      case 'sufficient':
        return 'default';
      case 'tight':
        return 'secondary';
      case 'insufficient':
        return 'destructive';
    }
  };

  const getStatusText = () => {
    if (!result) return '';

    switch (result.status) {
      case 'sufficient':
        return 'Jetons suffisants';
      case 'tight':
        return 'Jetons justes';
      case 'insufficient':
        return 'Jetons insuffisants';
    }
  };

  const handleCreateTournament = () => {
    if (!result || !result.tournamentStructure) return;

    const players = parseInt(playersCount);
    const rebuysExpected = Math.ceil(players * 0.6);

    // Stocker les données recommandées dans sessionStorage
    const tournamentData = {
      startingChips: parseInt(stackSize),
      totalPlayers: players,
      targetDuration: result.tournamentStructure.totalDuration,
      blindStructure: result.tournamentStructure.levels,
      chipDistribution: result.playerDistribution,
      // Configuration des jetons
      chipConfig: {
        chipSetsUsed: selectedChipSets,
        distribution: result.playerDistribution,
        playersCount: players,
        stackSize: parseInt(stackSize),
        rebuysExpected: rebuysExpected,
      },
      fromChipAssistant: true,
    };

    sessionStorage.setItem('recommendedTournament', JSON.stringify(tournamentData));

    // Rediriger vers la page de création de tournoi
    router.push('/dashboard/tournaments?create=true');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <AdminGuard requireAdmin={true}>
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Assistant Jetons"
        description="Calculez la distribution optimale de jetons pour votre tournoi"
        icon={<Calculator className="h-10 w-10 text-primary" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Chip Sets Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mallettes de Jetons</CardTitle>
                  <CardDescription>
                    Sélectionnez les mallettes à utiliser pour le tournoi
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {chipSets.length === 0 ? (
                <div className="text-center py-6">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Aucune mallette active. Créez-en une pour commencer.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une mallette
                  </Button>
                </div>
              ) : (
                chipSets.map((chipSet) => (
                  <div
                    key={chipSet.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 transition-colors ${
                      selectedChipSets.includes(chipSet.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-transparent bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChipSets.includes(chipSet.id)}
                      onChange={() => toggleChipSet(chipSet.id)}
                      className="mt-1 cursor-pointer"
                    />
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleChipSet(chipSet.id)}
                    >
                      <div className="font-semibold">{chipSet.name}</div>
                      {chipSet.description && (
                        <p className="text-sm text-muted-foreground">
                          {chipSet.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {chipSet.denominations.map((denom) => (
                          <Badge key={denom.id} variant="outline" className="text-xs">
                            <div
                              className="w-3 h-3 rounded-full mr-1"
                              style={{ backgroundColor: denom.color }}
                            />
                            {denom.value} × {denom.quantity}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditDialog(chipSet);
                      }}
                    >
                      Configurer
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Tournament Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du Tournoi</CardTitle>
              <CardDescription>
                Le stack est calculé automatiquement selon les jetons disponibles et une estimation de 60% de rebuys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="players">Nombre de joueurs</Label>
                <Input
                  id="players"
                  type="number"
                  min="1"
                  value={playersCount}
                  onChange={(e) => setPlayersCount(e.target.value)}
                  placeholder="10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stack">Stack de départ (calculé automatiquement)</Label>
                <Input
                  id="stack"
                  type="number"
                  min="100"
                  step="100"
                  value={stackSize}
                  onChange={(e) => setStackSize(e.target.value)}
                  placeholder="5000"
                />
                <p className="text-xs text-muted-foreground">
                  Stack optimal basé sur vos jetons disponibles
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetDuration">Durée cible (min)</Label>
                  <Input
                    id="targetDuration"
                    type="number"
                    min="60"
                    step="30"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(e.target.value)}
                    placeholder="180"
                  />
                  <p className="text-xs text-muted-foreground">
                    Durée totale du tournoi
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="levelDuration">Durée niveau (min)</Label>
                  <Input
                    id="levelDuration"
                    type="number"
                    min="5"
                    step="5"
                    value={levelDuration}
                    onChange={(e) => setLevelDuration(e.target.value)}
                    placeholder="15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Durée de chaque niveau
                  </p>
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={isCalculating || selectedChipSets.length === 0}
                className="w-full"
                size="lg"
              >
                <Calculator className="mr-2 h-5 w-5" />
                {isCalculating ? 'Calcul en cours...' : 'Calculer la distribution'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Résultat</CardTitle>
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <Badge variant={getStatusColor()}>{getStatusText()}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">
                        {result.totalChipsPerPlayer}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Jetons / joueur
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold">
                        {result.rebuysSupported}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Rebuys supportés
                      </div>
                    </div>
                  </div>

                  {/* Metrics (if available) */}
                  {result.metrics && (
                    <div className="space-y-2">
                      <div className="font-semibold text-sm">Qualité de la configuration :</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-xl font-bold text-green-600 dark:text-green-400">
                            {result.metrics.overallScore.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Score Global
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                            {result.metrics.blindCoverageScore.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Couverture Blinds
                          </div>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                            {result.metrics.playabilityScore.toFixed(1)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Jouabilité
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Distribution */}
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">
                      Distribution par joueur :
                    </div>
                    <div className="space-y-2">
                      {result.playerDistribution.map((dist, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full border-2"
                              style={{
                                backgroundColor: dist.color,
                                borderColor: dist.color,
                              }}
                            />
                            <div>
                              <div className="font-semibold">{dist.value}</div>
                              <div className="text-xs text-muted-foreground">
                                Valeur
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {dist.count} × {dist.value}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              = {dist.total}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t mt-3">
                      <div className="flex items-center justify-between font-bold">
                        <span>Total par joueur</span>
                        <span>{result.totalChipsPerPlayer}</span>
                      </div>
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="space-y-2">
                      {result.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                        >
                          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            {warning}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Revaluation Suggestions */}
                  {result.revaluationSuggestions && result.revaluationSuggestions.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Suggestions de revalorisation :
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Pour améliorer la configuration, vous pouvez utiliser les jetons avec des valeurs différentes :
                        </p>
                        <div className="space-y-2">
                          {result.revaluationSuggestions.map((suggestion, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-semibold text-blue-900 dark:text-blue-100">
                                Jeton de couleur {suggestion.color}
                              </div>
                              <div className="text-blue-700 dark:text-blue-300 ml-4">
                                Valeur nominale : {suggestion.originalValue} → Utiliser comme : {suggestion.suggestedValue}
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 ml-4">
                                {suggestion.reason} (+{suggestion.improvedCoverage.toFixed(1)}% couverture)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chips Remaining */}
                  {result.chipsRemaining.some((c) => c.quantity > 0) && (
                    <div className="space-y-2">
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Jetons restants :
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {result.chipsRemaining
                          .filter((c) => c.quantity > 0)
                          .map((chip, index) => (
                            <Badge key={index} variant="outline">
                              <div
                                className="w-3 h-3 rounded-full mr-1"
                                style={{ backgroundColor: chip.color }}
                              />
                              {chip.value} × {chip.quantity}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Race-off Recommendations */}
                  {result.raceOffRecommendations &&
                    result.raceOffRecommendations.length > 0 && (
                      <div className="space-y-2">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Recommandations de race-off :
                        </div>
                        <div className="space-y-2">
                          {result.raceOffRecommendations.map((rec, index) => (
                            <div
                              key={index}
                              className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
                            >
                              <div className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                                Jetons de {rec.value} - Niveau {rec.level}
                              </div>
                              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                Blinds: {rec.blindLevel.smallBlind}/
                                {rec.blindLevel.bigBlind}
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {rec.reason}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Tournament Structure */}
              {result.tournamentStructure && (
                <Card>
                  <CardHeader>
                    <CardTitle>Structure de Tournoi Recommandée</CardTitle>
                    <CardDescription>
                      Structure adaptée à un stack de {result.tournamentStructure.averageStack} jetons (
                      {result.tournamentStructure.levels.length} niveaux,{' '}
                      {Math.floor(result.tournamentStructure.totalDuration / 60)}h
                      {result.tournamentStructure.totalDuration % 60}min)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b sticky top-0 bg-card">
                        <div>Niveau</div>
                        <div>Small Blind</div>
                        <div>Big Blind</div>
                        <div>Ante</div>
                        <div>Durée</div>
                      </div>
                      {result.tournamentStructure.levels.map((level) => (
                        <div
                          key={level.level}
                          className="grid grid-cols-5 gap-2 text-sm py-2 border-b last:border-0 hover:bg-muted/30"
                        >
                          <div className="font-semibold">{level.level}</div>
                          <div>{level.smallBlind.toLocaleString()}</div>
                          <div>{level.bigBlind.toLocaleString()}</div>
                          <div>{level.ante ? level.ante.toLocaleString() : '-'}</div>
                          <div>{level.duration} min</div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        onClick={handleCreateTournament}
                        className="w-full"
                        size="lg"
                      >
                        <Trophy className="mr-2 h-5 w-5" />
                        Créer un tournoi avec cette configuration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Coins className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Calculez votre distribution
                </h3>
                <p className="text-sm text-muted-foreground text-center">
                  Sélectionnez vos mallettes et configurez les paramètres du tournoi,
                  puis cliquez sur "Calculer la distribution"
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog pour créer/éditer une mallette */}
      <Dialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChipSet ? 'Configurer la Mallette' : 'Créer une Mallette de Jetons'}
            </DialogTitle>
            <DialogDescription>
              {editingChipSet
                ? 'Modifiez la composition de votre mallette'
                : 'Ajoutez une nouvelle mallette avec ses dénominations'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Informations de la mallette */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la mallette *</Label>
              <Input
                id="name"
                value={chipSetName}
                onChange={(e) => setChipSetName(e.target.value)}
                placeholder="Mallette Principale"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Input
                id="description"
                value={chipSetDescription}
                onChange={(e) => setChipSetDescription(e.target.value)}
                placeholder="Description de la mallette"
              />
            </div>

            {/* Dénominations */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Dénominations *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDenomination}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {denominations.map((denom, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Valeur</Label>
                        <Input
                          type="number"
                          min="1"
                          value={denom.value}
                          onChange={(e) =>
                            handleDenominationChange(index, 'value', e.target.value)
                          }
                          placeholder="25"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Quantité</Label>
                        <Input
                          type="number"
                          min="1"
                          value={denom.quantity}
                          onChange={(e) =>
                            handleDenominationChange(index, 'quantity', e.target.value)
                          }
                          placeholder="100"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Couleur</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={denom.color}
                            onChange={(e) =>
                              handleDenominationChange(index, 'color', e.target.value)
                            }
                            className="w-14 h-10"
                          />
                          <div
                            className="flex-1 h-10 rounded border"
                            style={{ backgroundColor: denom.color }}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveDenomination(index)}
                      disabled={denominations.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                💡 Valeurs courantes : 25, 100, 500, 1000, 5000
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetCreateForm();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={editingChipSet ? handleUpdateChipSet : handleCreateChipSet}
              disabled={isCreating}
            >
              {isCreating
                ? editingChipSet
                  ? 'Mise à jour...'
                  : 'Création...'
                : editingChipSet
                ? 'Mettre à jour'
                : 'Créer la mallette'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  
    </AdminGuard>
  );
}
