# Session de développement - 2025-11-10

## Contexte
Projet: Poker Championship Management System (WPT VILLELAURE)
Stack: Next.js 16.0.1, React 19.2.0, Prisma (SQLite), TypeScript, Tailwind CSS v4

## Modifications effectuées durant cette session

### 1. Système d'avatars pour les joueurs
**Fichier modifié**: `src/app/player/[playerId]/page.tsx`

**Implémentation**:
- Intégration de **DiceBear API** (style "adventurer") pour les avatars
- 24 seeds prédéfinis avec thème poker: Ace, King, Queen, Jack, Diamond, Spade, Chip, Bluff, River, Flop, Turn, etc.
- URL des avatars: `https://api.dicebear.com/7.x/adventurer/svg?seed={seedName}`
- Interface de sélection avec Dialog contenant une grille 6x4 d'avatars
- Avatar affiché en grand (132x132px) dans le header du dashboard joueur
- Bouton Edit pour ouvrir la dialog de sélection
- Fallback avec icône Users si pas d'avatar

**Problème résolu**: L'API `/api/players/[id]` requiert tous les champs obligatoires (firstName, lastName, nickname) via validation Zod. La fonction `handleAvatarChange` a été corrigée pour envoyer toutes les données du joueur en plus de l'avatar.

### 2. Modifications UI du tournoi
**Fichier modifié**: `src/app/dashboard/tournaments/[id]/page.tsx`

**Changement**: Tab "Configuration" renommé en "Jetons" (ligne 199)

### 3. Amélioration de la sauvegarde des blinds
**Fichier modifié**: `src/components/BlindStructureEditor.tsx`

**Améliorations**:
- Ajout d'un **message de succès vert** qui s'affiche 3 secondes après sauvegarde
- Meilleure gestion des erreurs avec logs console
- État `successMessage` pour afficher le feedback

### 4. Problème de timer résolu
**Tournoi ID**: `cmht6u7pi0000wse4cnv06z37`

**Diagnostic**:
- Le timer était au niveau 16 alors que la structure n'a que 10-12 niveaux
- `currentLevelData` était null, empêchant l'affichage de l'interface
- Le timer avait tourné pendant plusieurs heures

**Solution**: Réinitialisation via API
```bash
curl -X POST http://localhost:3003/api/tournaments/cmht6u7pi0000wse4cnv06z37/timer/reset
```

## État actuel du système

### Fonctionnalités complètes
✅ Gestion des saisons avec scoring personnalisable
✅ Création et gestion des tournois (Championship/Casual)
✅ Inscription des joueurs avec paiement
✅ Génération automatique de structures de blinds (Turbo/Standard/Deep)
✅ Timer de tournoi avec annonces audio et countdown
✅ Gestion des éliminations avec tracking leader kills
✅ Distribution automatique des tables
✅ Calcul automatique des points et classements
✅ Vue TV pour affichage public (niveau actuel, prochain niveau, timer, average stack, joueurs restants, horloge)
✅ Dashboard joueur avec statistiques (victoires, podiums, némésis, victime favorite)
✅ **Nouveau**: Sélection d'avatars pour les joueurs (DiceBear)
✅ Leaderboard de la saison active
✅ Gestion des jetons (ChipManager)

### Fonctionnalités en placeholder
⚠️ Page Statistiques (`/dashboard/statistics`) - UI en place, pas de données
⚠️ Page Paramètres (`/dashboard/settings`) - UI en place, champs disabled

### Configuration par défaut
- Buy-in: 10€
- Jetons de départ: 5000
- Antes: désactivés par défaut (niveau 999)
- Type de tournoi par défaut: CHAMPIONSHIP

### Enum importants
```typescript
enum TournamentStatus {
  PLANNED
  REGISTRATION
  IN_PROGRESS
  FINISHED      // ⚠️ Bien utiliser FINISHED et non COMPLETED
  CANCELLED
}

enum TournamentType {
  CHAMPIONSHIP
  CASUAL
}
```

## Points d'attention pour la prochaine session

### 1. Timer - Gestion de fin de structure
**Problème potentiel**: Si le timer dépasse le dernier niveau de blinds, `currentLevelData` devient null.

