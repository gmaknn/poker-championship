'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Settings as SettingsIcon, CheckCircle2, Coins, ChevronRight, FileText } from 'lucide-react';

interface SettingsData {
  id: string;
  championshipName: string;
  clubName: string;
  clubLogo: string | null;
  defaultBuyIn: number;
  defaultStartingChips: number;
  defaultLevelDuration: number;
  defaultTargetDuration: number;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  theme: string;
  language: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);

        // Appliquer le thème immédiatement
        if (updatedSettings.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const error = await response.json();
        console.error('Failed to save settings:', error);
        alert('Erreur lors de la sauvegarde des paramètres');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof SettingsData>(field: K, value: SettingsData[K]) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground text-red-500">Erreur de chargement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Configuration de l'application
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 px-4 py-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Paramètres sauvegardés</span>
          </div>
        )}
      </div>

      {/* Quick Access Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push('/dashboard/settings/chip-inventory')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Coins className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Inventaire de Jetons</CardTitle>
                  <CardDescription>
                    Gérez vos mallettes de jetons pour les tournois
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => router.push('/dashboard/settings/templates')}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle>Templates de Tournoi</CardTitle>
                  <CardDescription>
                    Sauvegardez et réutilisez vos structures favorites
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
        </Card>
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
                value={settings.championshipName}
                onChange={(e) => updateField('championshipName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="club-name">Nom du club</Label>
              <Input
                id="club-name"
                value={settings.clubName}
                onChange={(e) => updateField('clubName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="club-logo">URL du logo</Label>
              <Input
                id="club-logo"
                value={settings.clubLogo || ''}
                onChange={(e) => updateField('clubLogo', e.target.value || null)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL de l'image du logo du club
              </p>
            </div>
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
                step="0.01"
                value={settings.defaultBuyIn}
                onChange={(e) => updateField('defaultBuyIn', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="default-chips">Jetons de départ</Label>
              <Input
                id="default-chips"
                type="number"
                value={settings.defaultStartingChips}
                onChange={(e) => updateField('defaultStartingChips', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="level-duration">Durée des niveaux (min)</Label>
              <Input
                id="level-duration"
                type="number"
                value={settings.defaultLevelDuration}
                onChange={(e) => updateField('defaultLevelDuration', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="target-duration">Durée cible (min)</Label>
              <Input
                id="target-duration"
                type="number"
                value={settings.defaultTargetDuration}
                onChange={(e) => updateField('defaultTargetDuration', parseInt(e.target.value) || 0)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Gestion des notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notifications par email</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir des notifications par email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.enableEmailNotifications}
                onCheckedChange={(checked) => updateField('enableEmailNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-notifications">Notifications par SMS</Label>
                <p className="text-xs text-muted-foreground">
                  Recevoir des notifications par SMS
                </p>
              </div>
              <Switch
                id="sms-notifications"
                checked={settings.enableSmsNotifications}
                onCheckedChange={(checked) => updateField('enableSmsNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Affichage</CardTitle>
            <CardDescription>
              Préférences d'affichage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="theme">Thème</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => updateField('theme', value)}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="dark">Sombre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Langue</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => updateField('language', value)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder les paramètres'}
        </Button>
      </div>
    </div>
  );
}
