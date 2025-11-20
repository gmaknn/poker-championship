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
};

export default function TableDistribution({ tournamentId, onUpdate }: Props) {
  const [tablesData, setTablesData] = useState<TablesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [numberOfTables, setNumberOfTables] = useState(2);
  const [numberOfRebalanceTables, setNumberOfRebalanceTables] = useState(2);
  const [minPlayersToBreakTable, setMinPlayersToBreakTable] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isRebalanceDialogOpen, setIsRebalanceDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [activePlayers, setActivePlayers] = useState(0);

  useEffect(() => {
    fetchTables();
  }, [tournamentId]);

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables`);
      if (response.ok) {
        const data = await response.json();
        setTablesData(data);
        setActivePlayers(data.activePlayers || 0);
      } else {
        // Pas encore de tables générées, récupérer le nombre de joueurs
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}`);
        if (tournamentResponse.ok) {
          const tournamentData = await tournamentResponse.json();
          const activePlayersCount = tournamentData.tournamentPlayers?.filter((p: any) => p.finalRank === null).length || 0;
          setActivePlayers(activePlayersCount);
        }
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
      // Calculate seats per table based on number of tables
      const seatsPerTable = numberOfTables === 1
        ? activePlayers
        : Math.ceil(activePlayers / numberOfTables);

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
      // Calculate seats per table based on number of tables
      const seatsPerTable = numberOfRebalanceTables === 1
        ? activePlayers
        : Math.ceil(activePlayers / numberOfRebalanceTables);

      const response = await fetch(`/api/tournaments/${tournamentId}/tables/rebalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatsPerTable,
          minPlayersToBreakTable: Math.max(3, Math.floor(activePlayers / numberOfRebalanceTables) - 2),
        }),
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

  // Calculate distribution preview
  const calculateDistribution = (tables: number, players: number): string => {
    if (tables === 1) return `${players} joueurs`;

    const basePerTable = Math.floor(players / tables);
    const remainder = players % tables;

    const distribution: number[] = [];
    for (let i = 0; i < tables; i++) {
      distribution.push(basePerTable + (i < remainder ? 1 : 0));
    }

    return distribution.join('-') + ' joueurs';
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
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="py-8 text-center">
            <Grid3x3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucune distribution de tables n'a été générée
            </p>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <Shuffle className="mr-2 h-4 w-4" />
              Générer la distribution des tables
            </Button>
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
                <label className="text-sm font-medium">Nombre de tables</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setNumberOfTables(Math.max(1, numberOfTables - 1))}
                    className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md font-bold"
                  >
                    -
                  </button>
                  <Input
                    type="number"
                    min={1}
                    max={Math.ceil(activePlayers / 3)}
                    value={numberOfTables}
                    onChange={(e) => setNumberOfTables(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center text-xl font-bold"
                  />
                  <button
                    onClick={() => setNumberOfTables(Math.min(Math.ceil(activePlayers / 3), numberOfTables + 1))}
                    className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md font-bold"
                  >
                    +
                  </button>
                </div>
                {activePlayers > 0 && numberOfTables > 0 && (
                  <div className="mt-3 p-3 bg-muted rounded-md space-y-2">
                    <p className="text-sm font-medium">
                      {activePlayers} joueurs → {numberOfTables} table{numberOfTables > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Répartition : {calculateDistribution(numberOfTables, activePlayers)}
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

      {/* Note: The generate dialog is reused for regeneration */}

      {/* Rebalance dialog */}
      <Dialog open={isRebalanceDialogOpen} onOpenChange={setIsRebalanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rééquilibrer les tables</DialogTitle>
            <DialogDescription>
              Choisissez le nouveau nombre de tables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de tables</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setNumberOfRebalanceTables(Math.max(1, numberOfRebalanceTables - 1))}
                  className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md font-bold"
                >
                  -
                </button>
                <Input
                  type="number"
                  min={1}
                  max={Math.ceil(activePlayers / 3)}
                  value={numberOfRebalanceTables}
                  onChange={(e) => setNumberOfRebalanceTables(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-center text-xl font-bold"
                />
                <button
                  onClick={() => setNumberOfRebalanceTables(Math.min(Math.ceil(activePlayers / 3), numberOfRebalanceTables + 1))}
                  className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-md font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {tablesData && (
              <div className="mt-3 p-3 bg-muted rounded-md space-y-2">
                <p className="text-sm font-medium">
                  Actuellement: {tablesData.activePlayers} joueurs actifs sur {tablesData.totalTables} table{tablesData.totalTables > 1 ? 's' : ''}
                </p>
                {numberOfRebalanceTables > 0 && (
                  <>
                    <p className="text-sm font-medium">
                      Après rééquilibrage : {numberOfRebalanceTables} table{numberOfRebalanceTables > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Répartition : {calculateDistribution(numberOfRebalanceTables, activePlayers)}
                    </p>
                  </>
                )}
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
