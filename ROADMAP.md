# 🗺️ ROADMAP - Poker Championship Management System

**Projet** : Système de gestion de championnat de poker
**Dernière mise à jour** : 10 novembre 2025
**Version actuelle** : v1.0 (Phase 1 MVP - 90% complète)

---

## 📊 ÉTAT GLOBAL DU PROJET

### ✅ Fonctionnalités Complétées (Phase 1 - Base MVP)
- [x] Gestion des Joueurs (CRUD + archivage)
- [x] Gestion des Saisons (scoring complet + malus recaves)
- [x] Gestion des Tournois (CRUD + statuts)
- [x] Structure des Blinds (générateur automatique)
- [x] Timer de Tournoi (pause/reprise/persistance)
- [x] Inscription & Répartition Tables (+ tracking paiement)
- [x] Gestion des Recaves (standard + light)
- [x] Gestion des Éliminations (+ fin auto tournoi)
- [x] Système de Points & Résultats (calcul complet)
- [x] Vue Spectateur TV (refresh auto 5s)

**Progression Phase 1** : 10/11 complétées (90%)

---

## 🎯 PHASE 1.5 - FINALISATION MVP (Priorité TRÈS HAUTE)
**Objectif** : Compléter le MVP de base
**Durée estimée** : 1-2h
**Statut** : En cours

### 1.1 Export PDF/Images des Résultats ⏱️ 1h30
**Priorité** : 🔴 CRITIQUE - Fonctionnalité manquante du MVP
**Cahier des charges** : Section 3.7.2

**Tâches** :
- [ ] Installer librairies (`jspdf`, `html2canvas`, `html-to-image`)
- [ ] Créer `src/lib/exportUtils.ts` avec fonctions d'export
- [ ] Export PDF récapitulatif tournoi
- [ ] Export PNG/JPG optimisé WhatsApp (format 1080×1920 ou carré)
- [ ] Export HTML pour consultation web
- [ ] Ajouter bouton "Partager" dans `TournamentResults.tsx`

**Contenu des exports** :
- Podium avec gains
- Classement final avec points détaillés
- Tableau "Qui a éliminé qui"
- Stats du tournoi (prize pool, rebuys, etc.)

**Fichiers à modifier** :
- `src/components/TournamentResults.tsx`
- `src/lib/exportUtils.ts` (nouveau)

---

## 🚀 PHASE 2 - EXPÉRIENCE TOURNOI AMÉLIORÉE (Priorité HAUTE)
**Objectif** : Améliorer l'ambiance et l'utilisabilité pendant une soirée tournoi
**Durée estimée** : 4-5h
**Statut** : Planifié

### 2.1 Vue TV Optimisée - Lisibilité à Distance ⏱️ 1h
**Priorité** : 🔴 HAUTE - Impact immédiat sur l'expérience

**Spécifications** :
- Garder le style moderne gradient (Option A)
- Agrandir massivement le timer (text-9xl minimum, voire plus grand)
- Augmenter taille des blinds actuelles/prochaines
- Meilleur contraste avec bordures colorées vives
- Afficher l'heure actuelle (comme ancien système)
- Afficher info "Prochain break dans X niveaux" bien visible
- Timer passe en rouge/orange quand < 1 min restant

**Fichiers** :
- `src/app/tv/[tournamentId]/page.tsx`

---

### 2.2 Gestion des Jetons (Chip Denominations) ⏱️ 1h30
**Priorité** : 🔴 HAUTE - Fonctionnalité clé pour l'affichage TV

**Spécifications** :
- **Configuration par défaut** : 8 dénominations standard du championnat
- **Modifiable par tournoi** : Pour tournois "off" avec jetons différents
- Affichage visuel sur Vue TV (légende avec couleurs)

