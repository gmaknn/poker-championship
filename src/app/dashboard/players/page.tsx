'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Users, Grid3x3, List, Search, Upload, Loader2, Shield, Eye } from 'lucide-react';
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

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Whiskers', 'Salem', 'Misty', 'Shadow',
  'Lucky', 'Ace', 'King', 'Queen', 'Jack', 'Joker',
  'Diamond', 'Spade', 'Heart', 'Club', 'Chip', 'Bluff',
  'River', 'Flop', 'Turn', 'Poker', 'Royal', 'Flush',
];

const getAvatarUrl = (avatar: string | null) => {
  if (!avatar) return null;
  // If avatar starts with /, it's an uploaded image
  if (avatar.startsWith('/')) {
    return avatar;
  }
  // Otherwise it's a DiceBear seed
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatar)}`;
};

export default function PlayersPage() {
  const router = useRouter();
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
    avatar: '' as string | null,
    role: ROLES.PLAYER as PlayerRole,
  });
  const [error, setError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
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
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border-2 border-border">
        <div>
          <h1 className="text-4xl font-bold">Joueurs</h1>
          <p className="text-muted-foreground mt-1 text-base">
            {isAdmin() ? 'Gérez les joueurs du championnat' : 'Consultez la liste des joueurs'}
          </p>
        </div>
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
      </div>

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
                      {player.avatar && getAvatarUrl(player.avatar) ? (
                        <img
                          src={getAvatarUrl(player.avatar)!}
                          alt={player.nickname}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <CardTitle className="text-lg font-semibold">
                        {player.nickname}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push(`/player/${player.id}`)}
                        title="Voir la fiche"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin() && (
                        <>
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
                    {player.avatar && getAvatarUrl(player.avatar) ? (
                      <img
                        src={getAvatarUrl(player.avatar)!}
                        alt={player.nickname}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
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
                      onClick={() => router.push(`/player/${player.id}`)}
                      title="Voir la fiche"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin() && (
                      <>
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
                <div className="flex items-center gap-4">
                  {/* Current avatar preview */}
                  {formData.avatar && getAvatarUrl(formData.avatar) ? (
                    <img
                      src={getAvatarUrl(formData.avatar)!}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full border-2 border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-border bg-muted flex items-center justify-center">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {/* Upload button */}
                  {editingPlayer && (
                    <div className="flex-1">
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
                        size="sm"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={isUploadingAvatar}
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Upload...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Uploader
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                {uploadError && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {uploadError}
                  </div>
                )}
                {/* Predefined avatars */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Choisir un avatar prédéfini:</p>
                  <div className="grid grid-cols-8 gap-2">
                    {AVATAR_SEEDS.slice(0, 16).map((seed) => (
                      <button
                        key={seed}
                        type="button"
                        onClick={() => handleAvatarChange(seed)}
                        disabled={isUploadingAvatar}
                        className={`relative rounded-lg border p-1 transition-all hover:scale-105 ${
                          formData.avatar === seed
                            ? 'border-primary bg-primary/10'
                            : 'border-transparent hover:border-primary/50'
                        } ${isUploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <img
                          src={getAvatarUrl(seed)!}
                          alt={seed}
                          className="w-full h-full rounded"
                        />
                      </button>
                    ))}
                  </div>
                </div>
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
                <label htmlFor="email" className="text-sm font-medium">
                  Email (optionnel)
                </label>
                <Input
                  id="email"
                  type="email"
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
    </div>
  );
}
