'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Zap,
  Target,
  Timer,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Wand2,
} from 'lucide-react';

type BlindLevel = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
};

type BlindStats = {
  totalLevels: number;
  totalDuration: number;
  startingBB: number;
  endingBB: number;
  startingStackBB: number;
  anteStartLevel: number;
};

type Props = {
  tournamentId: string;
  startingChips: number;
  onSave?: () => void;
};

export default function BlindStructureEditor({
  tournamentId,
  startingChips,
  onSave,
}: Props) {
  const [levels, setLevels] = useState<BlindLevel[]>([]);
  const [stats, setStats] = useState<BlindStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBlindLevels();
  }, [tournamentId]);

  const fetchBlindLevels = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/blinds`);
      if (response.ok) {
        const data = await response.json();
        setLevels(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error fetching blind levels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (blindLevels: BlindLevel[]) => {
    if (blindLevels.length === 0) {
      setStats(null);
      return;
    }

    const totalDuration = blindLevels.reduce(
      (sum, level) => sum + level.duration,
      0
    );
    const firstLevel = blindLevels[0];
    const lastLevel = blindLevels[blindLevels.length - 1];

    setStats({
      totalLevels: blindLevels.length,
      totalDuration,
      startingBB: firstLevel.bigBlind,
      endingBB: lastLevel.bigBlind,
      startingStackBB: Math.floor(startingChips / firstLevel.bigBlind),
      anteStartLevel: blindLevels.findIndex((l) => l.ante > 0) + 1 || 0,
    });
  };

  const handleGenerate = async (preset?: 'turbo' | 'standard' | 'deep') => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/blinds/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preset ? { preset } : {}),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLevels(data.levels);
        setStats(data.stats);
        setIsGenerateDialogOpen(false);
      } else {
        setError('Erreur lors de la génération');
      }
    } catch (error) {
      setError('Erreur lors de la génération');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/blinds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels }),
      });

      if (response.ok) {
        onSave?.();
      } else {
        setError('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLevel = () => {
    const lastLevel = levels[levels.length - 1];
    const newLevel: BlindLevel = {
      level: levels.length + 1,
      smallBlind: lastLevel ? Math.round(lastLevel.smallBlind * 1.5) : 25,
      bigBlind: lastLevel ? Math.round(lastLevel.bigBlind * 1.5) : 50,
      ante: lastLevel ? lastLevel.ante : 0,
      duration: lastLevel ? lastLevel.duration : 12,
    };
    const newLevels = [...levels, newLevel];
    setLevels(newLevels);
    calculateStats(newLevels);
  };

  const handleRemoveLevel = (levelIndex: number) => {
    const newLevels = levels
      .filter((_, index) => index !== levelIndex)
      .map((level, index) => ({ ...level, level: index + 1 }));
    setLevels(newLevels);
    calculateStats(newLevels);
  };

  const handleLevelChange = (
    index: number,
    field: keyof BlindLevel,
    value: number
  ) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], [field]: value };
    setLevels(newLevels);
    calculateStats(newLevels);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins > 0 ? mins : ''}` : `${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Structure des blinds</h2>
          {stats && (
            <p className="text-sm text-muted-foreground">
              {stats.totalLevels} niveaux • {formatTime(stats.totalDuration)} •{' '}
              Stack: {stats.startingStackBB} BB
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsGenerateDialogOpen(true)}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Générer
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || levels.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          {error}
        </div>
      )}

      {/* Statistiques */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Durée totale
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(stats.totalDuration)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stack départ</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.startingStackBB} BB</div>
              <p className="text-xs text-muted-foreground">
                {startingChips} jetons
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Big Blind</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.startingBB} → {stats.endingBB}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Antes (dès)
              </CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.anteStartLevel > 0
                  ? `Niveau ${stats.anteStartLevel}`
                  : 'Aucun'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table des niveaux */}
      {levels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Timer className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Aucune structure de blinds
            </h3>
            <p className="text-muted-foreground mb-4">
              Générez automatiquement une structure ou ajoutez des niveaux
              manuellement
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Générer automatiquement
              </Button>
              <Button variant="outline" onClick={handleAddLevel}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un niveau
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_80px] gap-4 px-4 py-2 font-medium text-sm text-muted-foreground">
            <div>Niveau</div>
            <div>Small Blind</div>
            <div>Big Blind</div>
            <div>Ante</div>
            <div>Durée</div>
            <div></div>
          </div>

          {levels.map((level, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-[60px_1fr_1fr_1fr_1fr_80px] gap-4 items-center">
                  <Badge variant="outline" className="justify-center">
                    {level.level}
                  </Badge>
                  <Input
                    type="number"
                    value={level.smallBlind}
                    onChange={(e) =>
                      handleLevelChange(
                        index,
                        'smallBlind',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                  <Input
                    type="number"
                    value={level.bigBlind}
                    onChange={(e) =>
                      handleLevelChange(
                        index,
                        'bigBlind',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                  <Input
                    type="number"
                    value={level.ante}
                    onChange={(e) =>
                      handleLevelChange(
                        index,
                        'ante',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={level.duration}
                      onChange={(e) =>
                        handleLevelChange(
                          index,
                          'duration',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLevel(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={handleAddLevel} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un niveau
          </Button>
        </div>
      )}

      {/* Dialog de génération */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer une structure de blinds</DialogTitle>
            <DialogDescription>
              Choisissez un preset ou générez une structure basée sur les
              paramètres du tournoi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button
              variant="outline"
              className="w-full h-auto p-4 flex-col items-start"
              onClick={() => handleGenerate('turbo')}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5" />
                <span className="font-semibold">Turbo (2h)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Niveaux de 8 minutes, antes dès le niveau 4
              </p>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto p-4 flex-col items-start"
              onClick={() => handleGenerate('standard')}
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-5 w-5" />
                <span className="font-semibold">Standard (3h)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Niveaux de 12 minutes, antes dès le niveau 5
              </p>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto p-4 flex-col items-start"
              onClick={() => handleGenerate('deep')}
            >
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-5 w-5" />
                <span className="font-semibold">Deep Stack (4h)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Niveaux de 15 minutes, antes dès le niveau 6
              </p>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleGenerate()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Générer selon les paramètres du tournoi
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGenerateDialogOpen(false)}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
