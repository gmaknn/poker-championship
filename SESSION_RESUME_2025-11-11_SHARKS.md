# Session de Reprise - 11 Novembre 2025
## Correction Graphique Top Sharks

---

## 📋 État Actuel du Projet

### Version et Technologies
- **Next.js**: 16.0.1 avec Turbopack
- **React**: 19.2.0
- **TypeScript**: Mode strict
- **Base de données**: SQLite avec Prisma ORM
- **Serveur de développement**: http://localhost:3003
- **Prisma Studio**: http://localhost:5555

### Dernier Commit
```
d307353 - Fix Top Sharks chart to display eliminations instead of points
```

---

## ✅ Travaux Effectués dans Cette Session

### 1. Correction du Graphique Top Sharks 🦈
**Problème identifié**: Le graphique "Top Sharks" affichait les points des joueurs au lieu du nombre d'éliminations.

**Modifications apportées**:

#### `src/components/exports/SeasonLeaderboardChart.tsx`
- **Interface Player mise à jour**:
  - `totalPoints` → `totalEliminations`
  - Ajout de `leaderKills` et `tournamentsPlayed`
- **Nouveau thème visuel**:
  - Couleurs: Rouge/Orange/Jaune (thème sang/tueurs) au lieu de Jaune/Or
  - Bordures rouges sur les avatars
  - Effet de brillance rouge pour le top 3
- **Titre actualisé**: "🦈 Top Sharks - Les Tueurs"
- **Affichage des statistiques**:
  - ⚔️ Nombre total d'éliminations
  - 👑 Leader kills (bonus pour éliminer le leader)

#### `src/app/dashboard/seasons/[id]/exports/page.tsx`
- **Type `LeaderboardEntry` étendu**:
  - Ajout de `totalEliminations`
  - Ajout de `totalLeaderKills`
  - Ajout de `totalRebuys`
- **Transformation des données**:
  - Tri par kills: `.sort((a, b) => b.totalEliminations - a.totalEliminations)`
  - Passage des bonnes données au composant SeasonLeaderboardChart
- **Interface utilisateur**:
  - Label de l'onglet: "Top Sharks 🦈"
  - Titre de la carte: "🦈 Top Sharks - Les Tueurs"
  - Texte d'aide clarifié pour expliquer le focus sur les "killers"

### 2. Amélioration de la Navigation
**Problème**: Difficulté à accéder aux exports depuis la page des saisons.

**Solution**: Ajout d'un bouton "Voir le classement" sur chaque carte de saison (`src/app/dashboard/seasons/page.tsx`)
- Bouton avec icône `BarChart3`
- Navigation directe vers `/dashboard/seasons/[id]/leaderboard`
- Disponible pour les saisons actives ET archivées

### 3. Nettoyage du Code
**Suppression du bouton WhatsApp inutile** dans `src/components/BlindStructureEditor.tsx`:
- Retrait de l'import `MessageCircle`
- Retrait de l'import `exportBlindStructureText`
- Retrait de la fonction `handleExportWhatsApp`
- Retrait du bouton UI

### 4. Configuration Next.js
**Correction des images DiceBear** dans `next.config.ts`:
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'api.dicebear.com',
      port: '',
      pathname: '/**',
    },
  ],
  dangerouslyAllowSVG: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

---

## 🎯 Prochaines Étapes - Roadmap Complète

### Phase 1: Peaufinage Exports Visuels (2h)
**Priorité**: HAUTE
- [ ] Affiner le design des 3 exports pour correspondre au style souhaité
- [ ] Tester les exports PNG sur différents appareils
- [ ] Vérifier la lisibilité sur WhatsApp/Instagram
- [ ] Optimiser les tailles d'image pour le partage

### Phase 2: Assistant Intelligent Jetons ⭐⭐⭐ (4-5h)
**Objectif**: Faciliter la gestion des jetons pendant le tournoi
- [ ] Calculateur automatique de distribution de jetons
- [ ] Suggestions intelligentes pour les rebuys
- [ ] Aide au change entre joueurs
- [ ] Vérification du total des jetons en circulation

### Phase 3: Badges et Achievements ⭐⭐ (6-8h)
**Objectif**: Gamification pour engager les joueurs
- [ ] Système de badges automatiques:
  - 🦈 "Le Requin" - Plus d'éliminations
  - 🐟 "Le Poisson" - Éliminé en premier souvent
  - 👑 "Roi des Comebacks" - Victoires après rebuy
  - 🎯 "L'Assassin" - Plus de leader kills
  - 💰 "Mr. Consistent" - Top 3 régulier
- [ ] Affichage des badges sur les profils joueurs
- [ ] Page dédiée aux achievements
- [ ] Notifications lors de l'obtention d'un badge

