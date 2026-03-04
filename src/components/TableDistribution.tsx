'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Grid3x3, Shuffle, Trash2, Users, QrCode, Printer, Shield, Crosshair, Scissors } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

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
  isTableDirector?: boolean;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRedistributing, setIsRedistributing] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [togglingDirector, setTogglingDirector] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRedistribute, setConfirmRedistribute] = useState(false);
  const [tableBreakThreshold, setTableBreakThreshold] = useState(3);

  useEffect(() => {
    fetchTables();
    fetchThreshold();
  }, [tournamentId]);

  const fetchThreshold = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        setTableBreakThreshold(data.tableBreakThreshold ?? 3);
      }
    } catch (error) {
      // silently ignore
    }
  };

  const handleThresholdChange = async (value: number) => {
    if (value < 1 || value > 10) return;
    setTableBreakThreshold(value);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableBreakThreshold: value }),
      });
      if (response.ok) {
        toast.success(`Seuil de casse : ${value} joueurs min.`);
      }
    } catch (error) {
      console.error('Error updating threshold:', error);
    }
  };

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables`);
      if (response.ok) {
        const data = await response.json();
        setTablesData(data);
      } else {
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
        toast.success(`${data.totalTables} table${data.totalTables > 1 ? 's' : ''} générée${data.totalTables > 1 ? 's' : ''}`);
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

  const handleRedistribute = async () => {
    setIsRedistributing(true);
    setError('');

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatsPerTable, force: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setTablesData(data);
        setConfirmRedistribute(false);
        onUpdate?.();
        toast.success(`Redistribution effectuée : ${data.totalTables} table(s), ${data.totalPlayers} joueur(s)`);
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la redistribution');
      }
    } catch (error) {
      console.error('Error redistributing tables:', error);
      setError('Erreur lors de la redistribution');
    } finally {
      setIsRedistributing(false);
    }
  };

  const handleDeleteTables = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/tables`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTablesData(null);
        onUpdate?.();
        toast.success('Tables supprimées');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la suppression des assignations');
      }
    } catch (error) {
      console.error('Error deleting tables:', error);
      toast.error('Erreur lors de la suppression des assignations');
    }
  };

  const handleToggleDirector = async (tableNumber: number, playerId: string, currentValue: boolean) => {
    setTogglingDirector(playerId);
    try {
      const response = await fetch(
        `/api/tournaments/${tournamentId}/tables/${tableNumber}/director`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, isTableDirector: !currentValue }),
        }
      );

      if (response.ok) {
        await fetchTables();
        toast.success(!currentValue ? 'Directeur de table désigné' : 'Directeur de table retiré');
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la désignation du DT');
      }
    } catch (err) {
      console.error('Error toggling table director:', err);
      setError('Erreur réseau');
    } finally {
      setTogglingDirector(null);
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
                <p className="text-sm text-muted-foreground">
                  Généralement 8-10 places pour le poker
                </p>
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
    <div className="space-y-6 min-w-0">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
            <span className="text-muted-foreground text-sm sm:text-base">actifs</span>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-1.5">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Casse :</span>
              <Input
                type="number"
                min={1}
                max={10}
                value={tableBreakThreshold}
                onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 3)}
                className="w-14 h-7 text-center text-sm px-1"
              />
              <span className="text-sm text-muted-foreground">min.</span>
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQRDialogOpen(true)}
            >
              <QrCode className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">QR Codes</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRedistribute(true)}
              disabled={isRedistributing}
            >
              <Shuffle className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Redistribuer les joueurs</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Grille des tables */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {tablesData.tables.map((table) => (
          <Card key={table.tableNumber} className="overflow-hidden">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Table {table.tableNumber}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={table.activePlayers > 0 ? 'default' : 'secondary'}>
                    {table.activePlayers} joueur{table.activePlayers > 1 ? 's' : ''}
                  </Badge>
                  {!readOnly && (
                    <Link
                      href={`/director/${tournamentId}/table/${table.tableNumber}`}
                      title="Gérer les éliminations de cette table"
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Crosshair className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="space-y-2">
                {table.players.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Table vide
                  </p>
                ) : (
                  table.players.map((assignment) => (
                    <div
                      key={assignment.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-md border min-w-0 ${
                        assignment.isEliminated
                          ? 'bg-muted text-muted-foreground line-through'
                          : assignment.isTableDirector
                            ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-600 text-amber-900 dark:text-amber-100'
                            : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-sm flex-shrink-0">
                          #{assignment.seatNumber || '-'}
                        </Badge>
                        {assignment.isTableDirector && (
                          <Shield className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {assignment.player?.nickname || 'Joueur inconnu'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {assignment.isEliminated ? (
                          <Badge variant="secondary" className="text-sm">
                            Éliminé
                          </Badge>
                        ) : !readOnly && (
                          <button
                            onClick={() => handleToggleDirector(
                              assignment.tableNumber,
                              assignment.playerId,
                              !!assignment.isTableDirector
                            )}
                            disabled={togglingDirector === assignment.playerId}
                            className={`p-1 rounded-md transition-colors ${
                              assignment.isTableDirector
                                ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900'
                                : 'text-muted-foreground hover:text-amber-600 hover:bg-muted'
                            }`}
                            title={assignment.isTableDirector ? 'Retirer DT' : 'Désigner DT'}
                          >
                            <Shield className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* QR Codes dialog */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>QR Codes des tables</DialogTitle>
            <DialogDescription>
              Chaque QR code renvoie vers la vue DT de la table correspondante
            </DialogDescription>
          </DialogHeader>

          <div id="qr-codes-grid" className="grid grid-cols-2 md:grid-cols-3 gap-6 py-4">
            {tablesData.tables.map((table) => {
              const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/director/${tournamentId}/table/${table.tableNumber}`;
              return (
                <div key={table.tableNumber} className="flex flex-col items-center gap-2 p-4 border rounded-lg">
                  <QRCodeSVG
                    value={qrUrl}
                    size={160}
                    level="M"
                    includeMargin
                  />
                  <p className="text-sm font-bold">Table {table.tableNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {table.activePlayers} joueur{table.activePlayers > 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsQRDialogOpen(false)}
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;

                const qrHtml = tablesData.tables.map((table) => {
                  const qrUrl = `${window.location.origin}/director/${tournamentId}/table/${table.tableNumber}`;
                  return `
                    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;border:1px solid #ddd;border-radius:8px;break-inside:avoid;">
                      <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}" width="200" height="200" />
                      <strong style="font-size:18px;">Table ${table.tableNumber}</strong>
                      <span style="font-size:12px;color:#666;">${table.activePlayers} joueur${table.activePlayers > 1 ? 's' : ''}</span>
                    </div>
                  `;
                }).join('');

                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>QR Codes Tables</title>
                    <style>
                      body { font-family: sans-serif; padding: 20px; }
                      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
                      @media print { body { padding: 10px; } }
                    </style>
                  </head>
                  <body>
                    <h1 style="text-align:center;margin-bottom:20px;">QR Codes - Tables</h1>
                    <div class="grid">${qrHtml}</div>
                    <script>window.onload = function() { window.print(); }</script>
                  </body>
                  </html>
                `);
                printWindow.document.close();
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm redistribute dialog */}
      <AlertDialog open={confirmRedistribute} onOpenChange={setConfirmRedistribute}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redistribuer tous les joueurs ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les joueurs actifs seront mélangés aléatoirement et redistribués sur les tables existantes.
              Les désignations de Directeurs de Table seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRedistribute}
              disabled={isRedistributing}
            >
              {isRedistributing ? 'Redistribution...' : 'Redistribuer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm clear all dialog */}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les assignations ?</AlertDialogTitle>
            <AlertDialogDescription>
              Tous les joueurs seront retirés de leurs tables.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteTables();
                setConfirmClear(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer tout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
