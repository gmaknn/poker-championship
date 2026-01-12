'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Check, AlertCircle, ExternalLink, Save } from 'lucide-react';
import Link from 'next/link';

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
    colorSecondary?: string | null;
  }[];
};

type Props = {
  tournamentId: string;
  startingChips: number;
  totalPlayers: number;
  onUpdate?: () => void;
};

export default function ChipSetSelector({
  tournamentId,
  startingChips,
  totalPlayers,
  onUpdate,
}: Props) {
  const [chipSets, setChipSets] = useState<ChipSet[]>([]);
  const [selectedChipSets, setSelectedChipSets] = useState<string[]>([]);
  const [currentConfig, setCurrentConfig] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasBlindStructure, setHasBlindStructure] = useState(false);

  useEffect(() => {
    fetchChipSets();
    fetchCurrentConfig();
    checkBlindStructure();
  }, [tournamentId]);

  const fetchChipSets = async () => {
    try {
      const response = await fetch('/api/chip-sets');
      if (response.ok) {
        const data = await response.json();
        setChipSets(data.filter((cs: ChipSet) => cs.isActive));
      }
    } catch (error) {
      console.error('Error fetching chip sets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentConfig = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chip-config`);
      if (response.ok) {
        const data = await response.json();
        setCurrentConfig(data);
        if (data?.chipSetsUsed) {
          setSelectedChipSets(data.chipSetsUsed);
        }
      }
    } catch (error) {
      console.error('Error fetching current config:', error);
    }
  };

  const checkBlindStructure = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/blinds`);
      if (response.ok) {
        const data = await response.json();
        setHasBlindStructure(data && data.length > 0);
      }
    } catch (error) {
      console.error('Error checking blind structure:', error);
    }
  };

  const toggleChipSet = (chipSetId: string) => {
    setSelectedChipSets((prev) =>
      prev.includes(chipSetId)
        ? prev.filter((id) => id !== chipSetId)
        : [...prev, chipSetId]
    );
  };

  const handleSave = async () => {
    if (selectedChipSets.length === 0) {
      alert('Veuillez sélectionner au moins une mallette');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chip-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chipSetsUsed: selectedChipSets,
          distribution: {}, // Sera calculé plus tard
          playersCount: totalPlayers,
          stackSize: startingChips,
          rebuysExpected: 0,
        }),
      });

      if (response.ok) {
        await fetchCurrentConfig();
        onUpdate?.();
        alert('Mallettes sauvegardées avec succès ! La distribution sera calculée après avoir défini la structure des blinds.');
      } else {
        alert('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  const totalAvailable = selectedChipSets.reduce((total, chipSetId) => {
    const chipSet = chipSets.find((cs) => cs.id === chipSetId);
    if (!chipSet) return total;
    return (
      total +
      chipSet.denominations.reduce(
        (sum, d) => sum + d.value * d.quantity,
        0
      )
    );
  }, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sélection des mallettes</CardTitle>
              <CardDescription>
                Choisissez une ou plusieurs mallettes pour ce tournoi
              </CardDescription>
            </div>
            <Link href="/dashboard/chip-assistant">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Gérer les mallettes
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {chipSets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-semibold mb-2">
                Aucune mallette disponible
              </p>
              <p className="text-sm mb-4">
                Créez votre première mallette dans l'assistant jetons
              </p>
              <Link href="/dashboard/chip-assistant">
                <Button>
                  <Package className="mr-2 h-4 w-4" />
                  Créer une mallette
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {chipSets.map((chipSet) => {
                const isSelected = selectedChipSets.includes(chipSet.id);
                const totalValue = chipSet.denominations.reduce(
                  (sum, d) => sum + d.value * d.quantity,
                  0
                );

                return (
                  <div
                    key={chipSet.id}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all
                      ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
                    `}
                    onClick={() => toggleChipSet(chipSet.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleChipSet(chipSet.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">
                            {chipSet.name}
                          </h3>
                          <Badge variant="outline">
                            {chipSet.denominations.reduce(
                              (sum, d) => sum + d.quantity,
                              0
                            )}{' '}
                            jetons
                          </Badge>
                        </div>
                        {chipSet.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {chipSet.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {chipSet.denominations
                            .sort((a, b) => a.value - b.value)
                            .map((denom) => (
                              <div
                                key={denom.id}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs border"
                              >
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: denom.color }}
                                />
                                <span className="font-medium">{denom.value}</span>
                                <span className="text-muted-foreground">
                                  x{denom.quantity}
                                </span>
                              </div>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Valeur totale : {totalValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {selectedChipSets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              Mallettes sélectionnées ({selectedChipSets.length})
            </CardTitle>
            <CardDescription>
              Total de jetons disponibles par coupure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {selectedChipSets.map((chipSetId) => {
                const chipSet = chipSets.find((cs) => cs.id === chipSetId);
                if (!chipSet) return null;

                return (
                  <div key={chipSetId} className="p-3 border rounded-lg">
                    <h4 className="font-semibold mb-2">{chipSet.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {chipSet.denominations
                        .sort((a, b) => a.value - b.value)
                        .map((denom) => (
                          <div
                            key={denom.id}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs border"
                          >
                            <div
                              className="w-3 h-3 rounded-full border"
                              style={{ backgroundColor: denom.color }}
                            />
                            <span className="font-medium">{denom.value}</span>
                            <span className="text-muted-foreground">
                              x{denom.quantity}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {!hasBlindStructure && (
              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      <strong>Prochaine étape :</strong> Après avoir sauvegardé les mallettes,
                      définissez la structure des blinds. La distribution optimale sera
                      calculée automatiquement en fonction de cette structure.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {hasBlindStructure && currentConfig && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      <strong>Structure définie !</strong> La distribution sera calculée
                      automatiquement en fonction des blinds et du nombre de joueurs inscrits.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder les mallettes sélectionnées'}
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedChipSets.length === 0 && chipSets.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Sélectionnez au moins une mallette pour continuer</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