**Tâches** :
- [ ] Créer modèle Prisma `ChipDenomination`
  ```prisma
  model ChipDenomination {
    id            String   @id @default(cuid())
    tournamentId  String?
    value         Int      // Valeur du jeton (10, 25, 50, 100, etc.)
    color         String   // Couleur principale (#HEX)
    colorSecondary String? // Couleur secondaire pour jetons bicolores
    quantity      Int?     // Quantité disponible (optionnel)
    order         Int      // Ordre d'affichage
    isDefault     Boolean  @default(false) // Config par défaut du championnat
    tournament    Tournament? @relation(fields: [tournamentId], references: [id], onDelete: Cascade)
    createdAt     DateTime @default(now())
  }
  ```
- [ ] Créer config par défaut avec 8 dénominations standard
- [ ] API CRUD pour gérer les jetons : `POST/GET/PATCH/DELETE /api/chip-denominations`
- [ ] API par tournoi : `GET/POST /api/tournaments/[id]/chips`
- [ ] Composant `ChipManager.tsx` pour interface de config
- [ ] Intégrer dans onglet "Configuration" du tournoi
- [ ] Afficher les jetons sur Vue TV (section dédiée avec couleurs)

**Fichiers** :
- `prisma/schema.prisma` (ajouter modèle)
- `src/app/api/chip-denominations/route.ts` (nouveau)
- `src/app/api/tournaments/[id]/chips/route.ts` (nouveau)
- `src/components/ChipManager.tsx` (nouveau)
- `src/app/dashboard/tournaments/[id]/page.tsx` (intégration)
- `src/app/tv/[tournamentId]/page.tsx` (affichage)

---

### 2.3 Timer avec Son & Annonces Vocales ⏱️ 1h
**Priorité** : 🟠 HAUTE - Fonctionnalité fun qui améliore l'ambiance

**Spécifications** :

**Son de décompte** (5 sec avant fin de niveau) :
- Séquence : "bip, bip, bip, bip, bip... toooo"
- Alerte visuelle : flash rouge/orange sur le timer
- Volume ajustable dans les settings

**Annonce vocale TTS** (au changement de niveau) :
- Utiliser Web Speech API (`window.speechSynthesis`)
- Langue : Français
- Phrases humoristiques aléatoires :
  - "Niveau X ! Les blinds montent, les tapis descendent..."
  - "Attention, nouveau niveau ! Vos jetons tremblent déjà !"
  - "C'est parti pour le niveau X ! Que le meilleur survive !"
  - "Les blinds augmentent ! Préparez-vous à défendre vos tapis !"
  - "Niveau X ! Le moment de vérité approche..."
  - "Changement de niveau ! Les petites blinds sont maintenant de X"
  - "Nouveau round ! Les requins sentent l'odeur du sang..."
  - "Niveau X ! C'est le moment de montrer qui est le patron !"
  - "Les blinds montent ! Vous allez devoir jouer serré..."
  - "Attention les amis, on passe au niveau X !"

**Tâches** :
- [ ] Créer `src/lib/audioManager.ts` (gestion sons + TTS)
- [ ] Générer/télécharger son de décompte (ou utiliser Web Audio API)
- [ ] Hook détection 5 secondes avant fin dans `TournamentTimer.tsx`
- [ ] Hook changement de niveau pour déclencher annonce TTS
- [ ] Animation flash/pulse sur le timer pendant décompte
- [ ] Settings pour activer/désactiver son et voix
- [ ] Tester compatibilité navigateurs

**Fichiers** :
- `src/lib/audioManager.ts` (nouveau)
- `src/components/TournamentTimer.tsx` (modification)
- `public/sounds/countdown.mp3` (nouveau - asset audio)

---

### 2.4 Animation Visuelle Changement de Niveau ⏱️ 30min
**Priorité** : 🟡 MOYENNE - Complément des annonces vocales

**Spécifications** :
- Animation full-screen lors du changement (2-3 sec)
- Affichage "NIVEAU X" en grand avec effet zoom/fade
- Affichage des nouvelles blinds avec transition
- Couleurs vives (jaune/orange/vert)
- Animation sur Vue TV + interface admin

