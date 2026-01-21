'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Users, Grid3x3, List, Search, Upload, Loader2, Shield, Eye, Mail, Check, UserCheck, Key, Shuffle, Copy, Phone } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlayerWithStats } from '@/types';
import { ROLES, getRoleLabel, getRoleDescription } from '@/lib/permissions';
import { PlayerRole } from '@prisma/client';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getAvatarUrl as getAvatarUrlHelper,
  getDiceBearPreviewUrl,
  DICEBEAR_STYLES,
  LEGACY_AVATAR_SEEDS,
  createAvatarValue,
  parseAvatarValue,
} from '@/lib/avatar';

// Helper to get avatar URL with nickname fallback
const getAvatarUrl = (avatar: string | null, nickname?: string) => {
  return getAvatarUrlHelper(avatar, nickname || 'Player');
};

export default function PlayersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerWithStats | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<PlayerRole | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    nickname: '',
    email: '',
    phone: '',
    avatar: '' as string | null,
    role: ROLES.PLAYER as PlayerRole,
  });
  const [error, setError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [invitingPlayerId, setInvitingPlayerId] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Activation manuelle
  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [activatingPlayer, setActivatingPlayer] = useState<PlayerWithStats | null>(null);
  const [activatePassword, setActivatePassword] = useState('');
  const [activateConfirmPassword, setActivateConfirmPassword] = useState('');
  const [activateError, setActivateError] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchPlayers();
    loadCurrentUser();
  }, [session]);

  const loadCurrentUser = async () => {
    try {
      // 1. Vérifier la session NextAuth (production)
      if (session?.user?.role) {
        setCurrentUserRole(session.user.role as PlayerRole);
        return;
      }

      // 2. Fallback: cookie player-id (dev mode)
      const cookies = document.cookie;
      const playerIdMatch = cookies.match(/player-id=([^;]+)/);

      if (playerIdMatch) {
        const playerId = playerIdMatch[1];
        const response = await fetch(`/api/players/${playerId}`);
        if (response.ok) {
          const player = await response.json();
          setCurrentUserRole(player.role);
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const isAdmin = () => {
    return currentUserRole === 'ADMIN';
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (player?: PlayerWithStats) => {
    if (player) {
      setEditingPlayer(player);
      setFormData({
        firstName: player.firstName,
        lastName: player.lastName,
        nickname: player.nickname,
        email: player.email || '',
        phone: (player as any).phone || '',
        avatar: player.avatar || null,
        role: (player as any).role || ROLES.PLAYER,
      });
    } else {
      setEditingPlayer(null);
      setFormData({
        firstName: '',
        lastName: '',
        nickname: '',
        email: '',
        phone: '',
        avatar: null,
        role: ROLES.PLAYER,
      });
    }
    setError('');
    setUploadError(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const url = editingPlayer ? `/api/players/${editingPlayer.id}` : '/api/players';
      const method = editingPlayer ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        fetchPlayers();
      } else {
        const data = await response.json();
        setError(data.error || 'Une erreur est survenue');
      }
    } catch (error) {
      setError('Une erreur est survenue');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir archiver ce joueur ?')) return;

    try {
      const response = await fetch(`/api/players/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPlayers();
      }
    } catch (error) {
      console.error('Error deleting player:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editingPlayer) return;

    setIsUploadingAvatar(true);
    setUploadError(null);

    try {
      // Upload avatar image
      const uploadFormData = new FormData();
      uploadFormData.append('avatar', file);

      const uploadResponse = await fetch(`/api/players/${editingPlayer.id}/avatar`, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Upload failed');
      }

      const { avatarUrl } = await uploadResponse.json();

      // Update form data with new avatar URL
      setFormData({ ...formData, avatar: avatarUrl });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setUploadError(error.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarChange = (seed: string) => {
    setFormData({ ...formData, avatar: seed });
  };

  const handleSendInvitation = async (player: PlayerWithStats) => {
    if (!player.email) return;

    setInvitingPlayerId(player.id);
    setInviteSuccess(null);

    try {
      const response = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id }),
      });

      if (response.ok) {
        setInviteSuccess(player.id);
        // Clear success message after 3 seconds
        setTimeout(() => setInviteSuccess(null), 3000);
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de l\'envoi de l\'invitation');
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      alert('Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setInvitingPlayerId(null);
    }
  };

  // Check if player can receive invitation (has email, not yet activated)
  const canInvite = (player: PlayerWithStats) => {
    return player.email && !(player as any).isActivated;
  };

  // Check if player can be manually activated (has email OR phone, not yet activated)
  const canActivate = (player: PlayerWithStats) => {
    const hasContact = player.email || (player as any).phone;
    return hasContact && !(player as any).isActivated;
  };

  const handleOpenActivateDialog = (player: PlayerWithStats) => {
    setActivatingPlayer(player);
    setActivatePassword('');
    setActivateConfirmPassword('');
    setActivateError('');
    setShowPassword(false);
    setCopySuccess(false);
    setIsActivateDialogOpen(true);
  };

  // Génère un mot de passe facile à communiquer oralement
  const generatePassword = () => {
    // Mots simples liés au poker (4-5 lettres)
    const words = [
      'poker', 'cards', 'chips', 'river', 'flush', 'royal',
      'bluff', 'check', 'raise', 'table', 'dealer', 'lucky',
      'ace', 'king', 'queen', 'jack', 'spade', 'heart',
      'club', 'diamond', 'flop', 'turn', 'blind', 'stack'
    ];
    // Chiffres faciles (évite 0, 1 qui ressemblent à O, l)
    const digits = '23456789';

    // Choisir un mot aléatoire
    const word = words[Math.floor(Math.random() * words.length)];
    // Générer 4 chiffres aléatoires
    let numbers = '';
    for (let i = 0; i < 4; i++) {
      numbers += digits[Math.floor(Math.random() * digits.length)];
    }

    // Capitaliser la première lettre du mot
    const password = word.charAt(0).toUpperCase() + word.slice(1) + numbers;

    setActivatePassword(password);
    setActivateConfirmPassword(password);
    setShowPassword(true);
    setCopySuccess(false);
  };

  // Copier le mot de passe dans le presse-papier
  const copyPassword = async () => {
    if (!activatePassword) return;

    try {
      await navigator.clipboard.writeText(activatePassword);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleActivatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activatingPlayer) return;

    // Validation
    if (activatePassword.length < 8) {
      setActivateError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (activatePassword !== activateConfirmPassword) {
      setActivateError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsActivating(true);
    setActivateError('');

    try {
      const response = await fetch(`/api/players/${activatingPlayer.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: activatePassword }),
      });

      if (response.ok) {
        setIsActivateDialogOpen(false);
        fetchPlayers();
        alert(`Compte activé avec succès pour ${activatingPlayer.firstName} ${activatingPlayer.lastName}.\n\nVous pouvez maintenant lui communiquer le mot de passe.`);
      } else {
        const data = await response.json();
        setActivateError(data.error || 'Erreur lors de l\'activation');
      }
    } catch (err) {
      console.error('Error activating player:', err);
      setActivateError('Erreur lors de l\'activation');
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  // Filtrer les joueurs par recherche
  const filteredPlayers = players.filter((player) => {
    const query = searchQuery.toLowerCase();
    return (
      player.firstName.toLowerCase().includes(query) ||
      player.lastName.toLowerCase().includes(query) ||
      player.nickname.toLowerCase().includes(query) ||
      (player.email && player.email.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Joueurs"
        description={isAdmin() ? 'Gérez les joueurs du championnat' : 'Consultez la liste des joueurs'}
        icon={<Users className="h-10 w-10 text-primary" />}
        actions={
          <div className="flex items-center gap-3">
            <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
              <ToggleGroupItem value="grid" aria-label="Vue grille">
                <Grid3x3 className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="Vue liste">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            {isAdmin() && (
              <Button onClick={() => handleOpenDialog()} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Ajouter un joueur
              </Button>
            )}
          </div>
        }
      />

      {/* Barre de recherche */}
      {players.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un joueur (nom, prénom, pseudo, email)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filteredPlayers.length === 0 && players.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun joueur trouvé</h3>
            <p className="text-muted-foreground">
              Aucun joueur ne correspond à votre recherche "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      ) : players.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun joueur</h3>
            <p className="text-muted-foreground mb-4">
              {isAdmin() ? 'Commencez par ajouter votre premier joueur' : 'Aucun joueur n\'est enregistré pour le moment'}
            </p>
            {isAdmin() && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un joueur
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="bg-muted/20 rounded-lg p-6 border-2 border-border">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Liste des Joueurs ({filteredPlayers.length}{searchQuery && ` sur ${players.length}`})
          </h2>

          {/* Vue Grille */}
          {viewMode === 'grid' && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlayers.map((player) => (
                <Card key={player.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={getAvatarUrl(player.avatar, player.nickname)}
                        alt={player.nickname}
                        className="w-12 h-12 rounded-full"
                      />
                      <CardTitle className="text-lg font-semibold">
                        {player.nickname}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/dashboard/players/${player.id}`)}
                        title="Voir la fiche"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin() && (
                        <>
                          {canActivate(player) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenActivateDialog(player)}
                              title="Activer manuellement"
                              className="text-emerald-500 hover:text-emerald-600"
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {canInvite(player) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSendInvitation(player)}
                              disabled={invitingPlayerId === player.id}
                              title="Envoyer invitation par email"
                              className={inviteSuccess === player.id ? 'text-green-500' : ''}
                            >
                              {invitingPlayerId === player.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : inviteSuccess === player.id ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Mail className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(player)}
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(player.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {player.firstName} {player.lastName}
                      </p>
                      {player.email && (
                        <p className="text-sm text-muted-foreground">{player.email}</p>
                      )}
                      <div className="flex gap-4 pt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Tournois: </span>
                          <span className="font-medium">
                            {player._count?.tournamentPlayers || 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Élims: </span>
                          <span className="font-medium">
                            {player._count?.eliminations || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Vue Liste */}
          {viewMode === 'list' && (
            <div className="space-y-2">
              {filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={getAvatarUrl(player.avatar, player.nickname)}
                      alt={player.nickname}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{player.nickname}</h3>
                        <span className="text-sm text-muted-foreground">
                          {player.firstName} {player.lastName}
                        </span>
                      </div>
                      {player.email && (
                        <p className="text-sm text-muted-foreground">{player.email}</p>
                      )}
                    </div>
                    <div className="flex gap-8 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-lg">
                          {player._count?.tournamentPlayers || 0}
                        </div>
                        <div className="text-muted-foreground">Tournois</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg">
                          {player._count?.eliminations || 0}
                        </div>
                        <div className="text-muted-foreground">Éliminations</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/dashboard/players/${player.id}`)}
                      title="Voir la fiche"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin() && (
                      <>
                        {canActivate(player) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenActivateDialog(player)}
                            title="Activer manuellement"
                            className="text-emerald-500 hover:text-emerald-600"
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        {canInvite(player) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendInvitation(player)}
                            disabled={invitingPlayerId === player.id}
                            title="Envoyer invitation par email"
                            className={inviteSuccess === player.id ? 'text-green-500' : ''}
                          >
                            {invitingPlayerId === player.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : inviteSuccess === player.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(player)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(player.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPlayer ? 'Modifier le joueur' : 'Ajouter un joueur'}
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations du joueur
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Avatar section */}
              <div className="space-y-4 pb-4 border-b">
                <label className="text-sm font-medium">Avatar (optionnel)</label>
                <div className="flex items-center gap-4 mb-4">
                  {/* Current avatar preview */}
                  <img
                    src={getAvatarUrl(formData.avatar, formData.nickname || 'Player')}
                    alt="Avatar"
                    className="w-16 h-16 rounded-full border-2 border-border"
                  />
                  <div className="text-sm text-muted-foreground">
                    {formData.nickname ? `Preview avec "${formData.nickname}"` : 'Preview'}
                  </div>
                </div>

                <Tabs defaultValue="styles" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="styles">Styles</TabsTrigger>
                    <TabsTrigger value="classic">Classiques</TabsTrigger>
                    <TabsTrigger value="upload">Photo</TabsTrigger>
                  </TabsList>

                  {/* DiceBear Styles */}
                  <TabsContent value="styles" className="space-y-2">
                    <p className="text-xs text-muted-foreground">Styles générés avec le pseudo</p>
                    <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                      {DICEBEAR_STYLES.map((style) => {
                        const parsed = parseAvatarValue(formData.avatar);
                        const isSelected = parsed.type === 'dicebear' && parsed.value === style.id;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, avatar: createAvatarValue('dicebear', style.id) })}
                            disabled={isUploadingAvatar}
                            className={`relative rounded-lg border p-1.5 transition-all hover:scale-105 ${
                              isSelected
                                ? 'border-primary bg-primary/10 ring-2 ring-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                <Check className="h-2 w-2" />
                              </div>
                            )}
                            <img
                              src={getDiceBearPreviewUrl(style.id, formData.nickname || 'Player')}
                              alt={style.name}
                              className="w-full aspect-square rounded"
                            />
                            <p className="text-[10px] text-center mt-0.5 truncate">{style.emoji} {style.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* Classic/Legacy Avatars */}
                  <TabsContent value="classic" className="space-y-2">
                    <p className="text-xs text-muted-foreground">Avatars prédéfinis</p>
                    <div className="grid grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                      {LEGACY_AVATAR_SEEDS.map((seed) => {
                        const parsed = parseAvatarValue(formData.avatar);
                        const isSelected = parsed.type === 'legacy' && parsed.value === seed;
                        return (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => setFormData({ ...formData, avatar: seed })}
                            disabled={isUploadingAvatar}
                            className={`relative rounded-lg border p-1 transition-all hover:scale-105 ${
                              isSelected
                                ? 'border-primary bg-primary/10 ring-2 ring-primary'
                                : 'border-transparent hover:border-primary/50'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                <Check className="h-2 w-2" />
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
                  <TabsContent value="upload" className="space-y-2">
                    {editingPlayer ? (
                      <>
                        <input
                          type="file"
                          id="avatar-upload"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleFileUpload}
                          disabled={isUploadingAvatar}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                          disabled={isUploadingAvatar}
                          className="w-full"
                        >
                          {isUploadingAvatar ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Uploader une photo
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Formats: JPG, PNG, WebP. Max 5 Mo.
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        L'upload de photo est disponible après la création du joueur.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>

                {uploadError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {uploadError}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium">
                  Prénom
                </label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium">
                  Nom
                </label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="nickname" className="text-sm font-medium">
                  Pseudo
                </label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) =>
                    setFormData({ ...formData, nickname: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Téléphone
                </label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="06 12 34 56 78"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email (optionnel)
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rôle
                </label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as PlayerRole })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ROLES).map((role) => (
                      <SelectItem key={role} value={role}>
                        <div>
                          <div className="font-medium">{getRoleLabel(role)}</div>
                          <div className="text-xs text-muted-foreground">
                            {getRoleDescription(role)}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && (
              <div className="text-sm text-destructive mb-4">{error}</div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingPlayer ? 'Modifier' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modale d'activation manuelle */}
      <Dialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              Activer le compte joueur
            </DialogTitle>
            <DialogDescription>
              Définissez un mot de passe temporaire pour activer ce compte.
              Vous devrez ensuite communiquer ce mot de passe au joueur.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleActivatePlayer}>
            <div className="space-y-4 py-4">
              {/* Info joueur */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatarUrl(activatingPlayer?.avatar || null, activatingPlayer?.nickname || 'Player')}
                    alt={activatingPlayer?.nickname}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">
                      {activatingPlayer?.firstName} {activatingPlayer?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{activatingPlayer?.nickname}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-mono">{activatingPlayer?.email}</span>
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="activate-password" className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Mot de passe temporaire
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generatePassword}
                    disabled={isActivating}
                    className="h-7 text-xs"
                  >
                    <Shuffle className="mr-1 h-3 w-3" />
                    Générer
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="activate-password"
                    type={showPassword ? 'text' : 'password'}
                    value={activatePassword}
                    onChange={(e) => {
                      setActivatePassword(e.target.value);
                      setShowPassword(false);
                    }}
                    placeholder="Minimum 8 caractères"
                    required
                    minLength={8}
                    disabled={isActivating}
                    className={showPassword ? 'font-mono text-lg tracking-wider' : ''}
                  />
                  {showPassword && activatePassword && (
                    <Button
                      type="button"
                      variant={copySuccess ? 'default' : 'outline'}
                      size="icon"
                      onClick={copyPassword}
                      disabled={isActivating}
                      className={copySuccess ? 'bg-green-600 hover:bg-green-700' : ''}
                      title="Copier le mot de passe"
                    >
                      {copySuccess ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {showPassword && activatePassword && (
                  <p className="text-xs text-muted-foreground">
                    {copySuccess ? (
                      <span className="text-green-600 font-medium">Mot de passe copié !</span>
                    ) : (
                      'Cliquez sur le bouton copier ou notez ce mot de passe'
                    )}
                  </p>
                )}
              </div>

              {/* Confirmation - masqué si mot de passe généré */}
              {!showPassword && (
                <div className="space-y-2">
                  <label htmlFor="activate-confirm" className="text-sm font-medium">
                    Confirmer le mot de passe
                  </label>
                  <Input
                    id="activate-confirm"
                    type="password"
                    value={activateConfirmPassword}
                    onChange={(e) => setActivateConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                    disabled={isActivating}
                  />
                </div>
              )}

              {activateError && (
                <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {activateError}
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-amber-500/10 text-amber-600 p-3 rounded">
                <strong>Important:</strong> Après activation, communiquez le mot de passe au joueur
                par un moyen sécurisé (SMS, WhatsApp, en personne...).
                Le joueur pourra ensuite se connecter sur <span className="font-mono">/player/login</span>.
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsActivateDialogOpen(false)}
                disabled={isActivating}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isActivating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activation...
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Activer le compte
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
