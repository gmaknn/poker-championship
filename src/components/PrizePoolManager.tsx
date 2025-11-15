'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PrizePoolManagerProps {
  tournamentId: string;
  onUpdate?: () => void;
}

interface PrizeAllocation {
  position: number;
  amount: number;
}

export default function PrizePoolManager({ tournamentId, onUpdate }: PrizePoolManagerProps) {
  const [prizePool, setPrizePool] = useState<number>(0);
  const [allocations, setAllocations] = useState<PrizeAllocation[]>([
    { position: 1, amount: 0 },
    { position: 2, amount: 0 },
    { position: 3, amount: 0 },
  ]);
  const [maxPrizePool, setMaxPrizePool] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTournamentData();
  }, [tournamentId]);

  const fetchTournamentData = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      if (response.ok) {
        const data = await response.json();

        // Calculate max prize pool from buy-ins and rebuys
        const totalBuyIns = data._count.tournamentPlayers * data.buyInAmount;

        // Fetch tournament players to count rebuys
        const playersResponse = await fetch(`/api/tournaments/${tournamentId}/players`);
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          const totalRebuys = playersData.players.reduce(
            (sum: number, player: any) => sum + (player.rebuysCount || 0),
            0
          );
          const rebuyAmount = data.buyInAmount; // Assuming rebuy = buy-in
          const totalRebuyMoney = totalRebuys * rebuyAmount;

          setMaxPrizePool(totalBuyIns + totalRebuyMoney);
        } else {
          setMaxPrizePool(totalBuyIns);
        }

        // Set current prize pool
        setPrizePool(data.prizePool || 0);

        // Parse prize distribution
        if (data.prizeDistribution) {
          const distribution = typeof data.prizeDistribution === 'string'
            ? JSON.parse(data.prizeDistribution)
            : data.prizeDistribution;

          const parsedAllocations = Object.entries(distribution).map(([pos, amount]) => ({
            position: parseInt(pos),
            amount: amount as number,
          }));

          if (parsedAllocations.length > 0) {
            setAllocations(parsedAllocations.sort((a, b) => a.position - b.position));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tournament data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrizePoolChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setPrizePool(numValue);
  };

  const handleAllocationChange = (index: number, amount: string) => {
    const numValue = parseFloat(amount) || 0;
    const newAllocations = [...allocations];
    newAllocations[index].amount = numValue;
    setAllocations(newAllocations);
  };

  const addPosition = () => {
    const nextPosition = allocations.length + 1;
    setAllocations([...allocations, { position: nextPosition, amount: 0 }]);
  };

  const removePosition = (index: number) => {
    if (allocations.length > 1) {
      const newAllocations = allocations.filter((_, i) => i !== index);
      // Renumber positions
      newAllocations.forEach((alloc, idx) => {
        alloc.position = idx + 1;
      });
      setAllocations(newAllocations);
    }
  };

  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  const remainingAmount = prizePool - totalAllocated;
  const isValid = totalAllocated <= prizePool && prizePool <= maxPrizePool;

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      // Convert allocations to object format { "1": 50, "2": 30, "3": 20 }
      const distribution = allocations.reduce((obj, alloc) => {
        obj[alloc.position.toString()] = alloc.amount;
        return obj;
      }, {} as Record<string, number>);

      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prizePool,
          prizeDistribution: distribution,
        }),
      });

      if (response.ok) {
        onUpdate?.();
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving prize pool:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Configuration du Prize Pool
          </CardTitle>
          <CardDescription>
            Définissez le montant total du prize pool et sa distribution entre les places payées
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prize Pool Total */}
          <div className="space-y-2">
            <Label htmlFor="prize-pool">Prize Pool Total (€)</Label>
            <Input
              id="prize-pool"
              type="number"
              min="0"
              step="0.01"
              value={prizePool || ''}
              onChange={(e) => handlePrizePoolChange(e.target.value)}
              placeholder="Ex: 150"
            />
            <p className="text-xs text-muted-foreground">
              Maximum disponible: {maxPrizePool.toFixed(2)}€ (basé sur les buy-ins et recaves)
            </p>
          </div>

          {/* Validation Alert */}
          {prizePool > maxPrizePool && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Le prize pool ne peut pas dépasser le montant total collecté ({maxPrizePool.toFixed(2)}€)
              </AlertDescription>
            </Alert>
          )}

          {/* Prize Allocations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Distribution des prix</Label>
              <Button variant="outline" size="sm" onClick={addPosition}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une place
              </Button>
            </div>

            <div className="space-y-3">
              {allocations.map((alloc, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-20">
                    <Label className="text-sm">
                      {alloc.position === 1 ? '1er' : alloc.position === 2 ? '2e' : `${alloc.position}e`}
                    </Label>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={alloc.amount || ''}
                      onChange={(e) => handleAllocationChange(index, e.target.value)}
                      placeholder="Montant en €"
                    />
                  </div>
                  <div className="w-24 text-sm text-muted-foreground">
                    {prizePool > 0 ? `${((alloc.amount / prizePool) * 100).toFixed(1)}%` : '0%'}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePosition(index)}
                    disabled={allocations.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total alloué:</span>
                <span className={totalAllocated > prizePool ? 'text-destructive font-bold' : 'font-semibold'}>
                  {totalAllocated.toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Prize pool:</span>
                <span className="font-semibold">{prizePool.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Reste à allouer:</span>
                <span className={remainingAmount < 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                  {remainingAmount.toFixed(2)}€
                </span>
              </div>
            </div>

            {totalAllocated > prizePool && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Le total alloué dépasse le prize pool de {(totalAllocated - prizePool).toFixed(2)}€
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="w-full"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer la configuration'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
