'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Plus, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
  totalPrizePool: number;
  payoutCount: number;
  percents: number[];
  breakdown: { rank: number; percent: number; amount: number }[];
  updatedAt: string | null;
}

export default function PrizePoolManager({ tournamentId, onUpdate }: PrizePoolManagerProps) {
  const [prizePoolData, setPrizePoolData] = useState<PrizePoolData | null>(null);
  const [payoutCount, setPayoutCount] = useState(3);
  const [percents, setPercents] = useState<number[]>([50, 30, 20]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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
        if (data.payoutCount > 0 && data.percents.length > 0) {
          setPayoutCount(data.payoutCount);
          setPercents(data.percents);
        }
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

  const handlePercentChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newPercents = [...percents];
    newPercents[index] = numValue;
    setPercents(newPercents);
    setSuccess(false);
  };

  const addPosition = () => {
    setPayoutCount(payoutCount + 1);
    setPercents([...percents, 0]);
    setSuccess(false);
  };

  const removePosition = (index: number) => {
    if (payoutCount > 1) {
      setPayoutCount(payoutCount - 1);
      setPercents(percents.filter((_, i) => i !== index));
      setSuccess(false);
    }
  };

  const totalPercent = percents.reduce((sum, p) => sum + p, 0);
  const isValidSum = Math.abs(totalPercent - 100) < 0.01;
  const allPositive = percents.every(p => p > 0);
  const isValid = isValidSum && allPositive && percents.length === payoutCount;

  const handleSave = async () => {
    if (!isValid) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/prize-pool`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutCount,
          percents,
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

  // Calculate preview amounts
  const previewAmounts = percents.map(p =>
    prizePoolData ? Math.round((prizePoolData.totalPrizePool * p / 100) * 100) / 100 : 0
  );

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
            Configurez la distribution en pourcentages. Le prize pool est calculé automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prize Pool Total - Read Only */}
          {prizePoolData && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Prize Pool Total</span>
                <span className="text-2xl font-bold text-primary">
                  {prizePoolData.totalPrizePool.toFixed(2)}€
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
              {percents.map((percent, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium">
                    {index + 1 === 1 ? '1er' : index + 1 === 2 ? '2e' : `${index + 1}e`}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={percent || ''}
                      onChange={(e) => handlePercentChange(index, e.target.value)}
                      placeholder="0"
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <div className="w-24 text-right font-mono text-sm">
                    {previewAmounts[index].toFixed(2)}€
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
                <span>Total des pourcentages:</span>
                <span className={!isValidSum ? 'text-destructive font-bold' : 'font-semibold text-green-600'}>
                  {totalPercent.toFixed(1)}%
                  {isValidSum && <CheckCircle2 className="inline h-4 w-4 ml-1" />}
                </span>
              </div>
            </div>

            {!isValidSum && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  La somme des pourcentages doit être égale à 100% (actuellement {totalPercent.toFixed(1)}%)
                </AlertDescription>
              </Alert>
            )}

            {!allPositive && isValidSum && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Chaque pourcentage doit être supérieur à 0
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
          {isValid && prizePoolData && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Rang</th>
                    <th className="px-4 py-2 text-right">%</th>
                    <th className="px-4 py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {percents.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2 font-medium">
                        {i + 1 === 1 ? '1er' : i + 1 === 2 ? '2e' : `${i + 1}e`}
                      </td>
                      <td className="px-4 py-2 text-right">{p}%</td>
                      <td className="px-4 py-2 text-right font-mono font-bold">
                        {previewAmounts[i].toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer la configuration'
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