**Tâches** :
- [ ] Créer composant `LevelChangeAnimation.tsx`
- [ ] Utiliser Framer Motion ou CSS animations
- [ ] Déclencher au changement de niveau
- [ ] Option pour désactiver dans settings

**Fichiers** :
- `src/components/LevelChangeAnimation.tsx` (nouveau)
- `src/components/TournamentTimer.tsx` (intégration)
- `src/app/tv/[tournamentId]/page.tsx` (intégration)

---

### 2.5 Tableau des Sièges sur Vue TV ⏱️ 30min
**Priorité** : 🟡 MOYENNE - Inspiré de l'ancien système

**Spécifications** :
- Utiliser les `TableAssignment` existants
- Affichage en grille ou liste par table
- Format : "Table X : Siège Y - Prénom NOM"
- Section scrollable si trop de tables
- Masquer les joueurs éliminés (optionnel)

**Tâches** :
- [ ] Créer composant `TVSeatingChart.tsx`
- [ ] Récupérer les `TableAssignment` dans page TV
- [ ] Afficher en section dédiée sur la TV
- [ ] Style cohérent avec le reste de la TV

**Fichiers** :
- `src/components/TVSeatingChart.tsx` (nouveau)
- `src/app/tv/[tournamentId]/page.tsx` (intégration)

---

### 2.6 Réassignation Automatique à Certains Niveaux ⏱️ 45min
**Priorité** : 🟡 MOYENNE - Automatisation utile

**Spécifications** :
- Ajouter checkbox "Auto-redistribution" sur chaque `BlindLevel`
- Lors du passage à ce niveau, déclencher redistribution auto
- Notification visible sur interface admin + Vue TV
- Option globale pour activer/désactiver

**Tâches** :
- [ ] Ajouter champ `autoRedistribute` dans modèle `BlindLevel`
- [ ] Modifier `BlindStructureEditor.tsx` pour ajouter checkbox
- [ ] Hook dans timer pour détecter changement de niveau
- [ ] Appeler API redistribution automatiquement
- [ ] Notification toast + message sur Vue TV

**Fichiers** :
- `prisma/schema.prisma` (update BlindLevel)
- `src/components/BlindStructureEditor.tsx`
- `src/components/TournamentTimer.tsx`
- `src/app/tv/[tournamentId]/page.tsx`

---

## 📱 PHASE 3 - INTERFACE MOBILE & ACCESSIBILITÉ (Priorité HAUTE)
**Objectif** : Permettre saisie éliminations/recaves depuis mobile pendant le tournoi
**Durée estimée** : 2-3h
**Statut** : Planifié

### 3.1 Interface Mobile Optimisée ⏱️ 1h30
**Priorité** : 🔴 HAUTE - Utilisabilité critique pendant tournoi

**Spécifications** :
- Version mobile-first des formulaires élimination & recave
- Boutons plus grands, scroll optimisé
- Sélection joueurs facilitée (autocomplete, liste)
- Confirmation rapide avec feedback visuel
- Mode "Quick action" pour saisie rapide

**Tâches** :
- [ ] Créer route `/mobile/tournament/[id]`
- [ ] Composant `MobileEliminationForm.tsx`
- [ ] Composant `MobileRebuyForm.tsx`
- [ ] Navigation simplifiée mobile
- [ ] Tester sur différents devices (iPhone, Android)

**Fichiers** :
- `src/app/mobile/tournament/[id]/page.tsx` (nouveau)
- `src/components/mobile/MobileEliminationForm.tsx` (nouveau)
- `src/components/mobile/MobileRebuyForm.tsx` (nouveau)

---

### 3.2 Progressive Web App (PWA) ⏱️ 1h
**Priorité** : 🟡 MOYENNE - Permet installation sur téléphone