### Phase 4: PWA Hors Ligne ⭐⭐ (8-10h)
**Objectif**: Utilisation sans connexion internet
- [ ] Configuration Service Worker
- [ ] Stratégies de cache pour les données essentielles
- [ ] Synchronisation en arrière-plan
- [ ] Mode offline avec file d'attente
- [ ] Installation PWA sur mobile
- [ ] Icônes et splash screens

### Phase 5: Prédictions Classement ⭐ (5-6h)
**Objectif**: Simulateur pour anticiper l'évolution du classement
- [ ] Calculateur de scénarios:
  - "Et si X gagne le prochain tournoi?"
  - "Combien de points pour rattraper le leader?"
  - "Probabilités de qualification pour le top 3"
- [ ] Visualisation graphique des projections
- [ ] Historique des prédictions vs résultats réels

### Phase 6: Fun Stats Ludiques ⭐ (3-4h)
**Objectif**: Statistiques amusantes et storytelling
- [ ] Le Poisson (éliminé en premier le plus souvent)
- [ ] Le Requin (plus d'éliminations)
- [ ] Le Survivant (dernières places les plus fréquentes)
- [ ] Le Kamikaze (plus de rebuys)
- [ ] L'Intouchable (moins éliminé)
- [ ] Le Tueur de Géants (élimine souvent les leaders)
- [ ] Page dédiée avec cartes animées
- [ ] Export social media de ces stats

### Phase 7: Mode Invité ⭐ (3-4h)
**Objectif**: Permettre des joueurs ponctuels sans profil complet
- [ ] Création rapide de joueur invité
- [ ] Badge "Invité" visible
- [ ] Option de conversion en joueur régulier
- [ ] Statistiques séparées pour les invités
- [ ] Limitation de certaines fonctionnalités

### Phase 8: Avatar Photo Utilisateur ⭐ (2-3h)
**Objectif**: Choix entre avatar système (DiceBear) ou photo personnelle
- [ ] Upload de photo profil
- [ ] Recadrage/redimensionnement automatique
- [ ] Stockage des images (considérer Cloudinary ou S3)
- [ ] Toggle dans les paramètres joueur
- [ ] Fallback sur avatar DiceBear si pas de photo
- [ ] Validation taille/format d'image

---

## 📊 Architecture des Exports Visuels

### Composants d'Export
```
src/components/exports/
├── SeasonLeaderboardChart.tsx          # Top Sharks 🦈 (Kills)
├── SeasonDetailedTable.tsx             # Tableau détaillé (Points/tournoi)
└── SeasonLeaderboardWithEliminations.tsx # Classement + Victimes
```

### APIs des Exports
```
src/app/api/seasons/[id]/
├── leaderboard/route.ts           # Classement général
├── tournament-details/route.ts    # Détails tournoi par tournoi
└── eliminations/route.ts          # Stats d'éliminations
```

### Page d'Export
```
src/app/dashboard/seasons/[id]/exports/page.tsx
```
- 3 onglets pour les 3 types d'export
- Bouton de téléchargement PNG pour chaque export
- Utilise `html-to-image` pour la conversion

---

## 🔧 Informations Techniques Importantes

### Configuration des Images Next.js
```typescript
// next.config.ts
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'api.dicebear.com',
      port: '',
      pathname: '/**',
    },
  ],
  dangerouslyAllowSVG: true,
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
}
```

### Navigation des Exports
1. **Depuis la page Saisons** (`/dashboard/seasons`)
   - Bouton "Voir le classement" sur chaque carte
   - → Redirige vers `/dashboard/seasons/[id]/leaderboard`

2. **Depuis la page Classement** (`/dashboard/seasons/[id]/leaderboard`)
   - Bouton "Exports Visuels" dans l'en-tête
   - → Redirige vers `/dashboard/seasons/[id]/exports`

3. **Page Exports** (`/dashboard/seasons/[id]/exports`)
   - 3 onglets: Top Sharks 🦈, Tableau Détaillé, Avec Éliminations
   - Bouton "Télécharger PNG" pour chaque export

### Données du Graphique Top Sharks
```typescript
// L'API retourne déjà ces champs dans leaderboard
type LeaderboardEntry = {
  totalEliminations: number;    // Nombre total de kills
  totalLeaderKills: number;     // Kills bonus sur le leader
  totalRebuys: number;          // Nombre de rebuys
  performances?: TournamentPerformance[];
  // ... autres champs
};

// Tri par kills pour le graphique Sharks
const chartPlayers = leaderboard
  .sort((a, b) => b.totalEliminations - a.totalEliminations)
  .slice(0, 20);
```

---

## 🎨 Style du Graphique Top Sharks

### Palette de Couleurs
- **Top 1**: Rouge sang (`from-red-500 to-red-700`)
- **Top 2**: Orange (`from-orange-500 to-orange-700`)
- **Top 3**: Jaune (`from-yellow-500 to-yellow-700`)
- **Autres**: Gris (`from-gray-500 to-gray-700`)

### Éléments Visuels
- **Bordures avatars**: Rouge (`border-red-500`)
- **Icône kills**: ⚔️ en rouge (`text-red-400`)
- **Icône leader kills**: 👑 en jaune (`text-yellow-400`)
- **Effet brillance**: Rouge pour le top 3
- **Chapeau cowboy**: 🤠 sur le requin gauche
- **Cravate**: 👔 sur le requin droit

---

## 📝 Données de Test

### Script de Seed Complet
```bash
npx tsx prisma/seed-complete.ts
```

**Contenu**:
- 2 saisons (2024 Active, 2023 Archivée)
- 10 joueurs avec avatars DiceBear
- 8 tournois par saison
- Résultats complets avec éliminations
- Leader kills et rebuys
- Structures de blinds variées

### Accès Prisma Studio
```bash
npx prisma studio --port 5555
```
URL: http://localhost:5555

---

## 🚀 Commandes Utiles

### Développement
```bash
npm run dev              # Démarre le serveur (port 3003)
npx prisma studio        # Ouvre Prisma Studio (port 5555)
npx prisma db push       # Synchronise le schéma avec la DB
```

### Base de données
```bash
npx tsx prisma/seed-complete.ts   # Seed complet
npx prisma migrate reset          # Reset DB (dev uniquement)
```

### Git
```bash
git status              # Voir l'état
git log --oneline -5    # Derniers commits
git diff                # Voir les modifications
```

---

## 🐛 Points d'Attention / Bugs Connus

### Aucun bug critique actuellement
Tous les problèmes identifiés dans la session précédente ont été corrigés.

### Points à surveiller
1. **Performance des exports PNG**: Vérifier que `html-to-image` fonctionne bien avec de grandes images
2. **Avatars DiceBear**: Possibilité de rate limiting si beaucoup de requêtes
3. **Ordre des tournois**: S'assurer que l'ordre est correct dans les tableaux détaillés

---

## 📍 Navigation du Projet

### Pages Principales
- `/dashboard` - Dashboard principal
- `/dashboard/seasons` - Gestion des saisons
- `/dashboard/seasons/[id]/leaderboard` - Classement d'une saison
- `/dashboard/seasons/[id]/exports` - **NOUVEAU** Exports visuels
- `/dashboard/tournaments` - Liste des tournois
- `/dashboard/tournaments/[id]` - Détails d'un tournoi
- `/dashboard/players` - Gestion des joueurs
- `/dashboard/statistics` - Statistiques globales

### Fichiers Clés Modifiés
1. `next.config.ts` - Configuration images
2. `src/app/dashboard/seasons/page.tsx` - Bouton classement
3. `src/components/BlindStructureEditor.tsx` - Suppression WhatsApp
4. `src/components/exports/SeasonLeaderboardChart.tsx` - Graphique Sharks
5. `src/app/dashboard/seasons/[id]/exports/page.tsx` - Page exports
6. `src/app/api/seasons/[id]/eliminations/route.ts` - API éliminations
7. `src/app/api/seasons/[id]/tournament-details/route.ts` - API détails

---

## 💡 Recommandations pour la Prochaine Session

### 1. Tester les Exports
- Générer quelques exports PNG
- Vérifier la qualité sur mobile
- Tester le partage sur WhatsApp

### 2. Prioriser l'Assistant Jetons
C'est la feature la plus demandée (⭐⭐⭐) et apportera le plus de valeur aux utilisateurs pendant les tournois.

### 3. Considérer les Badges
Les badges sont une excellente feature de gamification qui maintiendra l'engagement des joueurs entre les tournois.

### 4. PWA en Arrière-Plan
Le mode hors ligne est important mais peut être travaillé progressivement pendant que d'autres features sont développées.

---

## 📞 Commandes Git pour Reprendre

```bash
# Vérifier l'état actuel
git status
git log --oneline -5

# Créer une nouvelle branche pour une feature
git checkout -b feature/assistant-jetons

# Reprendre le travail
npm run dev
npx prisma studio --port 5555
```

---

## 📅 Historique des Sessions

### Session 1 (10 Nov 2025)
- Mise en place complète du système
- Seed data complet
- Tests de recette

### Session 2 (11 Nov 2025 - Matin)
- Implémentation des 3 exports visuels
- Tests et ajustements

### Session 3 (11 Nov 2025 - Après-midi) ✅
- **Correction du graphique Top Sharks** (kills au lieu de points)
- Amélioration de la navigation (bouton classement)
- Nettoyage du code (suppression WhatsApp)
- Configuration images DiceBear

---

**Document généré le**: 11 Novembre 2025
**Dernier commit**: d307353 - Fix Top Sharks chart to display eliminations instead of points
**Statut**: ✅ Prêt pour la prochaine session

**Prochaine priority suggérée**: Assistant Intelligent Jetons ⭐⭐⭐
