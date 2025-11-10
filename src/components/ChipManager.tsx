'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, RotateCcw, Save } from 'lucide-react';

type ChipDenomination = {
  id?: string;
  value: number;
  color: string;
  colorSecondary?: string | null;
  quantity?: number | null;
  order: number;
  isDefault?: boolean;
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
};

export default function ChipManager({ tournamentId, onUpdate }: Props) {
  const [chips, setChips] = useState<ChipDenomination[]>([]);
  const [isDefault, setIsDefault] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChips();
  }, [tournamentId]);

  const fetchChips = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chips`);
      if (response.ok) {
        const data = await response.json();
        setChips(data.chips);
        setIsDefault(data.isDefault);
      } else {
        setError('Erreur lors du chargement des jetons');
      }
    } catch (error) {
      console.error('Error fetching chips:', error);
      setError('Erreur lors du chargement des jetons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chips }),
      });

      if (response.ok) {
        await fetchChips();
        onUpdate?.();
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving chips:', error);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Réinitialiser aux jetons par défaut ?')) return;

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chips`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchChips();
        onUpdate?.();
      } else {
        setError('Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Error resetting chips:', error);
      setError('Erreur lors de la réinitialisation');
    }
  };

  const updateChip = (index: number, field: keyof ChipDenomination, value: any) => {
    const updated = [...chips];
    updated[index] = { ...updated[index], [field]: value };
    setChips(updated);
  };

  const addChip = () => {
    setChips([
      ...chips,
      {
        value: 0,
        color: '#FFFFFF',
        order: chips.length + 1,
      },
    ]);
  };

  const removeChip = (index: number) => {
    setChips(chips.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configuration des Jetons</CardTitle>
            {isDefault && (
              <p className="text-sm text-muted-foreground mt-1">
                Configuration par défaut du championnat
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                title="Réinitialiser aux jetons par défaut"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Réinitialiser
              </Button>
            )}
            <Button size="sm" onClick={addChip}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {chips.map((chip, index) => (
            <div key={index} className="flex items-end gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor={`value-${index}`}>Valeur</Label>
                  <Input
                    id={`value-${index}`}
                    type="number"
                    value={chip.value}
                    onChange={(e) => updateChip(index, 'value', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor={`color-${index}`}>Couleur</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`color-${index}`}
                      type="color"
                      value={chip.color}
                      onChange={(e) => updateChip(index, 'color', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={chip.color}
                      onChange={(e) => updateChip(index, 'color', e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor={`quantity-${index}`}>Quantité (opt.)</Label>
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    value={chip.quantity || ''}
                    onChange={(e) => updateChip(index, 'quantity', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Illimité"
                  />
                </div>
              </div>
              <div
                className="w-16 h-16 rounded-lg border-2 border-slate-300 flex items-center justify-center font-bold shadow-sm"
                style={{ backgroundColor: chip.color, color: chip.value > 500 ? '#000000' : '#FFFFFF' }}
                title={`Aperçu du jeton ${chip.value}`}
              >
                {chip.value}
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeChip(index)}
                disabled={chips.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || chips.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