**Tâches** :
- [ ] Configurer `next.config.js` pour PWA
- [ ] Créer manifest.json
- [ ] Ajouter service worker
- [ ] Icons pour iOS/Android
- [ ] Splash screen

**Fichiers** :
- `next.config.js`
- `public/manifest.json` (nouveau)
- `public/sw.js` (nouveau)

---

## 👤 PHASE 4 - ESPACE JOUEUR (Priorité HAUTE)
**Objectif** : Dashboard personnalisé pour chaque joueur
**Durée estimée** : 3-4h
**Statut** : Planifié

### 4.1 Page d'Accueil Joueur ⏱️ 3h
**Priorité** : 🔴 HAUTE - Engagement des joueurs

**Spécifications** :
- Route `/player/[playerId]` ou `/me` (si auth activée)
- Dashboard personnalisé avec :
  - **Prochaine journée** (prochains tournois planifiés)
  - **Dernière journée** (dernier tournoi joué + résultat)
  - **Mon classement** dans la saison actuelle (position + points)
  - **Classement général** (top 10 de la saison)
  - **Historique des tournois** (liste scrollable)
  - **Stats amusantes personnelles** :
    - Nombre de victoires
    - Nombre de podiums
    - Total d'éliminations
    - Leader Kills
    - Taux de recave
    - Némésis (joueur qui t'élimine le plus)
    - Victime favorite (joueur que tu élimines le plus)

**Tâches** :
- [ ] Créer page `/player/[playerId]/page.tsx`
- [ ] API `GET /api/players/[id]/dashboard`
- [ ] Composant `PlayerDashboard.tsx`
- [ ] Composant `PlayerStats.tsx`
- [ ] Composant `PlayerHistory.tsx`
- [ ] Graphique d'évolution des points (Recharts)

**Fichiers** :
- `src/app/player/[playerId]/page.tsx` (nouveau)
- `src/app/api/players/[id]/dashboard/route.ts` (nouveau)
- `src/components/player/PlayerDashboard.tsx` (nouveau)
- `src/components/player/PlayerStats.tsx` (nouveau)

---

## 📈 PHASE 5 - CLASSEMENT & LEADERBOARD (Priorité HAUTE)
**Objectif** : Classement général de la saison avec système "meilleures performances"
**Durée estimée** : 3-4h
**Statut** : Planifié
**Cahier des charges** : Section 3.8

### 5.1 API Leaderboard de la Saison ⏱️ 1h30
**Priorité** : 🔴 HAUTE - Fonctionnalité clé du championnat

**Spécifications** :
- Système "Meilleures Performances" :
  - Ne retenir que les Y meilleurs tournois (selon `season.bestTournamentsCount`)
  - Gérer cas où joueur a fait < Y tournois
- Calcul pour chaque joueur :
  - Rang actuel
  - Points totaux (somme des Y meilleures perfs)
  - Nombre de tournois joués
  - Meilleur résultat
  - Moyenne de points
  - Variation de place (nécessite historique)

**Tâches** :
- [ ] Créer API `GET /api/seasons/[id]/leaderboard`
- [ ] Logique de sélection des meilleures performances
- [ ] Calcul du classement ordonné
- [ ] Retourner historique pour graphique

**Fichiers** :
- `src/app/api/seasons/[id]/leaderboard/route.ts` (nouveau)

---

### 5.2 Page Classement Général ⏱️ 2h
**Priorité** : 🔴 HAUTE

**Spécifications** :
- Page `/dashboard/seasons/[id]/leaderboard`
- Tableau de classement avec :
  - Rang actuel
  - Variation de place (↑↓ avec couleur)
  - Avatar joueur
  - Nom + Pseudo
  - Points totaux
  - Nombre de tournois joués
  - Meilleur résultat
  - Moyenne de points
- Vue détaillée par joueur (modal ou page) :
  - Historique de tous ses tournois
  - Graphique d'évolution des points
  - Mise en évidence des X meilleures performances comptées
- Export PDF classement
- Export Image TOP 10 pour partage

**Tâches** :
- [ ] Créer page `/dashboard/seasons/[id]/leaderboard/page.tsx`
- [ ] Composant `SeasonLeaderboard.tsx`
- [ ] Composant `PlayerDetailModal.tsx`
- [ ] Graphique d'évolution (Recharts)
- [ ] Export PDF avec jsPDF
- [ ] Export Image avec html-to-image

**Fichiers** :
- `src/app/dashboard/seasons/[id]/leaderboard/page.tsx` (nouveau)
- `src/components/SeasonLeaderboard.tsx` (nouveau)
- `src/components/PlayerDetailModal.tsx` (nouveau)

---

## 📊 PHASE 6 - STATISTIQUES COMPLÈTES (Priorité MOYENNE)
**Objectif** : Stats détaillées, records, et stats ludiques
**Durée estimée** : 4-5h
**Statut** : Planifié
**Cahier des charges** : Section 3.9

### 6.1 Stats par Joueur ⏱️ 1h30
**Priorité** : 🟡 MOYENNE

**Données** :
- Nombre de tournois joués
- Nombre de victoires
- Nombre de podiums (TOP 3)
- Taux de ROI (gains vs recaves)
- Moyenne de classement
- Total d'éliminations
- Plus forte progression/régression

### 6.2 Records Généraux ⏱️ 1h
**Priorité** : 🟡 MOYENNE

**Records** :
- Plus de victoires sur une saison
- Meilleur ratio éliminations/tournois
- Plus de recaves sur un tournoi
- Plus longue série de podiums
- Plus de bonus "Leader Killer"

### 6.3 Top Sharks (Duels) ⏱️ 1h30
**Priorité** : 🟡 MOYENNE

**Spécifications** :
- Classement par éliminations
- Matrice des duels (qui élimine qui)
- "Némésis" de chaque joueur (qui vous élimine le plus)
- "Victime favorite" (qui vous éliminez le plus)

### 6.4 Stats Ludiques ⏱️ 1h
**Priorité** : 🟡 MOYENNE

**Trophées fun** :
- 🐟 "Le Poisson" : Plus de recaves
- 🦈 "Le Requin" : Meilleur ratio élim/tournoi
- 📈 "Fusée" : Plus forte progression
- 📉 "Chute libre" : Plus forte régression
- 👑 "Assassin du Roi" : Plus de Leader Killer
- 🎯 "Régularité" : Faible variation
- 💰 "Money Man" : Plus gros gains

**Fichiers** :
- `src/app/dashboard/statistics/page.tsx` (nouveau)
- `src/app/api/statistics/players/route.ts` (nouveau)
- `src/app/api/statistics/records/route.ts` (nouveau)
- `src/app/api/statistics/fun-stats/route.ts` (nouveau)
- `src/components/statistics/PlayerStats.tsx` (nouveau)
- `src/components/statistics/Records.tsx` (nouveau)
- `src/components/statistics/FunStats.tsx` (nouveau)

---

## 💰 PHASE 7 - RÉPARTITION DES GAINS (Priorité MOYENNE)
**Objectif** : Calcul automatique de la répartition des gains
**Durée estimée** : 2h
**Statut** : Planifié
**Cahier des charges** : Section 3.4.4

### 7.1 Répartition Automatique ⏱️ 2h
**Priorité** : 🟡 MOYENNE

**Spécifications** :
- Après fin de phase recave, calculer prize pool
- Proposer répartition auto selon nombre de joueurs restants :
  - 20 joueurs → Top 5 payés (50%/25%/15%/7%/3%)
  - 15 joueurs → Top 4 payés (45%/30%/15%/10%)
  - 10 joueurs → Top 3 payés (50%/30%/20%)
- Permettre modification manuelle
- Sauvegarder dans `tournament.prizeDistribution` (JSON)
- Attribuer `prizeAmount` aux `TournamentPlayer` à la fin

**Tâches** :
- [ ] Algorithme de calcul répartition
- [ ] Modal "Configurer les gains" dans interface tournoi
- [ ] API `PATCH /api/tournaments/[id]/prize-distribution`
- [ ] Formulaire de modification manuelle
- [ ] Attribution automatique des gains à la fin

**Fichiers** :
- `src/components/PrizeDistributionModal.tsx` (nouveau)
- `src/app/api/tournaments/[id]/prize-distribution/route.ts` (nouveau)
- `src/app/dashboard/tournaments/[id]/page.tsx` (intégration)

---

## 🎨 PHASE 8 - FONCTIONNALITÉS AVANCÉES (Priorité BASSE)
**Objectif** : Fonctionnalités bonus pour optimiser l'expérience
**Durée estimée** : 3-4h
**Statut** : Futur

### 8.1 Templates de Structures de Blinds ⏱️ 1h30
**Priorité** : 🟢 BASSE
**Cahier des charges** : Section 3.10.2

**Spécifications** :
- Créer modèle `BlindStructureTemplate`
- Sauvegarder une structure avec nom
- Liste des templates disponibles
- Appliquer template en un clic lors de création tournoi

**Schema Prisma** :
```prisma
model BlindStructureTemplate {
  id              String   @id @default(cuid())
  name            String
  description     String?
  startingChips   Int
  targetDuration  Int
  levels          Json     // Array de levels
  createdAt       DateTime @default(now())
}
```

**Fichiers** :
- `prisma/schema.prisma` (ajouter modèle)
- `src/app/api/blind-templates/route.ts` (nouveau)
- `src/components/BlindTemplateManager.tsx` (nouveau)

---

### 8.2 Assistant Jetons Physiques ⏱️ 2h
**Priorité** : 🟢 BASSE
**Cahier des charges** : Section 3.4.2

**Spécifications** :
- Calcul stack optimal selon durée/joueurs
- Proposition répartition jetons par joueur
  - Ex: 8×10 + 8×50 + 6×100 + 7×500 + 1×1000 = 5080
- Validation inventaire suffisant
- Export liste de préparation (PDF)

**Tâches** :
- [ ] Algorithme de calcul répartition optimale
- [ ] Composant `ChipCalculator.tsx`
- [ ] Intégration dans création de tournoi
- [ ] Export PDF liste de préparation

**Fichiers** :
- `src/components/ChipCalculator.tsx` (nouveau)
- `src/lib/chipCalculations.ts` (nouveau)

---

## 🔐 PHASE 9 - AUTHENTIFICATION & SÉCURITÉ (Priorité MOYENNE-BASSE)
**Objectif** : Activer NextAuth v5 et sécuriser les API
**Durée estimée** : 2-3h
**Statut** : Futur

### 9.1 Réactivation NextAuth v5 ⏱️ 2h
**Priorité** : 🟡 MOYENNE-BASSE

**Tâches** :
- [ ] Corriger configuration NextAuth v5
- [ ] Créer système de rôles (Admin, Director, Player)
- [ ] Décommenter les checks d'auth dans toutes les API
- [ ] Protéger les routes admin
- [ ] Permettre accès joueur à leur page perso uniquement

**Fichiers** :
- `src/lib/auth.ts`
- Toutes les routes `src/app/api/**/route.ts`

---

## 📦 RÉCAPITULATIF PAR PRIORITÉ

### 🔴 PRIORITÉ TRÈS HAUTE (À faire en priorité)
1. **Export PDF/Images des Résultats** (1h30) - Phase 1.5
2. **Vue TV Optimisée** (1h) - Phase 2.1
3. **Gestion des Jetons** (1h30) - Phase 2.2
4. **Timer avec Son & Annonces** (1h) - Phase 2.3
5. **Interface Mobile Optimisée** (1h30) - Phase 3.1
6. **Page d'Accueil Joueur** (3h) - Phase 4.1
7. **API Leaderboard** (1h30) - Phase 5.1
8. **Page Classement Général** (2h) - Phase 5.2

**Total Priorité TRÈS HAUTE** : ~12-13h

---

### 🟠 PRIORITÉ HAUTE (À faire ensuite)
9. Animation Changement de Niveau (30min) - Phase 2.4
10. Tableau des Sièges TV (30min) - Phase 2.5
11. Réassignation Auto par Niveau (45min) - Phase 2.6

**Total Priorité HAUTE** : ~1h45

---

### 🟡 PRIORITÉ MOYENNE (Quand le reste est fait)
12. PWA (1h) - Phase 3.2
13. Stats par Joueur (1h30) - Phase 6.1
14. Records Généraux (1h) - Phase 6.2
15. Top Sharks (1h30) - Phase 6.3
16. Stats Ludiques (1h) - Phase 6.4
17. Répartition Gains (2h) - Phase 7.1

**Total Priorité MOYENNE** : ~8h

---

### 🟢 PRIORITÉ BASSE (Nice to have)
18. Templates Blinds (1h30) - Phase 8.1
19. Assistant Jetons Physiques (2h) - Phase 8.2
20. NextAuth v5 (2h) - Phase 9.1

**Total Priorité BASSE** : ~5h30

---

## 📅 PLAN D'EXÉCUTION SUGGÉRÉ

### **Sprint 1 : MVP + UX Tournoi** (1-2 sessions, ~8h)
- Phase 1.5 : Export PDF/Images (1h30)
- Phase 2.1 : Vue TV optimisée (1h)
- Phase 2.2 : Gestion jetons (1h30)
- Phase 2.3 : Son & Annonces (1h)
- Phase 2.4-2.6 : Animations + Auto-reassign (1h45)
- Phase 3.1 : Interface mobile (1h30)

**Résultat** : Système complet pour organiser une soirée tournoi avec super UX

---

### **Sprint 2 : Espace Joueur & Classement** (1-2 sessions, ~6h30)
- Phase 4.1 : Page d'accueil joueur (3h)
- Phase 5.1 : API Leaderboard (1h30)
- Phase 5.2 : Page Classement (2h)

**Résultat** : Engagement des joueurs avec leur dashboard perso + classement saison

---

### **Sprint 3 : Statistiques & Gains** (1-2 sessions, ~8h)
- Phase 6 : Statistiques complètes (5h)
- Phase 7 : Répartition gains (2h)
- Phase 3.2 : PWA (1h)

**Résultat** : Système complet avec toutes les stats et automatisation gains

---

### **Sprint 4 : Polish & Sécurité** (1 session, ~5h30)
- Phase 8 : Fonctionnalités avancées (3h30)
- Phase 9 : NextAuth v5 (2h)

**Résultat** : Système finalisé et sécurisé prêt pour production

---

## 🎯 PROCHAINE SESSION RECOMMANDÉE

**Option recommandée** : **Sprint 1 - Partie 1**

**Durée** : 3-4h
**Objectif** : Finaliser MVP + Améliorer UX soirée tournoi

**Plan** :
1. ✅ Export Image PNG/JPG des résultats (1h)
2. ✅ Vue TV optimisée (grandes tailles, contraste) (1h)
3. ✅ Gestion des jetons avec affichage TV (1h30)
4. ✅ Son décompte + annonces vocales (1h)

**Après cette session, vous aurez** :
- Un MVP 100% complet avec exports
- Une Vue TV professionnelle lisible de loin
- Une ambiance de tournoi immersive avec son et annonces
- Affichage des jetons sur la TV

---

**📝 Notes** :
- Chaque phase peut être faite indépendamment
- Les estimations de temps sont conservatrices
- Certaines fonctionnalités peuvent être combinées pour gagner du temps
- La roadmap est flexible et peut être ajustée selon vos priorités

**🚀 Prêt à commencer ?**