**Solutions possibles**:
- Ajouter une vérification dans `src/app/api/tournaments/[id]/timer/route.ts` pour limiter `calculatedLevel` au dernier niveau disponible
- Afficher un message spécifique quand tous les niveaux sont terminés
- Option: passer le tournoi en status FINISHED automatiquement

### 2. Validation des données
L'API `/api/players/[id]` utilise Zod avec validation stricte:
```typescript
const playerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  avatar: z.string().optional(),
});
```
Toujours envoyer tous les champs obligatoires lors d'un PATCH.

### 3. Structure du projet
```
src/
├── app/
│   ├── api/                    # Routes API
│   │   ├── players/[id]/
│   │   │   ├── route.ts        # GET/PATCH/DELETE player
│   │   │   └── dashboard/      # GET player stats
│   │   ├── tournaments/[id]/
│   │   │   ├── blinds/         # Structure de blinds
│   │   │   ├── timer/          # Timer endpoints
│   │   │   ├── chips/          # Chip management
│   │   │   └── ...
│   │   └── seasons/[id]/
│   │       └── leaderboard/    # Classement saison
│   ├── dashboard/              # Pages admin
│   ├── player/                 # Dashboard joueur
│   └── tv/                     # Vue publique TV
├── components/
│   ├── ui/                     # Composants shadcn/ui
│   ├── BlindStructureEditor.tsx
│   ├── TournamentTimer.tsx
│   ├── ChipManager.tsx
│   └── ...
└── lib/
    ├── prisma.ts
    ├── blindGenerator.ts       # Génération automatique des blinds
    └── audioManager.ts         # Sons du timer
```

### 4. Branding
Texte officiel: **WPT VILLELAURE Poker Championship**
- Sidebar: "WPT VILLELAURE" + "Poker Championship"
- Éviter "Le Cyclope" (ancien nom)

## Commandes utiles

### Démarrage
```bash
npm run dev          # Port 3003
npx kill-port 3003   # Si le port est bloqué
```

### Base de données
```bash
npx prisma studio                    # Interface admin
npx prisma db push                   # Appliquer le schéma
npx prisma generate                  # Regénérer le client
```

### Réinitialiser un timer
```bash
curl -X POST http://localhost:3003/api/tournaments/{id}/timer/reset
```

## Bugs connus et solutions

### Timer bloqué avec "Veuillez configurer la structure des blinds"
**Cause**: Le timer est à un niveau supérieur au nombre de niveaux dans la structure
**Solution**: Réinitialiser le timer via API ou bouton (si visible)

### Erreur 400 sur PATCH player
**Cause**: Champs obligatoires manquants dans la requête
**Solution**: Toujours inclure firstName, lastName, nickname même si on ne modifie que l'avatar

### HMR warnings "Missing Description"
**Cause**: Dialog sans DialogDescription
**Solution**: Ajouter `<DialogDescription>` ou `aria-describedby` aux DialogContent

## URLs importantes
- Dashboard: http://localhost:3003/dashboard
- Joueurs: http://localhost:3003/dashboard/players
- Tournois: http://localhost:3003/dashboard/tournaments
- Sélection joueur: http://localhost:3003/player
- Vue TV: http://localhost:3003/tv/[tournamentId]
- Classement: http://localhost:3003/dashboard/leaderboard

## Prochaines fonctionnalités suggérées
- Implémenter vraiment la page Statistiques avec graphiques
- Implémenter vraiment la page Paramètres avec édition
- Améliorer la gestion de fin de tournoi (auto-finish quand tous les niveaux sont passés)
- Export des données (CSV/Excel)
- Historique des actions pour audit
- Système de notifications/rappels
- Afficher les avatars dans plus d'endroits (leaderboard, listes de joueurs, etc.)

## Notes techniques
- Next.js 16 avec Turbopack (mode dev rapide)
- React 19.2.0 avec nouveaux hooks
- Prisma avec SQLite (dev.db)
- Tailwind CSS v4 avec thème dark/light
- Format de date: date-fns avec locale fr
- API RESTful avec validation Zod
