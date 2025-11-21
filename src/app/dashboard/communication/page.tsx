'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Image as ImageIcon, Send, Sparkles, FileText, Trophy, Target, TrendingUp, Users, Download, CheckCircle2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';

import { AdminGuard } from '@/components/auth/AdminGuard';
// Templates de messages prédéfinis
const MESSAGE_TEMPLATES = [
  {
    id: 'tournament_recap',
    title: 'Récapitulatif de tournoi',
    icon: Trophy,
    template: `🏆 RÉSULTATS DU TOURNOI 🏆

Bravo à tous les participants !

🥇 1er : [WINNER_NAME] - [POINTS] points
🥈 2e : [SECOND_NAME] - [POINTS] points
🥉 3e : [THIRD_NAME] - [POINTS] points

🎯 Meilleur tueur : [KILLER_NAME] avec [ELIMINATIONS] éliminations

Merci à tous et à bientôt pour le prochain tournoi !

#PokerChampionship #WPTVillelaure`
  },
  {
    id: 'weekly_ranking',
    title: 'Classement de la semaine',
    icon: TrendingUp,
    template: `📊 CLASSEMENT DE LA SEMAINE 📊

Voici le Top 5 après cette semaine de compétition :

1️⃣ [PLAYER_1] - [POINTS] pts
2️⃣ [PLAYER_2] - [POINTS] pts
3️⃣ [PLAYER_3] - [POINTS] pts
4️⃣ [PLAYER_4] - [POINTS] pts
5️⃣ [PLAYER_5] - [POINTS] pts

La course continue ! 🚀

#Classement #WPTVillelaure`
  },
  {
    id: 'next_tournament',
    title: 'Annonce prochain tournoi',
    icon: Target,
    template: `🎲 PROCHAIN TOURNOI 🎲

📅 Date : [DATE]
⏰ Heure : [TIME]
💰 Buy-in : [BUYIN]€
🎯 Starting chips : [CHIPS]

Inscriptions ouvertes !
Réservez votre place dès maintenant.

Rendez-vous sur [LINK]

#NextTournament #WPTVillelaure`
  },
  {
    id: 'fun_stats',
    title: 'Statistiques fun',
    icon: Sparkles,
    template: `🎰 LES STATS DE LA SEMAINE 🎰

Quelques chiffres amusants de notre championnat :

🦈 Le plus gros shark : [SHARK_NAME]
💸 Le plus malchanceux : [UNLUCKY_NAME]
🔥 La série en cours : [STREAK_NAME]
🎭 Le bluffeur fou : [BLUFFER_NAME]

Qui sera dans les stats la semaine prochaine ? 😄

#FunStats #WPTVillelaure`
  }
];

// Types de visuels disponibles
const VISUAL_TYPES = [
  {
    id: 'podium',
    title: 'Podium du tournoi',
    description: 'Top 3 avec avatars',
    icon: Trophy,
    available: true
  },
  {
    id: 'leaderboard',
    title: 'Classement général',
    description: 'Top 10 de la saison',
    icon: TrendingUp,
    available: true
  },
  {
    id: 'top_sharks',
    title: 'Top Sharks',
    description: 'Meilleurs éliminateurs',
    icon: Target,
    available: true
  },
  {
    id: 'tournament_stats',
    title: 'Stats du tournoi',
    description: 'Graphiques et chiffres clés',
    icon: Users,
    available: true
  }
];

