'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  User,
  Phone,
  Mail,
  Lock,
  Save,
  Loader2,
  Upload,
  Edit,
  Eye,
  EyeOff,
  BarChart3,
  Check,
} from 'lucide-react';
import { useCurrentPlayer } from '@/components/layout/player-nav';
import {
  getAvatarUrl,
  getDiceBearPreviewUrl,
  DICEBEAR_STYLES,
  LEGACY_AVATAR_SEEDS,
  createAvatarValue,
  parseAvatarValue,
} from '@/lib/avatar';

type PlayerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
};

export default function PlayerProfilePage() {
  const router = useRouter();
  const { currentPlayer, isLoading: isSessionLoading } = useCurrentPlayer();

  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Password change
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionLoading) {
      if (!currentPlayer) {
        router.replace('/player/login');
      } else {
        fetchProfile();
      }
    }
  }, [currentPlayer, isSessionLoading, router]);

  const fetchProfile = async () => {
    if (!currentPlayer) return;

    try {
      const response = await fetch(`/api/players/${currentPlayer.id}`);
      if (response.ok) {
        const data = await response.json();
        setPlayer(data);
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setSelectedAvatar(data.avatar);
      } else {
        setError('Erreur lors du chargement du profil');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Erreur lors du chargement du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!player) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/players/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: player.firstName,
          lastName: player.lastName,
          nickname: player.nickname,
          email: email || '',
          phone: phone || '',
          avatar: selectedAvatar,
        }),
      });

      if (response.ok) {
        const updatedPlayer = await response.json();
        setPlayer(updatedPlayer);
        setSuccess('Profil mis à jour avec succès');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiceBearStyleSelect = (styleId: string) => {
    setSelectedAvatar(createAvatarValue('dicebear', styleId));
    setIsAvatarDialogOpen(false);
  };

  const handleLegacyAvatarSelect = (seed: string) => {
    setSelectedAvatar(seed); // Legacy format - just the seed
    setIsAvatarDialogOpen(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !player) return;

    setIsUploadingAvatar(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const uploadResponse = await fetch(`/api/players/${player.id}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { avatarUrl } = await uploadResponse.json();
      setSelectedAvatar(avatarUrl);
      setIsAvatarDialogOpen(false);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setUploadError(error.message || "Erreur lors de l'upload");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!player) return;

    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch(`/api/players/${player.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        setPasswordSuccess('Mot de passe modifié avec succès');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsPasswordDialogOpen(false);
          setPasswordSuccess(null);
        }, 2000);
      } else {
        const data = await response.json();
        setPasswordError(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Erreur lors du changement de mot de passe');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Determine which avatar style is currently selected
  const getSelectedStyleInfo = () => {
    const parsed = parseAvatarValue(selectedAvatar);
    if (parsed.type === 'dicebear') {
      return { type: 'dicebear', styleId: parsed.value };
    }
    if (parsed.type === 'legacy' && LEGACY_AVATAR_SEEDS.includes(parsed.value || '')) {
      return { type: 'legacy', seed: parsed.value };
    }
    if (parsed.type === 'upload' || parsed.type === 'url') {
      return { type: 'custom', url: parsed.value };
    }
    return { type: 'none' };
  };

  const selectedInfo = player ? getSelectedStyleInfo() : { type: 'none' };

  if (isLoading || isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{error || 'Profil non trouvé'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        {/* Avatar */}
        <div className="relative inline-block">
          <img
            src={getAvatarUrl(selectedAvatar, player.nickname)}
            alt="Avatar"
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-primary"
          />
          <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full min-h-[44px] min-w-[44px]"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choisir un avatar</DialogTitle>
                <DialogDescription>
                  Uploadez votre photo ou choisissez un style d'avatar
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="dicebear" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="dicebear">Styles</TabsTrigger>
                  <TabsTrigger value="classic">Classiques</TabsTrigger>
                  <TabsTrigger value="upload">Photo</TabsTrigger>
                </TabsList>

                {/* DiceBear Styles */}
                <TabsContent value="dicebear" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Choisissez un style. L'avatar sera généré avec votre pseudo.
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {DICEBEAR_STYLES.map((style) => {
                      const isSelected = selectedInfo.type === 'dicebear' && selectedInfo.styleId === style.id;
                      return (
                        <button
                          key={style.id}
                          onClick={() => handleDiceBearStyleSelect(style.id)}
                          disabled={isUploadingAvatar}
                          className={`relative rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <img
                            src={getDiceBearPreviewUrl(style.id, player.nickname)}
                            alt={style.name}
                            className="w-full aspect-square rounded"
                          />
                          <div className="mt-1 text-center">
                            <span className="text-lg">{style.emoji}</span>
                            <p className="text-xs font-medium truncate">{style.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Classic/Legacy Avatars */}
                <TabsContent value="classic" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Avatars prédéfinis classiques
                  </p>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {LEGACY_AVATAR_SEEDS.map((seed) => {
                      const isSelected = selectedInfo.type === 'legacy' && selectedInfo.seed === seed;
                      return (
                        <button
                          key={seed}
                          onClick={() => handleLegacyAvatarSelect(seed)}
                          disabled={isUploadingAvatar}
                          className={`relative rounded-lg border-2 p-1.5 transition-all hover:scale-105 min-h-[48px] ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                              : 'border-transparent hover:border-primary/50'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <img
                            src={getDiceBearPreviewUrl('adventurer', seed)}
                            alt={seed}
                            className="w-full h-full rounded"
                          />
                        </button>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Upload Photo */}
                <TabsContent value="upload" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Uploadez votre propre photo
                  </p>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileUpload}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={isUploadingAvatar}
                    className="w-full min-h-[48px]"
                  >
                    {isUploadingAvatar ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Upload en cours...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-5 w-5" />
                        Choisir une image
                      </>
                    )}
                  </Button>
                  {uploadError && (
                    <p className="text-sm text-destructive">{uploadError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés : JPG, PNG, WebP. Max 5 Mo.
                  </p>
                  {selectedInfo.type === 'custom' && (
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                      <img
                        src={selectedInfo.url || ''}
                        alt="Photo actuelle"
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">Photo actuelle</p>
                        <p className="text-sm text-muted-foreground">
                          Vous utilisez une photo uploadée
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-lg text-muted-foreground">{player.nickname}</p>
        </div>

        {/* Stats button */}
        <Button
          variant="outline"
          onClick={() => router.push(`/player/${player.id}`)}
          className="min-h-[44px]"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Voir mes statistiques
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de contact</CardTitle>
          <CardDescription>
            Modifiez votre téléphone ou email pour vous connecter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Téléphone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          {/* Error/Success messages */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-600 bg-green-500/10 p-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full min-h-[48px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Enregistrer
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Mot de passe
          </CardTitle>
          <CardDescription>
            Modifiez votre mot de passe de connexion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full min-h-[48px]">
                <Lock className="mr-2 h-5 w-5" />
                Changer le mot de passe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Changer le mot de passe</DialogTitle>
                <DialogDescription>
                  Entrez votre mot de passe actuel et le nouveau mot de passe
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-4">
                {/* Current password */}
                <div className="space-y-2">
                  <Label htmlFor="current-password">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="min-h-[44px] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="min-h-[44px] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="min-h-[44px]"
                  />
                </div>

                {/* Error/Success messages */}
                {passwordError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="text-sm text-green-600 bg-green-500/10 p-3 rounded-lg">
                    {passwordSuccess}
                  </div>
                )}

                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full min-h-[48px]"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Modification...
                    </>
                  ) : (
                    'Changer le mot de passe'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
