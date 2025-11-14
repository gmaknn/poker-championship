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
  FileText,
  Coffee,
  Shuffle,
  GripVertical,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type BlindLevel = {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante: number;
  duration: number;
  isBreak?: boolean;
  rebalanceTables?: boolean;
  isRebuyEnd?: boolean;
};

type BlindStats = {
  totalLevels: number;
  totalDuration: number;
  startingBB: number;
  endingBB: number;
  startingStackBB: number;
  anteStartLevel: number;
};

type TournamentTemplate = {
  id: string;
  name: string;
  description: string | null;
  structure: any;
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
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [chipConfig, setChipConfig] = useState<any | null>(null);
  const [smallestChip, setSmallestChip] = useState<number | null>(null);

  useEffect(() => {
    fetchBlindLevels();
    fetchTemplates();
    fetchChipConfig();
  }, [tournamentId]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/tournament-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchChipConfig = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chip-config`);
      if (response.ok) {
        const data = await response.json();
        setChipConfig(data);

        // Trouver la plus petite coupure
        if (data?.distribution) {
          const denominations = Object.keys(data.distribution).map(Number);
          setSmallestChip(Math.min(...denominations));
        }
      }
    } catch (error) {
      console.error('Error fetching chip config:', error);
    }
  };

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
    setSuccessMessage('');

    try {
      console.log('[Client] Saving blinds, levels count:', levels.length);

      const response = await fetch(`/api/tournaments/${tournamentId}/blinds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levels }),
      });

      console.log('[Client] Response status:', response.status, response.statusText);

      if (response.ok) {
        setSuccessMessage('Structure sauvegardée avec succès !');
        setTimeout(() => setSuccessMessage(''), 3000);
        onSave?.();
      } else {
        let errorMessage = 'Erreur lors de la sauvegarde';
        try {
          const data = await response.json();
          console.error('[Client] Error response:', data);

          if (data.error) {
            errorMessage = data.error;

            // Si il y a des détails de validation, les afficher
            if (data.details && Array.isArray(data.details)) {
              const detailMessages = data.details.map((d: any) =>
                `${d.path?.join('.')} : ${d.message}`
              ).join(', ');
              errorMessage += ` (${detailMessages})`;
            } else if (data.details) {
              errorMessage += ` (${data.details})`;
            }
          }
        } catch (parseError) {
          console.error('[Client] Failed to parse error response:', parseError);
          errorMessage = `Erreur HTTP ${response.status}: ${response.statusText}`;
        }

        setError(errorMessage);
      }
    } catch (error) {
      console.error('[Client] Network or unexpected error:', error);
      setError(error instanceof Error ? error.message : 'Erreur de connexion');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      setError('Le nom du template est requis');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/tournament-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          description: templateDescription || null,
          targetDuration: stats?.totalDuration || 0,
          startingChips,
          levelDuration: levels[0]?.duration || 12,
          rebuyEndLevel: null,
          structure: { levels },
        }),
      });

      if (response.ok) {
        setSuccessMessage('Template sauvegardé avec succès !');
        setTimeout(() => setSuccessMessage(''), 3000);
        setIsSaveTemplateDialogOpen(false);
        setTemplateName('');
        setTemplateDescription('');
        fetchTemplates();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la sauvegarde du template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      setError('Erreur lors de la sauvegarde du template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadTemplate = (template: TournamentTemplate) => {
    if (template.structure && template.structure.levels) {
      setLevels(template.structure.levels);
      calculateStats(template.structure.levels);
      setIsGenerateDialogOpen(false);
      setSuccessMessage(`Template "${template.name}" chargé avec succès !`);
      setTimeout(() => setSuccessMessage(''), 3000);
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
      isBreak: false,
      rebalanceTables: false,
      isRebuyEnd: false,
    };
    const newLevels = [...levels, newLevel];
    setLevels(newLevels);
    calculateStats(newLevels);
  };

  const handleAddBreak = () => {
    const newBreak: BlindLevel = {
      level: levels.length + 1,
      smallBlind: 0,
      bigBlind: 0,
      ante: 0,
      duration: 10,
      isBreak: true,
      rebalanceTables: false,
    };
    const newLevels = [...levels, newBreak];
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
    value: number | boolean
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

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newLevels = [...levels];
    const draggedLevel = newLevels[draggedIndex];

    // Remove from old position
    newLevels.splice(draggedIndex, 1);
    // Insert at new position
    newLevels.splice(dropIndex, 0, draggedLevel);

    // Renumber levels
    const renumbered = newLevels.map((level, index) => ({ ...level, level: index + 1 }));

    setLevels(renumbered);
    calculateStats(renumbered);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
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
          {levels.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsSaveTemplateDialogOpen(true)}
              disabled={isSaving}
            >
              <FileText className="mr-2 h-4 w-4" />
              Sauvegarder comme template
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || levels.length === 0}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      {!chipConfig && (
        <div className="bg-yellow-500/10 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg border border-yellow-500/20 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold mb-1">Configuration des jetons recommandée</p>
            <p className="text-sm">
              Pour une structure optimale, configurez d'abord vos jetons dans l'onglet "Jetons".
              La structure des blinds s'adaptera automatiquement aux coupures disponibles.
            </p>
          </div>
        </div>
      )}

      {chipConfig && smallestChip && (
        <div className="bg-blue-500/10 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg border border-blue-500/20 flex items-start gap-3">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm">
              Jetons configurés : Plus petite coupure = <strong>{smallestChip}</strong>.
              La SB/BB de départ sera adaptée automatiquement.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded">
          {successMessage}
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
          {/* Boutons en haut */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddLevel} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un niveau
            </Button>
            <Button variant="outline" onClick={handleAddBreak} className="flex-1">
              <Coffee className="mr-2 h-4 w-4" />
              Ajouter une pause
            </Button>
          </div>

          <div className="grid grid-cols-[40px_50px_0.9fr_0.9fr_0.9fr_0.9fr_100px_110px_70px] gap-3 px-4 py-3 font-medium text-sm bg-muted/30 rounded-lg">
            <div></div>
            <div>Niveau</div>
            <div>Small Blind</div>
            <div>Big Blind</div>
            <div>Ante</div>
            <div>Durée</div>
            <div>Réassigner</div>
            <div>Fin recaves</div>
            <div></div>
          </div>

          {levels.map((level, index) => (
            <Card
              key={index}
              className={`
                ${level.isBreak ? 'bg-blue-500/5 border-blue-500/20' : ''}
                ${draggedIndex === index ? 'opacity-50' : ''}
                ${dragOverIndex === index ? 'border-primary border-2' : ''}
                cursor-move transition-all
              `}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <CardContent className="pt-6">
                {level.isBreak ? (
                  <div className="grid grid-cols-[40px_60px_1fr_1fr_80px] gap-4 items-center">
                    <div className="flex justify-center cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="justify-center bg-blue-500/10">
                      <Coffee className="h-3 w-3 mr-1" />
                      {level.level}
                    </Badge>
                    <div className="col-span-1 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                      <Coffee className="h-4 w-4" />
                      PAUSE
                    </div>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLevel(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-[40px_50px_0.9fr_0.9fr_0.9fr_0.9fr_100px_110px_70px] gap-3 items-center">
                    <div className="flex justify-center cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
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
                      <span className="text-sm text-muted-foreground whitespace-nowrap">min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        id={`rebalance-${index}`}
                        checked={level.rebalanceTables || false}
                        onCheckedChange={(checked) =>
                          handleLevelChange(index, 'rebalanceTables', checked === true)
                        }
                      />
                      <label
                        htmlFor={`rebalance-${index}`}
                        className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Shuffle className="h-3 w-3" />
                        Tables
                      </label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Checkbox
                        id={`rebuy-end-${index}`}
                        checked={level.isRebuyEnd || false}
                        onCheckedChange={(checked) =>
                          handleLevelChange(index, 'isRebuyEnd', checked === true)
                        }
                      />
                      <label
                        htmlFor={`rebuy-end-${index}`}
                        className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Fin recaves
                      </label>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLevel(index);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAddLevel} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un niveau
            </Button>
            <Button variant="outline" onClick={handleAddBreak} className="flex-1">
              <Coffee className="mr-2 h-4 w-4" />
              Ajouter une pause
            </Button>
          </div>
        </div>
      )}

      {/* Dialog de génération */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Générer une structure de blinds</DialogTitle>
            <DialogDescription>
              Choisissez un template, un preset ou générez une structure basée sur les
              paramètres du tournoi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Templates sauvegardés */}
            {templates.length > 0 && (
              <>
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Templates sauvegardés
                  </h3>
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <Button
                        key={template.id}
                        variant="outline"
                        className="w-full h-auto p-4 flex-col items-start"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-5 w-5" />
                          <span className="font-semibold">{template.name}</span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou générer
                    </span>
                  </div>
                </div>
              </>
            )}
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

      {/* Dialog pour sauvegarder comme template */}
      <Dialog open={isSaveTemplateDialogOpen} onOpenChange={setIsSaveTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder comme template</DialogTitle>
            <DialogDescription>
              Sauvegardez cette structure de blinds comme template pour la réutiliser dans d'autres tournois
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nom du template *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Structure Standard 3h"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description (optionnel)</Label>
              <Input
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Ex: Structure équilibrée pour tournois de 10-20 joueurs"
              />
            </div>

            {stats && (
              <div className="p-3 bg-muted/30 rounded-lg space-y-1 text-sm">
                <div className="font-semibold">Aperçu de la structure :</div>
                <div>• {stats.totalLevels} niveaux</div>
                <div>• Durée totale : {formatTime(stats.totalDuration)}</div>
                <div>• Stack départ : {stats.startingStackBB} BB</div>
                <div>• Antes dès niveau {stats.anteStartLevel || 'Aucun'}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSaveTemplateDialogOpen(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveAsTemplate}
              disabled={isSaving || !templateName.trim()}
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