export default function CommunicationPage() {
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedVisuals, setSelectedVisuals] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [latestData, setLatestData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiMessageType, setAiMessageType] = useState('tournament_recap');
  const [aiUserInput, setAiUserInput] = useState('');

  // Fetch des dernières données au chargement
  useEffect(() => {
    fetch('/api/communication/latest-data')
      .then(res => res.json())
      .then(data => {
        setLatestData(data);
        setLoadingData(false);
      })
      .catch(err => {
        console.error('Error loading latest data:', err);
        setLoadingData(false);
      });
  }, []);

  // Fonction pour remplir un template avec les vraies données
  const fillTemplate = (templateId: string, templateText: string): string => {
    if (!latestData) return templateText;

    let filled = templateText;

    if (templateId === 'tournament_recap' && latestData.latestTournament) {
      const t = latestData.latestTournament;
      filled = filled
        .replace('[WINNER_NAME]', t.podium[0]?.player.nickname || 'N/A')
        .replace('[SECOND_NAME]', t.podium[1]?.player.nickname || 'N/A')
        .replace('[THIRD_NAME]', t.podium[2]?.player.nickname || 'N/A')
        .replace('[KILLER_NAME]', t.topKiller?.player.nickname || 'N/A')
        .replace('[ELIMINATIONS]', t.topKiller?.eliminationsCount || '0');

      // Remplacer [POINTS] pour chaque position
      filled = filled.replace(/\[POINTS\]/g, (match, offset) => {
        if (filled.substring(0, offset).includes('1er')) return String(t.podium[0]?.points || 0);
        if (filled.substring(0, offset).includes('2e')) return String(t.podium[1]?.points || 0);
        if (filled.substring(0, offset).includes('3e')) return String(t.podium[2]?.points || 0);
        return match;
      });
    }

    if (templateId === 'weekly_ranking' && latestData.leaderboard) {
      const l = latestData.leaderboard;
      for (let i = 0; i < 5; i++) {
        const player = l[i];
        filled = filled
          .replace(`[PLAYER_${i + 1}]`, player?.player.nickname || 'N/A')
          .replace('[POINTS]', player ? String(player.totalPoints) : '0');
      }
    }

    if (templateId === 'next_tournament' && latestData.nextTournament) {
      const t = latestData.nextTournament;
      const date = new Date(t.date);
      filled = filled
        .replace('[DATE]', date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))
        .replace('[TIME]', date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))
        .replace('[BUYIN]', String(t.buyInAmount))
        .replace('[CHIPS]', String(t.startingChips).replace(/\B(?=(\d{3})+(?!\d))/g, ' '))
        .replace('[LINK]', 'http://localhost:3003/dashboard');
    }

    if (templateId === 'fun_stats' && latestData.topSharks) {
      const shark = latestData.topSharks[0];
      filled = filled
        .replace('[SHARK_NAME]', shark?.player.nickname || 'N/A')
        .replace('[UNLUCKY_NAME]', latestData.leaderboard?.[latestData.leaderboard.length - 1]?.player.nickname || 'N/A')
        .replace('[STREAK_NAME]', latestData.leaderboard?.[0]?.player.nickname || 'N/A')
        .replace('[BLUFFER_NAME]', latestData.topSharks?.[1]?.player.nickname || 'N/A');
    }

    return filled;
  };

  const handleTemplateSelect = (template: typeof MESSAGE_TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    const filledMessage = fillTemplate(template.id, template.template);
    setMessage(filledMessage);
  };

  const toggleVisual = (visualId: string) => {
    setSelectedVisuals(prev =>
      prev.includes(visualId)
        ? prev.filter(id => id !== visualId)
        : [...prev, visualId]
    );
  };

  const handlePrepareForWhatsApp = async () => {
    setIsPreparing(true);

    try {
      // 1. Copier le message dans le presse-papiers
      if (message.trim()) {
        await navigator.clipboard.writeText(message);
      }

      // 2. Afficher le modal d'instructions
      setShowInstructions(true);

    } catch (error) {
      console.error('Error preparing for WhatsApp:', error);
      alert('❌ Erreur lors de la préparation. Vérifiez que votre navigateur autorise la copie dans le presse-papiers.');
    } finally {
      setIsPreparing(false);
    }
  };

  const openWhatsAppWeb = () => {
    window.open('https://web.whatsapp.com/', '_blank');
  };

  const handleGenerateWithAI = async () => {
    setIsGeneratingAI(true);
    setShowAIDialog(false);

    try {
      const response = await fetch('/api/ai/generate-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: latestData,
          messageType: aiMessageType,
          userData: aiUserInput.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate message');
      }

      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      console.error('Error generating AI message:', error);
      alert('❌ Erreur lors de la génération du message. Veuillez réessayer.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication"
        description="Créez et publiez vos messages pour le groupe WhatsApp"
        icon={<MessageSquare className="h-10 w-10" />}
      />

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compose">
            <FileText className="h-4 w-4 mr-2" />
            Rédiger
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="visuals">
            <ImageIcon className="h-4 w-4 mr-2" />
            Visuels
          </TabsTrigger>
        </TabsList>

        {/* Onglet Rédaction */}
        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rédigez votre message</CardTitle>
              <CardDescription>
                Écrivez directement ou utilisez un template pour gagner du temps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Tapez votre message ici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[300px] font-mono"
              />
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {message.length} caractères
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
                    {previewMode ? 'Éditer' : 'Prévisualiser'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAIDialog(true)}
                    disabled={isGeneratingAI || loadingData}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {isGeneratingAI ? 'Génération...' : 'Assistant IA'}
                  </Button>
                </div>
              </div>

              {/* Prévisualisation */}
              {previewMode && (
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Prévisualisation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap font-sans">
                      {message || 'Votre message apparaîtra ici...'}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {MESSAGE_TEMPLATES.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    isSelected ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      {template.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {template.template}
                    </div>
                    {isSelected && (
                      <Badge className="mt-2" variant="default">
                        Sélectionné
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Onglet Visuels */}
        <TabsContent value="visuals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sélectionnez les visuels à inclure</CardTitle>
              <CardDescription>
                Les visuels seront générés automatiquement avec les dernières données
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {VISUAL_TYPES.map((visual) => {
                  const Icon = visual.icon;
                  const isSelected = selectedVisuals.includes(visual.id);

                  return (
    <AdminGuard requireAdmin={true}>
                    <Card
                      key={visual.id}
                      className={`cursor-pointer transition-all ${
                        visual.available
                          ? `hover:border-primary ${isSelected ? 'border-primary bg-primary/5' : ''}`
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      onClick={() => visual.available && toggleVisual(visual.id)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{visual.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {visual.description}
                            </p>
                            {isSelected && (
                              <Badge className="mt-2" variant="default">
                                Sélectionné
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  
    </AdminGuard>
  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Résumé et publication */}
      <Card className="border-2 border-green-500 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MessageSquare className="h-6 w-6 text-green-500" />
            Prêt à partager sur WhatsApp ?
          </CardTitle>
          <CardDescription>
            {loadingData ? 'Chargement des données...' : 'Cliquez pour préparer votre message et vos visuels'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Message :</span>
              <span className="ml-2 font-semibold">
                {message.length > 0 ? `${message.length} caractères` : 'Aucun'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Visuels :</span>
              <span className="ml-2 font-semibold">
                {selectedVisuals.length} sélectionné{selectedVisuals.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <Button
            onClick={handlePrepareForWhatsApp}
            disabled={message.length === 0 || isPreparing}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isPreparing ? (
              <>Préparation...</>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Préparer pour WhatsApp
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Le message sera copié et les instructions vous seront affichées
          </p>
        </CardContent>
      </Card>

      {/* Modal d'instructions */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Contenu prêt !
            </DialogTitle>
            <DialogDescription>
              Suivez ces étapes pour publier sur WhatsApp
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Étape 1 */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold">Message copié ✅</h4>
                <p className="text-sm text-muted-foreground">
                  Votre message est dans le presse-papiers
                </p>
              </div>
            </div>

            {/* Étape 2 */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">Ouvrez WhatsApp</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openWhatsAppWeb}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir WhatsApp Web
                </Button>
              </div>
            </div>

            {/* Étape 3 */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold">Collez le message</h4>
                <p className="text-sm text-muted-foreground">
                  Dans la conversation du groupe, faites <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+V</kbd> (ou <kbd className="px-2 py-1 bg-muted rounded text-xs">Cmd+V</kbd> sur Mac)
                </p>
              </div>
            </div>

            {/* Étape 4 - Si visuels */}
            {selectedVisuals.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white font-bold flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Ajoutez les visuels</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedVisuals.length} visuel{selectedVisuals.length > 1 ? 'x' : ''} sélectionné{selectedVisuals.length > 1 ? 's' : ''} :
                  </p>
                  <ul className="text-sm space-y-1">
                    {selectedVisuals.includes('podium') && (
                      <li className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        Podium du tournoi
                      </li>
                    )}
                    {selectedVisuals.includes('leaderboard') && (
                      <li className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        Classement général
                      </li>
                    )}
                    {selectedVisuals.includes('top_sharks') && (
                      <li className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-red-500" />
                        Top Sharks
                      </li>
                    )}
                    {selectedVisuals.includes('tournament_stats') && (
                      <li className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-500" />
                        Stats du tournoi
                      </li>
                    )}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Conseil : Générez et téléchargez ces images depuis la page Exports
                  </p>
                </div>
              </div>
            )}

            {/* Étape finale */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold flex-shrink-0">
                ✓
              </div>
              <div>
                <h4 className="font-semibold">Envoyez !</h4>
                <p className="text-sm text-muted-foreground">
                  Vérifiez le message et cliquez sur Envoyer dans WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={openWhatsAppWeb}
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              WhatsApp Web
            </Button>
            <Button
              onClick={() => setShowInstructions(false)}
              className="flex-1"
            >
              Compris !
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Assistant IA */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-purple-500" />
              Assistant IA - Génération de message
            </DialogTitle>
            <DialogDescription>
              Claude va générer un message créatif basé sur vos dernières données
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sélection du type de message */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Type de message
              </label>
              <select
                value={aiMessageType}
                onChange={(e) => setAiMessageType(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="tournament_recap">Récapitulatif de tournoi</option>
                <option value="weekly_ranking">Classement de la semaine</option>
                <option value="next_tournament">Annonce prochain tournoi</option>
                <option value="fun_stats">Statistiques fun</option>
              </select>
            </div>

            {/* Informations additionnelles (optionnel) */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Informations additionnelles (optionnel)
              </label>
              <Textarea
                placeholder="Ex: Mentionner que Bob a fait un all-in spectaculaire, ou que c'était une soirée mémorable..."
                value={aiUserInput}
                onChange={(e) => setAiUserInput(e.target.value)}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ajoutez des détails personnels pour un message encore plus unique
              </p>
            </div>

            {/* Aperçu des données disponibles */}
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-2">Données disponibles :</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                {latestData?.latestTournament && (
                  <div>✅ Dernier tournoi terminé</div>
                )}
                {latestData?.activeSeason && (
                  <div>✅ Saison active avec classement</div>
                )}
                {latestData?.topSharks && latestData.topSharks.length > 0 && (
                  <div>✅ Top sharks (éliminateurs)</div>
                )}
                {latestData?.nextTournament && (
                  <div>✅ Prochain tournoi planifié</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAIDialog(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={handleGenerateWithAI}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={isGeneratingAI}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Générer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
