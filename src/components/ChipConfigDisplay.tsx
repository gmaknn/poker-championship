'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Briefcase, Users, TrendingUp, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ChipDistribution = {
  value: number;
  count: number;
  total: number;
  color: string;
};

type ChipConfig = {
  id: string;
  chipSetsUsed: string[];
  distribution: ChipDistribution[];
  playersCount: number;
  stackSize: number;
  rebuysExpected: number;
  createdAt: string;
  updatedAt: string;
};

type ChipSet = {
  id: string;
  name: string;
};

type Props = {
  tournamentId: string;
  onUpdate?: () => void;
};

export default function ChipConfigDisplay({ tournamentId, onUpdate }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<ChipConfig | null>(null);
  const [chipSets, setChipSets] = useState<ChipSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [tournamentId]);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chip-config`);
      if (response.ok) {
        const data = await response.json();
        if (data.config || data.chipSetsUsed) {
          setConfig(data);
          // Fetch chip set names
          if (data.chipSetsUsed && data.chipSetsUsed.length > 0) {
            const chipSetsResponse = await fetch('/api/chip-sets');
            if (chipSetsResponse.ok) {
              const allChipSets = await chipSetsResponse.json();
              const usedChipSets = allChipSets.filter((cs: ChipSet) =>
                data.chipSetsUsed.includes(cs.id)
              );
              setChipSets(usedChipSets);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching chip config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer la configuration de jetons de l\'assistant ?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/chip-config`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConfig(null);
        setChipSets([]);
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error deleting chip config:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecalculate = () => {
    router.push('/dashboard/chip-assistant');
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

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuration de l'Assistant Jetons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucune configuration de jetons depuis l'assistant
            </p>
            <Button onClick={handleRecalculate}>
              Utiliser l'Assistant Jetons
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configuration de l'Assistant Jetons</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configuration calculée automatiquement
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
            >
              Recalculer
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Informations générales */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Joueurs</p>
              <p className="text-xl font-bold">{config.playersCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Stack par joueur</p>
              <p className="text-xl font-bold">{config.stackSize.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Rebuys attendus</p>
              <p className="text-xl font-bold">{config.rebuysExpected}</p>
            </div>
          </div>
        </div>

        {/* Mallettes utilisées */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Mallettes utilisées</h3>
          </div>
          <div className="space-y-2">
            {chipSets.length > 0 ? (
              chipSets.map((chipSet) => (
                <div
                  key={chipSet.id}
                  className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg"
                >
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{chipSet.name}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {config.chipSetsUsed.length} mallette(s) utilisée(s)
              </p>
            )}
          </div>
        </div>

        {/* Distribution par joueur */}
        <div>
          <h3 className="font-semibold mb-3">Distribution par joueur</h3>
          <div className="space-y-2">
            {config.distribution.map((dist, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-slate-300 flex items-center justify-center font-bold text-sm shadow-sm"
                    style={{
                      backgroundColor: dist.color,
                      color: dist.value > 500 ? '#000000' : '#FFFFFF',
                    }}
                  >
                    {dist.value}
                  </div>
                  <div>
                    <p className="font-medium">
                      {dist.count} × {dist.value.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: {dist.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total par joueur:</span>
            <span className="text-2xl font-bold">
              {config.distribution
                .reduce((sum, d) => sum + d.total, 0)
                .toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
