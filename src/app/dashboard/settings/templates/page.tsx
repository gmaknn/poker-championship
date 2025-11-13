'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, Eye, Clock, Users, Coins } from 'lucide-react';

type TournamentTemplate = {
  id: string;
  name: string;
  description?: string | null;
  targetDuration?: number | null;
  startingChips?: number | null;
  levelDuration?: number | null;
  rebuyEndLevel?: number | null;
  structure: any;
  createdAt: string;
  updatedAt: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TournamentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TournamentTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/tournament-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le template "${name}" ?`)) return;

    try {
      const response = await fetch(`/api/tournament-templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleViewTemplate = (template: TournamentTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return 'Non spécifié';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}` : `${mins}min`;
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
          <h1 className="text-3xl font-bold">Templates de Tournoi</h1>
          <p className="text-muted-foreground">
            Sauvegardez et réutilisez vos structures de tournoi favorites
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            💡 Les templates se créent automatiquement lorsque vous configurez un tournoi avec
            une structure de blindes. Vous pourrez sauvegarder la structure comme template
            lors de la création.
          </p>
        </CardContent>
      </Card>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun template</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Créez votre premier tournoi avec une structure de blindes<br />
              et sauvegardez-la comme template pour la réutiliser
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {template.targetDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDuration(template.targetDuration)}
                      </span>
                    </div>
                  )}
                  {template.startingChips && (
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {template.startingChips.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {template.levelDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Niveaux: {template.levelDuration}min
                      </span>
                    </div>
                  )}
                  {template.structure && Array.isArray(template.structure) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {template.structure.length} niveaux
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewTemplate(template)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Voir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id, template.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Template Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || 'Détails de la structure'}
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Info Summary */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Durée cible</p>
                  <p className="font-semibold">
                    {formatDuration(selectedTemplate.targetDuration)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stack de départ</p>
                  <p className="font-semibold">
                    {selectedTemplate.startingChips?.toLocaleString() || 'Non spécifié'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Durée des niveaux</p>
                  <p className="font-semibold">
                    {selectedTemplate.levelDuration ? `${selectedTemplate.levelDuration} min` : 'Non spécifié'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fin des recaves</p>
                  <p className="font-semibold">
                    {selectedTemplate.rebuyEndLevel ? `Niveau ${selectedTemplate.rebuyEndLevel}` : 'Non spécifié'}
                  </p>
                </div>
              </div>

              {/* Blind Structure */}
              {selectedTemplate.structure && Array.isArray(selectedTemplate.structure) && (
                <div>
                  <h4 className="font-semibold mb-3">Structure des blindes</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedTemplate.structure.map((level: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted/20 rounded"
                      >
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">Niveau {level.level}</Badge>
                          <div className="flex gap-2 text-sm">
                            <span className="font-semibold">
                              {level.smallBlind}/{level.bigBlind}
                            </span>
                            {level.ante > 0 && (
                              <span className="text-muted-foreground">
                                (ante: {level.ante})
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {level.duration}min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
