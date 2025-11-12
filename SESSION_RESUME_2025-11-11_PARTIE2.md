# Session de développement - 2025-11-11 (PARTIE 2)

## 🎯 Nouvelles fonctionnalités demandées

### ✅ COMPLÉTÉES

#### 1. Mode liste/grille pour la page Joueurs
**Fichier modifié**: `src/app/dashboard/players/page.tsx`

**Implémentation**:
- Toggle Group avec icônes Grid3x3 / List
- État `viewMode: 'grid' | 'list'`
- Vue grille: Cards 3 colonnes (inchangée, existante)
- Vue liste: Lignes horizontales avec avatar, nom, stats, actions
- Transition smooth avec hover effects

**Composants ajoutés**:
- `ToggleGroup` / `ToggleGroupItem` de shadcn/ui
- Icônes: `Grid3x3`, `List` de lucide-react

**Features vue liste**:
- Avatar 48x48px
- Pseudo + nom complet sur même ligne
- Email si présent
- Stats (tournois, éliminations) en colonnes
- Boutons éditer/supprimer

---

#### 2. Mode liste/grille pour la page Tournois
**Fichier modifié**: `src/app/dashboard/tournaments/page.tsx`

**Implémentation**:
- Toggle Group identique à Joueurs
- État `viewMode: 'grid' | 'list'`
- Vue grille: Cards 3 colonnes (existante)
- Vue liste: Lignes avec toutes les infos inline

**Features vue liste**:
- Nom + badge status
- Saison + année
- Date formatée (d MMMM yyyy 'à' HH'h'mm)
- Nombre de joueurs avec icône
- Buy-in + jetons de départ
- Boutons: Détails, Éditer, Supprimer (disabled si FINISHED ou joueurs inscrits)

**Layout vue liste**:
```
[Nom + Status Badge] | [Date] [Joueurs] [Buy-in/Jetons] | [Actions]
        ↓                    ↓
    Saison info         Infos tournoi inline
```

---

### ⏳ EN ATTENTE (à implémenter)

#### 3. Système d'envoi email pour accès plateforme
**Objectif**: Envoyer un email à un joueur pour qu'il accède à la plateforme

**Workflow proposé**:
1. Bouton dans la liste des joueurs : "Envoyer accès"
2. Génération d'un lien unique temporaire (token JWT)
3. Email contenant :
   - Lien vers `/player/[playerId]?token=xxx`
   - Instructions d'accès
   - Expiration du lien (24h ou 7 jours ?)

