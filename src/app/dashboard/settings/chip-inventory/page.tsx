'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Plus,
  Trash2,
  Edit,
  Package,
  Coins,
  CheckCircle2,
  XCircle,
  Star,
} from 'lucide-react';

type ChipDenomination = {
  id: string;
  value: number;
  quantity: number;
  color: string;
  colorSecondary?: string | null;
};

type ChipSet = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  denominations: ChipDenomination[];
};

export default function ChipInventoryPage() {
  const [chipSets, setChipSets] = useState<ChipSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChipSet, setEditingChipSet] = useState<ChipSet | null>(null);
  const [isDenominationDialogOpen, setIsDenominationDialogOpen] = useState(false);
  const [selectedChipSetId, setSelectedChipSetId] = useState<string | null>(null);
  const [editingDenomination, setEditingDenomination] = useState<ChipDenomination | null>(null);

  // Form states
  const [chipSetName, setChipSetName] = useState('');
  const [chipSetDescription, setChipSetDescription] = useState('');
  const [chipSetActive, setChipSetActive] = useState(true);

  const [denomValue, setDenomValue] = useState('');
  const [denomQuantity, setDenomQuantity] = useState('');
  const [denomColor, setDenomColor] = useState('#000000');
  const [denomColorSecondary, setDenomColorSecondary] = useState('');

  useEffect(() => {
    fetchChipSets();
  }, []);

  const fetchChipSets = async () => {
    try {
      const response = await fetch('/api/chip-sets');
      if (response.ok) {
        const data = await response.json();
        setChipSets(data);
      }
    } catch (error) {
      console.error('Error fetching chip sets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChipSet = async () => {
    try {
      const response = await fetch('/api/chip-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: chipSetName,
          description: chipSetDescription || undefined,
          isActive: chipSetActive,
        }),
      });

      if (response.ok) {
        await fetchChipSets();
        setIsDialogOpen(false);
        resetChipSetForm();
      }
    } catch (error) {
      console.error('Error creating chip set:', error);
    }
  };

  const handleUpdateChipSet = async () => {
    if (!editingChipSet) return;

    try {
      const response = await fetch(`/api/chip-sets/${editingChipSet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: chipSetName,
          description: chipSetDescription || undefined,
          isActive: chipSetActive,
        }),
      });

      if (response.ok) {
        await fetchChipSets();
        setIsDialogOpen(false);
        setEditingChipSet(null);
        resetChipSetForm();
      }
    } catch (error) {
      console.error('Error updating chip set:', error);
    }
  };

  const handleDeleteChipSet = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mallette ?')) return;

    try {
      const response = await fetch(`/api/chip-sets/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchChipSets();
      }
    } catch (error) {
      console.error('Error deleting chip set:', error);
    }
  };

  const handleAddDenomination = async () => {
    if (!selectedChipSetId) return;

    try {
      const response = await fetch(`/api/chip-sets/${selectedChipSetId}/denominations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: parseInt(denomValue),
          quantity: parseInt(denomQuantity),
          color: denomColor,
          colorSecondary: denomColorSecondary || null,
        }),
      });

      if (response.ok) {
        await fetchChipSets();
        setIsDenominationDialogOpen(false);
        resetDenominationForm();
      }
    } catch (error) {
      console.error('Error adding denomination:', error);
    }
  };

  const handleUpdateDenomination = async () => {
    if (!selectedChipSetId || !editingDenomination) return;

    try {
      const response = await fetch(
        `/api/chip-sets/${selectedChipSetId}/denominations/${editingDenomination.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: parseInt(denomValue),
            quantity: parseInt(denomQuantity),
            color: denomColor,
            colorSecondary: denomColorSecondary || null,
          }),
        }
      );

      if (response.ok) {
        await fetchChipSets();
        setIsDenominationDialogOpen(false);
        resetDenominationForm();
        setEditingDenomination(null);
      }
    } catch (error) {
      console.error('Error updating denomination:', error);
    }
  };

  const handleDeleteDenomination = async (chipSetId: string, denominationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dénomination ?')) return;

    try {
      const response = await fetch(
        `/api/chip-sets/${chipSetId}/denominations/${denominationId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await fetchChipSets();
      }
    } catch (error) {
      console.error('Error deleting denomination:', error);
    }
  };

  const openEditDialog = (chipSet: ChipSet) => {
    setEditingChipSet(chipSet);
    setChipSetName(chipSet.name);
    setChipSetDescription(chipSet.description || '');
    setChipSetActive(chipSet.isActive);
    setIsDialogOpen(true);
  };

  const openDenominationDialog = (chipSetId: string) => {
    setSelectedChipSetId(chipSetId);
    setEditingDenomination(null);
    resetDenominationForm();
    setIsDenominationDialogOpen(true);
  };

  const openEditDenominationDialog = (chipSetId: string, denomination: ChipDenomination) => {
    setSelectedChipSetId(chipSetId);
    setEditingDenomination(denomination);
    setDenomValue(denomination.value.toString());
    setDenomQuantity(denomination.quantity.toString());
    setDenomColor(denomination.color);
    setDenomColorSecondary(denomination.colorSecondary || '');
    setIsDenominationDialogOpen(true);
  };

  const handleToggleDefault = async (chipSetId: string) => {
    try {
      const response = await fetch(`/api/chip-sets/${chipSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: true,
        }),
      });

      if (response.ok) {
        await fetchChipSets();
      }
    } catch (error) {
      console.error('Error setting default chip set:', error);
    }
  };

  const resetChipSetForm = () => {
    setChipSetName('');
    setChipSetDescription('');
    setChipSetActive(true);
  };

  const resetDenominationForm = () => {
    setDenomValue('');
    setDenomQuantity('');
    setDenomColor('#000000');
    setDenomColorSecondary('');
  };

  // Calculate totals by denomination value
  const getTotalsByDenomination = () => {
    const totals: { [key: number]: number } = {};

    chipSets
      .filter((cs) => cs.isActive)
      .forEach((chipSet) => {
        chipSet.denominations.forEach((denom) => {
          totals[denom.value] = (totals[denom.value] || 0) + denom.quantity;
        });
      });

    return Object.entries(totals).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventaire de Jetons</h1>
          <p className="text-muted-foreground">
            Gérez vos mallettes de jetons pour les tournois
          </p>
        </div>
        <Button
          onClick={() => {
            resetChipSetForm();
            setEditingChipSet(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Mallette
        </Button>
      </div>

      {/* Summary Card */}
      {chipSets.filter((cs) => cs.isActive).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total des jetons disponibles</CardTitle>
            <CardDescription>
              Somme de toutes les mallettes actives
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {getTotalsByDenomination().map(([value, quantity]) => (
                <Badge key={value} variant="outline" className="text-base px-4 py-2">
                  <Coins className="h-4 w-4 mr-2" />
                  {value} × {quantity}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chip Sets List */}
      {chipSets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune mallette</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre première mallette de jetons
            </p>
            <Button
              onClick={() => {
                resetChipSetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer une mallette
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {chipSets.map((chipSet) => (
            <Card key={chipSet.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle>{chipSet.name}</CardTitle>
                      {chipSet.isActive ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {chipSet.description && (
                      <CardDescription>{chipSet.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!chipSet.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleDefault(chipSet.id)}
                        title="Définir comme mallette par défaut"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(chipSet)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteChipSet(chipSet.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Denominations */}
                <div className="space-y-2">
                  {chipSet.denominations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune dénomination
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {chipSet.denominations.map((denom) => (
                        <div
                          key={denom.id}
                          className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full border-2"
                              style={{
                                backgroundColor: denom.color,
                                borderColor: denom.colorSecondary || denom.color,
                              }}
                            />
                            <div>
                              <div className="font-semibold">{denom.value}</div>
                              <div className="text-sm text-muted-foreground">
                                {denom.quantity} jetons
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                openEditDenominationDialog(chipSet.id, denom)
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                handleDeleteDenomination(chipSet.id, denom.id)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Denomination Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openDenominationDialog(chipSet.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une dénomination
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit ChipSet Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingChipSet ? 'Modifier la mallette' : 'Nouvelle mallette'}
            </DialogTitle>
            <DialogDescription>
              {editingChipSet
                ? 'Modifiez les informations de la mallette'
                : 'Créez une nouvelle mallette de jetons'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                value={chipSetName}
                onChange={(e) => setChipSetName(e.target.value)}
                placeholder="Mallette Principale"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optionnel)</label>
              <Input
                value={chipSetDescription}
                onChange={(e) => setChipSetDescription(e.target.value)}
                placeholder="Description de la mallette"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={chipSetActive}
                onChange={(e) => setChipSetActive(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Mallette active
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={editingChipSet ? handleUpdateChipSet : handleCreateChipSet}
              disabled={!chipSetName}
            >
              {editingChipSet ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Denomination Dialog */}
      <Dialog
        open={isDenominationDialogOpen}
        onOpenChange={(open) => {
          setIsDenominationDialogOpen(open);
          if (!open) {
            setEditingDenomination(null);
            resetDenominationForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDenomination ? 'Modifier la dénomination' : 'Ajouter une dénomination'}
            </DialogTitle>
            <DialogDescription>
              {editingDenomination
                ? 'Modifiez les informations du jeton'
                : 'Ajoutez un nouveau type de jeton à la mallette'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valeur</label>
              <Input
                type="number"
                value={denomValue}
                onChange={(e) => setDenomValue(e.target.value)}
                placeholder="25, 100, 500..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantité</label>
              <Input
                type="number"
                value={denomQuantity}
                onChange={(e) => setDenomQuantity(e.target.value)}
                placeholder="100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Couleur principale</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={denomColor}
                  onChange={(e) => setDenomColor(e.target.value)}
                  className="w-20"
                />
                <Input
                  type="text"
                  value={denomColor}
                  onChange={(e) => setDenomColor(e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Couleur secondaire (optionnel)</label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={denomColorSecondary || '#ffffff'}
                  onChange={(e) => setDenomColorSecondary(e.target.value)}
                  className="w-20"
                />
                <Input
                  type="text"
                  value={denomColorSecondary}
                  onChange={(e) => setDenomColorSecondary(e.target.value)}
                  placeholder="#ffffff (optionnel)"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDenominationDialogOpen(false);
                setEditingDenomination(null);
                resetDenominationForm();
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={editingDenomination ? handleUpdateDenomination : handleAddDenomination}
              disabled={!denomValue || !denomQuantity}
            >
              {editingDenomination ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
