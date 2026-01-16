'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Grid3x3, Shuffle, RefreshCw, Trash2, Users } from 'lucide-react';

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
};

type TableAssignment = {
  id: string;
  playerId: string;
  tableNumber: number;
  seatNumber: number | null;
  isActive: boolean;
  player?: Player;
  isEliminated?: boolean;
};

type Table = {
  tableNumber: number;
  players: TableAssignment[];
  activePlayers: number;
  totalPlayers: number;
};

type TablesData = {
  tables: Table[];
  totalTables: number;
  totalPlayers: number;
  activePlayers: number;
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
  readOnly?: boolean;
};

export default function TableDistribution({ tournamentId, onUpdate, readOnly = false }: Props) {
  const [tablesData, setTablesData] = useState<TablesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [seatsPerTable, setSeatsPerTable] = useState(9);
  const [minPlayersToBreakTable, setMinPlayersToBreakTable] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isRebalanceDialogOpen, setIsRebalanceDialogOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTables();
  }, [tournamentId]);

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables`);
      if (response.ok) {
        const data = await response.json();
        setTablesData(data);
      } else {
        // Pas encore de tables générées
        setTablesData(null);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      setError('Erreur lors du chargement des tables');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTables = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatsPerTable }),
      });

      if (response.ok) {
        const data = await response.json();
        setTablesData(data);
        setIsGenerateDialogOpen(false);
        onUpdate?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la génération des tables');
      }
    } catch (error) {
      console.error('Error generating tables:', error);
      setError('Erreur lors de la génération des tables');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRebalanceTables = async () => {
    setIsRebalancing(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables/rebalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatsPerTable, minPlayersToBreakTable }),
      });

      if (response.ok) {
        const data = await response.json();
        setTablesData(data);
        setIsRebalanceDialogOpen(false);
        onUpdate?.();
        alert(
          `Rééquilibrage effectué:\n- ${data.totalTables} table(s)\n- ${data.movedPlayers} joueur(s) déplacé(s)\n- ${data.brokenTables} table(s) cassée(s)`
        );
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors du rééquilibrage');
      }
    } catch (error) {
      console.error('Error rebalancing tables:', error);
      setError('Erreur lors du rééquilibrage');
    } finally {
      setIsRebalancing(false);
    }
  };

  const handleDeleteTables = async () => {
    if (!confirm('Voulez-vous vraiment supprimer toutes les assignations de tables ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTablesData(null);
        onUpdate?.();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting tables:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  // Aucune table générée
  if (!tablesData || tablesData.tables.length === 0) {
    return (
      <div className="space-y-6">
        {/* Bandeau lecture seule */}
        {readOnly && (
          <div className="bg-muted/50 text-muted-foreground px-4 py-3 rounded-lg border flex items-center gap-2">
            <Grid3x3 className="h-5 w-5" />
            <span>Tournoi terminé - Tables en lecture seule</span>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="py-8 text-center">
            <Grid3x3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {readOnly ? 'Aucune distribution de tables pour ce tournoi' : 'Aucune distribution de tables n\'a été générée'}
            </p>
            {!readOnly && (
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Shuffle className="mr-2 h-4 w-4" />
                Générer la distribution des tables
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Dialog de génération */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Générer la distribution des tables</DialogTitle>
              <DialogDescription>
                Les joueurs seront répartis aléatoirement sur les tables
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de places par table</label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={seatsPerTable}
                  onChange={(e) => setSeatsPerTable(parseInt(e.target.value) || 9)}
                />
                <p className="text-xs text-muted-foreground">
                  Généralement 8-10 places pour le poker
                </p>
                {tablesData && tablesData.activePlayers > 0 && seatsPerTable > 0 && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">
                      {tablesData.activePlayers} joueurs actifs ÷ {seatsPerTable} places par table = {Math.ceil(tablesData.activePlayers / seatsPerTable)} table{Math.ceil(tablesData.activePlayers / seatsPerTable) > 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsGenerateDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button onClick={handleGenerateTables} disabled={isGenerating}>
                {isGenerating ? 'Génération...' : 'Générer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Afficher les tables
  return (
    <div className="space-y-6">
      {/* Bandeau lecture seule */}
      {readOnly && (
        <div className="bg-muted/50 text-muted-foreground px-4 py-3 rounded-lg border flex items-center gap-2">
          <Grid3x3 className="h-5 w-5" />
          <span>Tournoi terminé - Tables en lecture seule</span>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Header avec stats et actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{tablesData.totalTables}</span>
            <span className="text-muted-foreground">
              table{tablesData.totalTables > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-xl font-bold">{tablesData.activePlayers}</span>
            <span className="text-muted-foreground">joueurs actifs</span>
          </div>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRebalanceDialogOpen(true)}
              disabled={isRebalancing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Rééquilibrer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGenerateDialogOpen(true)}
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Régénérer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteTables}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Grille des tables */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tablesData.tables.map((table) => (
          <Card key={table.tableNumber}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Table {table.tableNumber}</CardTitle>
                <Badge variant={table.activePlayers > 0 ? 'default' : 'secondary'}>
                  {table.activePlayers} joueur{table.activePlayers > 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {table.players.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Table vide
                  </p>
                ) : (
                  table.players.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`flex items-center justify-between p-2 rounded-md border ${
                        assignment.isEliminated
                          ? 'bg-muted text-muted-foreground line-through'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{assignment.seatNumber || '-'}
                        </Badge>
                        <span className="text-sm font-medium">
                          {assignment.player?.nickname || 'Joueur inconnu'}
                        </span>
                      </div>
                      {assignment.isEliminated && (
                        <Badge variant="secondary" className="text-xs">
                          Éliminé
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de régénération */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Régénérer la distribution des tables</DialogTitle>
            <DialogDescription>
              Attention : cela va remplacer la distribution actuelle
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de places par table</label>
              <Input
                type="number"
                min={2}
                max={10}
                value={seatsPerTable}
                onChange={(e) => setSeatsPerTable(parseInt(e.target.value) || 9)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGenerateDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleGenerateTables} disabled={isGenerating}>
              {isGenerating ? 'Génération...' : 'Régénérer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rebalance dialog */}
      <Dialog open={isRebalanceDialogOpen} onOpenChange={setIsRebalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rééquilibrer les tables</DialogTitle>
            <DialogDescription>
              Configurez les paramètres de rééquilibrage des tables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de places par table</label>
              <Input
                type="number"
                min={2}
                max={10}
                value={seatsPerTable}
                onChange={(e) => setSeatsPerTable(parseInt(e.target.value) || 9)}
              />
              <p className="text-xs text-muted-foreground">
                Nombre de joueurs maximum par table
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seuil de casse de table</label>
              <Input
                type="number"
                min={2}
                max={seatsPerTable - 1}
                value={minPlayersToBreakTable}
                onChange={(e) => setMinPlayersToBreakTable(parseInt(e.target.value) || 3)}
              />
              <p className="text-xs text-muted-foreground">
                Nombre minimum de joueurs en dessous duquel une table est cassée et les joueurs sont redistribués
              </p>
            </div>

            {tablesData && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  Actuellement: {tablesData.activePlayers} joueurs actifs sur {tablesData.totalTables} table{tablesData.totalTables > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRebalanceDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleRebalanceTables} disabled={isRebalancing}>
              {isRebalancing ? 'Rééquilibrage...' : 'Rééquilibrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
