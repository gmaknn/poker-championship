'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Plus, Trash2, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PrizePoolManagerProps {
  tournamentId: string;
  onUpdate?: () => void;
}

interface PrizePoolData {
  tournamentId: string;
  tournamentName: string;
  buyInAmount: number;
  lightRebuyAmount: number;
  paidPlayersCount: number;
  totalBuyIns: number;
  totalRebuys: number;
  totalLightRebuys: number;
  calculatedPrizePool: number;
  adjustment: number;
  adjustmentReason: string | null;
  adjustedPrizePool: number;
  totalPrizePool: number;
  payoutCount: number;
  amounts: number[];
  totalAllocated: number;
  remaining: number;
  breakdown: { rank: number; amount: number }[];
  updatedAt: string | null;
}

export default function PrizePoolManager({ tournamentId, onUpdate }: PrizePoolManagerProps) {
  const [prizePoolData, setPrizePoolData] = useState<PrizePoolData | null>(null);
  const [payoutCount, setPayoutCount] = useState(3);
  const [amounts, setAmounts] = useState<number[]>([0, 0, 0]);
  const [adjustment, setAdjustment] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [adjustmentSuccess, setAdjustmentSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrizePoolData();
  }, [tournamentId]);

  const fetchPrizePoolData = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/prize-pool`);

      if (response.status === 401) {
        setAuthError('Vous devez vous connecter pour accéder à cette fonctionnalité.');
        return;
      }

      if (response.status === 403) {
        setAuthError('Vous n\'avez pas les droits pour gérer le prize pool de ce tournoi.');
        return;
      }

      if (response.ok) {
        const data: PrizePoolData = await response.json();
        setPrizePoolData(data);

        // Initialize form from saved data or defaults
        if (data.payoutCount > 0 && data.amounts.length > 0) {
          setPayoutCount(data.payoutCount);
          setAmounts(data.amounts);
        } else {
          // Default: 3 places with 0€ each
          setPayoutCount(3);
          setAmounts([0, 0, 0]);
        }
        // Initialize adjustment fields
        setAdjustment(data.adjustment || 0);
        setAdjustmentReason(data.adjustmentReason || '');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors du chargement');
      }
    } catch (err) {
      console.error('Error fetching prize pool:', err);
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newAmounts = [...amounts];
    newAmounts[index] = numValue;
    setAmounts(newAmounts);
    setSuccess(false);
  };

  const addPosition = () => {
    setPayoutCount(payoutCount + 1);
    setAmounts([...amounts, 0]);
    setSuccess(false);
  };

  const removePosition = (index: number) => {
    if (payoutCount > 1) {
      setPayoutCount(payoutCount - 1);
      setAmounts(amounts.filter((_, i) => i !== index));
      setSuccess(false);
    }
  };

  // Calculate effective prize pool including local adjustment changes
  const effectivePrizePool = prizePoolData
    ? prizePoolData.calculatedPrizePool + adjustment
    : 0;

  // Calculate totals
  const totalAllocated = amounts.reduce((sum, a) => sum + a, 0);
  const remaining = effectivePrizePool - totalAllocated;
  const isOverBudget = totalAllocated > effectivePrizePool + 0.01;
  const hasUnallocated = remaining > 0.01;
  const isValid = !isOverBudget && amounts.length === payoutCount;

  const handleSave = async () => {
    if (isOverBudget) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/prize-pool`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutCount,
          amounts,
          totalPrizePool: effectivePrizePool,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        await fetchPrizePoolData(); // Refresh data
        onUpdate?.();
      } else {
        const errorData = await response.json();
        if (errorData.details) {
          setError(errorData.details.map((d: { message: string }) => d.message).join(', '));
        } else {
          setError(errorData.error || 'Erreur lors de la sauvegarde');
        }
      }
    } catch (err) {
      console.error('Error saving prize pool:', err);
      setError('Erreur de connexion');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAdjustment = async () => {
    setIsSavingAdjustment(true);
    setError(null);
    setAdjustmentSuccess(false);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/prize-pool`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment,
          reason: adjustmentReason || undefined,
        }),
      });

      if (response.ok) {
        setAdjustmentSuccess(true);
        await fetchPrizePoolData(); // Refresh data
        onUpdate?.();
      } else {
        const errorData = await response.json();
        if (errorData.details) {
          setError(errorData.details.map((d: { message: string }) => d.message).join(', '));
        } else {
          setError(errorData.error || 'Erreur lors de la sauvegarde de l\'ajustement');
        }
      }
    } catch (err) {
      console.error('Error saving adjustment:', err);
      setError('Erreur de connexion');
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  if (authError) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
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
            Saisissez les montants en euros pour chaque place payée.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prize Pool Total - Read Only */}
          {prizePoolData && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Prize Pool Total</span>
                <span className="text-2xl font-bold text-primary">
                  {effectivePrizePool.toFixed(2)}€
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Buy-ins ({prizePoolData.paidPlayersCount} joueurs × {prizePoolData.buyInAmount}€)</span>
                  <span>{prizePoolData.totalBuyIns.toFixed(2)}€</span>
                </div>
                {prizePoolData.totalRebuys > 0 && (
                  <div className="flex justify-between">
                    <span>Recaves</span>
                    <span>{prizePoolData.totalRebuys.toFixed(2)}€</span>
                  </div>
                )}
                {prizePoolData.totalLightRebuys > 0 && (
                  <div className="flex justify-between">
                    <span>Recaves allégées</span>
                    <span>{prizePoolData.totalLightRebuys.toFixed(2)}€</span>
                  </div>
                )}
                {adjustment !== 0 && (
                  <div className="flex justify-between">
                    <span>Ajustement</span>
                    <span className={adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                      {adjustment > 0 ? '+' : ''}{adjustment.toFixed(2)}€
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ajustement manuel du Prize Pool */}
          {prizePoolData && (
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <Label className="text-sm font-medium">Ajustement manuel du Prize Pool</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajoutez ou retirez un montant au prize pool calculé (ex: sponsor, erreur de caisse...)
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustment" className="text-xs">Montant (€)</Label>
                  <Input
                    id="adjustment"
                    type="number"
                    step="0.01"
                    value={adjustment}
                    onChange={(e) => {
                      setAdjustment(parseFloat(e.target.value) || 0);
                      setAdjustmentSuccess(false);
                    }}
                    placeholder="0"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Positif = ajout, Négatif = retrait
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adjustmentReason" className="text-xs">Motif (optionnel)</Label>
                  <Input
                    id="adjustmentReason"
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => {
                      setAdjustmentReason(e.target.value);
                      setAdjustmentSuccess(false);
                    }}
                    placeholder="Ex: Sponsor, erreur de caisse..."
                    maxLength={500}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveAdjustment}
                  disabled={isSavingAdjustment}
                >
                  {isSavingAdjustment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    'Enregistrer l\'ajustement'
                  )}
                </Button>
                {adjustmentSuccess && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Ajustement enregistré
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Payout Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Distribution des prix ({payoutCount} place{payoutCount > 1 ? 's' : ''} payée{payoutCount > 1 ? 's' : ''})</Label>
              <Button variant="outline" size="sm" onClick={addPosition}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {amounts.map((amount, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium">
                    {index + 1 === 1 ? '1er' : index + 1 === 2 ? '2e' : `${index + 1}e`}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount || ''}
                      onChange={(e) => handleAmountChange(index, e.target.value)}
                      placeholder="0"
                      className="w-28 font-mono"
                    />
                    <span className="text-sm text-muted-foreground">€</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePosition(index)}
                    disabled={payoutCount === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Validation Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total distribué :</span>
                <span className={isOverBudget ? 'text-destructive font-bold' : 'font-semibold'}>
                  {totalAllocated.toFixed(2)}€ / {effectivePrizePool.toFixed(2)}€
                </span>
              </div>
              {!isOverBudget && (
                <div className="flex justify-between text-sm">
                  <span>Reste à distribuer :</span>
                  <span className={hasUnallocated ? 'text-orange-500 font-semibold' : 'text-green-600 font-semibold'}>
                    {remaining.toFixed(2)}€
                    {!hasUnallocated && <CheckCircle2 className="inline h-4 w-4 ml-1" />}
                  </span>
                </div>
              )}
            </div>

            {isOverBudget && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Le total des allocations ({totalAllocated.toFixed(2)}€) dépasse le prize pool disponible ({effectivePrizePool.toFixed(2)}€)
                </AlertDescription>
              </Alert>
            )}

            {hasUnallocated && !isOverBudget && (
              <Alert className="border-orange-400 bg-orange-50 dark:bg-orange-950">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-orange-700 dark:text-orange-300">
                  Il reste {remaining.toFixed(2)}€ non distribués. Vous pouvez enregistrer quand même.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Configuration enregistrée avec succès
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Preview Table */}
          {prizePoolData && amounts.some(a => a > 0) && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Rang</th>
                    <th className="px-4 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {amounts.map((amount, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {i + 1 === 1 ? '1er' : i + 1 === 2 ? '2e' : `${i + 1}e`}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-bold">
                        {amount.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-muted/50">
                    <td className="px-4 py-2 font-semibold">Total</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">
                      {totalAllocated.toFixed(2)}€
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isOverBudget || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer la distribution'
            )}
          </Button>

          {prizePoolData?.updatedAt && (
            <p className="text-xs text-center text-muted-foreground">
              Dernière mise à jour: {new Date(prizePoolData.updatedAt).toLocaleString('fr-FR')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
