'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, AlertCircle, Info } from 'lucide-react';
import {
  RecavePenaltyTier,
  generatePenaltyPreview,
  validateTierConfiguration,
} from '@/lib/scoring';

interface RecavePenaltyTiersEditorProps {
  freeRebuysCount: number;
  tiers: RecavePenaltyTier[];
  onFreeRebuysChange: (count: number) => void;
  onTiersChange: (tiers: RecavePenaltyTier[]) => void;
}

export default function RecavePenaltyTiersEditor({
  freeRebuysCount,
  tiers,
  onFreeRebuysChange,
  onTiersChange,
}: RecavePenaltyTiersEditorProps) {
  const [errors, setErrors] = useState<string[]>([]);

  // Valider à chaque changement
  useEffect(() => {
    const validationErrors = validateTierConfiguration(freeRebuysCount, tiers);
    setErrors(validationErrors);
  }, [freeRebuysCount, tiers]);

  // Générer l'aperçu des malus
  const preview = generatePenaltyPreview(
    { freeRebuysCount, tiers },
    Math.max(7, (tiers[tiers.length - 1]?.fromRecaves ?? 5) + 2)
  );

  const handleAddTier = () => {
    // Trouver le prochain fromRecaves logique
    const maxFromRecaves = Math.max(
      freeRebuysCount,
      ...tiers.map((t) => t.fromRecaves)
    );
    const nextFromRecaves = maxFromRecaves + 1;

    // Trouver le dernier malus pour suggestion
    const lastPenalty = tiers.length > 0
      ? tiers[tiers.length - 1].penaltyPoints
      : -50;
    const suggestedPenalty = lastPenalty - 50;

    onTiersChange([
      ...tiers,
      { fromRecaves: nextFromRecaves, penaltyPoints: suggestedPenalty },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) return;
    const newTiers = tiers.filter((_, i) => i !== index);
    onTiersChange(newTiers);
  };

  const handleTierChange = (
    index: number,
    field: keyof RecavePenaltyTier,
    value: number
  ) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };

    // Trier par fromRecaves pour garder l'ordre logique
    newTiers.sort((a, b) => a.fromRecaves - b.fromRecaves);

    onTiersChange(newTiers);
  };

  return (
    <div className="space-y-6">
      {/* Recaves gratuites */}
      <div className="space-y-2">
        <Label htmlFor="freeRebuysCount">Nombre de recaves gratuites</Label>
        <Input
          id="freeRebuysCount"
          type="number"
          min={0}
          max={10}
          value={freeRebuysCount}
          onChange={(e) => onFreeRebuysChange(parseInt(e.target.value) || 0)}
          className="w-24"
        />
        <p className="text-xs text-muted-foreground">
          Les joueurs peuvent faire jusqu'à {freeRebuysCount} recave(s) sans malus
        </p>
      </div>

      {/* Paliers de malus */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Paliers de malus</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTier}
          >
            <Plus className="mr-1 h-4 w-4" />
            Ajouter un palier
          </Button>
        </div>

        {tiers.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="py-4 text-center text-sm text-muted-foreground">
              Aucun palier de malus configuré. Les recaves au-delà de{' '}
              {freeRebuysCount} seront sans pénalité.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tiers.map((tier, index) => (
              <Card key={index} className="bg-muted/20">
                <CardContent className="py-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Dès</Label>
                      <Input
                        type="number"
                        min={1}
                        value={tier.fromRecaves}
                        onChange={(e) =>
                          handleTierChange(
                            index,
                            'fromRecaves',
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        recave(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">Malus:</Label>
                      <Input
                        type="number"
                        max={0}
                        value={tier.penaltyPoints}
                        onChange={(e) =>
                          handleTierChange(
                            index,
                            'penaltyPoints',
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">pts</span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTier(index)}
                      disabled={tiers.length <= 1}
                      className="ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Erreurs de validation */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              {errors.map((error, i) => (
                <p key={i} className="text-sm">
                  {error}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aperçu */}
      <div className="bg-blue-500/10 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg border border-blue-500/20">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold mb-2">Aperçu du système de malus</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-sm">
              {preview.map((p) => (
                <div
                  key={p.rebuys}
                  className={`px-2 py-1 rounded text-center ${
                    p.penalty < 0
                      ? 'bg-red-500/20 text-red-700 dark:text-red-300'
                      : 'bg-green-500/20 text-green-700 dark:text-green-300'
                  }`}
                >
                  <div className="font-medium">{p.rebuys} rec.</div>
                  <div className="text-xs">{p.penalty} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