**Technologies suggérées**:
- Nodemailer (serveur SMTP)
- Resend.com (service email moderne, gratuit jusqu'à 3000/mois)
- React Email (templates email avec React)

**Base de données** :
```prisma
model PlayerAccessToken {
  id        String   @id @default(cuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
}
```

**Template email** :
```
Bonjour {firstName},

Vous avez accès au dashboard du WPT VILLELAURE Poker Championship !

Cliquez sur le lien ci-dessous pour accéder à vos statistiques :
{lien avec token}

Ce lien est valide pendant 7 jours.

À bientôt aux tables !
```

---

#### 4. Interface création contenu groupe WhatsApp (rôle 'animateur')
**Objectif**: Créer une interface pour générer du contenu à partager sur WhatsApp

**Nouveau rôle utilisateur**: `ANIMATOR`
```prisma
enum UserRole {
  ADMIN
  ANIMATOR  // Nouveau
  VIEWER
}

model User {
  role UserRole @default(VIEWER)
}
```

**Page dédiée**: `/dashboard/whatsapp-content`

**Fonctionnalités**:
1. **Génération classement TOP 10** (image optimisée WhatsApp)
   - Template visuel attractif
   - Logo du club
   - TOP 10 avec avatars
   - Export PNG 1080x1920 (format mobile)

2. **Annonce prochain tournoi**
   - Date, heure, lieu
   - Buy-in, jetons de départ
   - Lien d'inscription
   - Call-to-action

3. **Résultats tournoi**
   - Podium avec photos
   - Nombre de joueurs
   - Highlights (records, éliminations)

4. **Fun Facts / Stats hebdo**
   - "Le Poisson de la semaine"
   - "Le Requin de la semaine"
   - Records battus

**UI proposée**:
```
┌─────────────────────────────────────┐
│  Contenu WhatsApp                    │
│                                      │
│  [Classement]  [Tournoi]  [Résultat]│
│                                      │
│  Template : [Dropdown]               │
│  Personnaliser : [...]               │
│                                      │
│  [Aperçu]                            │
│  ┌──────────────┐                    │
│  │   Image      │                    │
│  │   générée    │                    │
│  └──────────────┘                    │
│                                      │
│  [Télécharger PNG] [Copier texte]   │
└─────────────────────────────────────┘
```

**Technologies**:
- html2canvas pour génération image
- Templates React avec styles inline
- Download automatique ou copie clipboard

---

#### 5. Gestion jeux de jetons dans Paramètres
**Objectif**: Créer et gérer plusieurs sets de jetons, définir un par défaut

**Localisation**: `/dashboard/settings` - Nouvel onglet "Jeux de jetons"

**Modèle Prisma existant**: `ChipDenomination`
- Déjà présent mais peu utilisé
- Champ `isDefault` existe déjà
- Champ `tournamentId` permet association spécifique

**Fonctionnalités à ajouter**:

1. **Liste des jeux de jetons**
```
┌──────────────────────────────────────────┐
│ Jeux de jetons                            │
│                                           │
│ ┌─ Jeu par défaut ──────────────────┐    │
│ │ ⭐ Set Standard                    │    │
│ │ 10, 25, 50, 100, 500, 1000, 5000  │    │
│ │ [Éditer] [Supprimer]               │    │
│ └────────────────────────────────────┘    │
│                                           │
│ ┌─ Set Anniversaire ────────────────┐    │
│ │ 5, 10, 25, 100, 500, 1000          │    │
│ │ [Définir par défaut] [Éditer]      │    │
│ └────────────────────────────────────┘    │
│                                           │
│ [+ Créer nouveau jeu de jetons]           │
└──────────────────────────────────────────┘
```

2. **Création / Édition**
```
Dialog:
- Nom du jeu
- Liste des valeurs (input dynamique)
  [10] [×]
  [25] [×]
  [50] [×]
  [+ Ajouter valeur]
- Couleurs optionnelles par valeur
- Quantité disponible par valeur
```

3. **Utilisation dans tournoi**
- Lors de création tournoi : dropdown "Jeu de jetons"
- Par défaut : le jeu marqué `isDefault`
- Possibilité de personnaliser pour un tournoi spécifique

**API à créer**:
- `GET /api/chip-sets` - Liste tous les jeux
- `POST /api/chip-sets` - Créer un jeu
- `PATCH /api/chip-sets/[id]` - Modifier
- `DELETE /api/chip-sets/[id]` - Supprimer
- `POST /api/chip-sets/[id]/set-default` - Définir par défaut

**Migration données**:
- Regrouper les ChipDenomination existantes par `tournamentId`
- Créer un ChipSet "Par défaut" avec les jetons sans tournamentId
- Associer les tournois à leurs ChipSets

**Nouveau modèle Prisma** (optionnel, ou réutiliser ChipDenomination):
```prisma
model ChipSet {
  id          String   @id @default(cuid())
  name        String
  isDefault   Boolean  @default(false)
  chips       ChipDenomination[]
  tournaments Tournament[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Modifier ChipDenomination
model ChipDenomination {
  chipSetId   String?
  chipSet     ChipSet? @relation(fields: [chipSetId], references: [id])
  // ... reste inchangé
}
```

---

## 📊 Estimation temps développement

| Fonctionnalité | Temps estimé | Complexité |
|----------------|--------------|------------|
| ✅ Mode liste/grille Joueurs | 20 min | Faible |
| ✅ Mode liste/grille Tournois | 20 min | Faible |
| Système email accès | 2-3h | Moyenne |
| Interface WhatsApp | 3-4h | Moyenne-Élevée |
| Gestion jeux jetons | 2-3h | Moyenne |

**Total estimé**: 7-10 heures

---

## 🎨 Améliorations UX des modes liste/grille

### Points forts
- Basculement instantané entre vues
- Icônes claires et universelles
- Préservation de toutes les infos dans les deux vues
- Hover effects cohérents
- Responsive (vue liste s'adapte sur mobile)

### Possibles améliorations futures
- Sauvegarder la préférence utilisateur (localStorage)
- Ajouter tri/filtres (par date, status, etc.)
- Mode "compact" pour encore plus de densité
- Export CSV/Excel depuis vue liste

---

## 🔄 État global du projet après cette session

### Fonctionnalités opérationnelles
- ✅ CRUD Joueurs + avatars + modes vue
- ✅ CRUD Tournois + modes vue
- ✅ Timer intelligent (limité au dernier niveau)
- ✅ Statistiques complètes avec graphiques
- ✅ Paramètres éditables
- ✅ Podium sur fiches tournoi
- ✅ Classement avec avatars
- ✅ Dashboard joueur complet
- ✅ Vue TV optimisée

### Fonctionnalités à développer
- ⏳ Système email accès joueurs
- ⏳ Interface contenu WhatsApp (rôle animateur)
- ⏳ Gestion jeux de jetons
- ⏳ Export multi-format (PDF, images)
- ⏳ PWA mode hors ligne
- ⏳ Badges et achievements
- ⏳ Prédictions classement
- ⏳ Fun Stats ludiques

### Priorisation recommandée
1. **Gestion jeux de jetons** (utile pour assistant répartition)
2. **Export multi-format** (demandé dans cahier des charges)
3. **Système email** (sécurise accès joueurs)
4. **Interface WhatsApp** (communication avec joueurs)
5. **PWA** (utilisation mobile/offline)
6. **Badges** (gamification)

---

## 💡 Suggestions techniques

### Pour système email
**Option 1 - Resend.com** (recommandé)
- API simple
- Free tier : 3000 emails/mois
- Templates React Email
- Delivery rapide

**Option 2 - Nodemailer + SMTP**
- Gratuit
- Nécessite serveur SMTP (Gmail, SendGrid, etc.)
- Plus complexe à configurer

**Option 3 - SendGrid**
- API complète
- Free tier : 100 emails/jour
- Templates + analytics

### Pour génération images WhatsApp
**html2canvas** :
```typescript
import html2canvas from 'html2canvas';

const generateWhatsAppImage = async (elementRef: HTMLElement) => {
  const canvas = await html2canvas(elementRef, {
    scale: 2, // Qualité HD
    width: 1080,
    height: 1920,
    backgroundColor: '#1a1a1a'
  });

  const blob = await canvas.toBlob();
  // Download ou share
};
```

### Pour gestion jetons
**Structure recommandée**:
```typescript
interface ChipSet {
  id: string;
  name: string;
  isDefault: boolean;
  chips: Array<{
    value: number;
    color: string;
    colorSecondary?: string;
    quantity?: number;
  }>;
}

// Utilisation
<select name="chipSetId">
  {chipSets.map(set => (
    <option value={set.id}>
      {set.name} {set.isDefault && '⭐'}
    </option>
  ))}
</select>
```

---

## 🚀 Prochaines actions

### Immédiat
1. Tester les modes liste/grille sur les deux pages
2. Vérifier responsive mobile
3. Choisir priorité parmi les 3 fonctionnalités restantes

### Court terme (cette semaine)
1. Implémenter gestion jeux de jetons
2. Créer système email accès
3. Débuter interface WhatsApp

### Moyen terme (semaine prochaine)
1. Finaliser exports PDF/images
2. Configurer PWA
3. Ajouter badges et achievements

---

**Session terminée le : 2025-11-11**
**Durée partie 2 : ~45 min**
**Fichiers modifiés : 2**
**Lignes ajoutées : ~200**
**Status : 🟢 Excellent - Modes liste/grille opérationnels**

**Prochain focus recommandé : Gestion jeux de jetons**
