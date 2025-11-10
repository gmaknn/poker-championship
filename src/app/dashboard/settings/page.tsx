'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Configuration de l'application
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>
              Configuration du championnat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="championship-name">Nom du championnat</Label>
              <Input
                id="championship-name"
                defaultValue="POKER CHAMPIONSHIP"
                disabled
              />
            </div>
            <div>
              <Label htmlFor="club-name">Nom du club</Label>
              <Input
                id="club-name"
                defaultValue="WPT Villaure"
                disabled
              />
            </div>
            <Button disabled>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres par défaut</CardTitle>
            <CardDescription>
              Valeurs par défaut pour les nouveaux tournois
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="default-buyin">Buy-in par défaut (€)</Label>
              <Input
                id="default-buyin"
                type="number"
                defaultValue="10"
                disabled
              />
            </div>
            <div>
              <Label htmlFor="default-chips">Jetons de départ</Label>
              <Input
                id="default-chips"
                type="number"
                defaultValue="5000"
                disabled
              />
            </div>
            <Button disabled>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fonctionnalité en développement</CardTitle>
          <CardDescription>
            Les paramètres seront bientôt configurables
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Settings className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center max-w-md">
            Cette page permettra prochainement de configurer :
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Les informations du championnat</li>
            <li>• Les paramètres par défaut des tournois</li>
            <li>• Les règles de scoring personnalisées</li>
            <li>• Les notifications et rappels</li>
            <li>• L'export des données</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
