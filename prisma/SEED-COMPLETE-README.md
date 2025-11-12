# Script de Seed Complet - Documentation

## Vue d'ensemble

Le script `seed-complete.ts` génère un jeu de données **COMPLET** couvrant **TOUTES les fonctionnalités** de l'application Poker Championship Manager.

Contrairement au seed basique qui crée uniquement quelques joueurs et tournois, ce seed crée un environnement réaliste avec :
- Plusieurs saisons (passées, en cours, futures)
- Différents états de tournois (terminés, en cours, inscriptions, planifiés, annulés)
- Données complètes (classements, éliminations, rebuys, tables, blindes, etc.)

---

## Utilisation

### Lancer le seed complet

```bash
npm run db:seed-complete
```

**⚠️ ATTENTION**: Ce script **supprime toutes les données existantes** avant de créer les nouvelles.

### Réinitialiser la base + seed

```bash
npm run db:push && npm run db:seed-complete
```

---

## Données Créées

### 1. Joueurs (25 joueurs)

**23 joueurs ACTIFS** :
- Nicolas Fortier (Nico Fo)
- Grégory Martin (Greg)
- Romain Dupont (Romain)
- Pascal Bernard (Pascal)
- Bruno Petit (bruno)
- Georges Moreau (Georges)
- Karine Laurent (Karine)
- Rémi Simon (Remi)
- Christian Michel (Christian)
- Benjamin Lefebvre (Benjamin)
- Vadim Leroy (Vadim)
- Vincent Garnier (Vincent)
- Théo Faure (Teo)
- Tom Girard (Tom)
- Gilles Bonnet (Gilles)
- Mike Rousseau (mike)
- Jérémy Blanc (Jeremy)
- Nicolas Boyer (Nico Bo)
- Christophe Guerin (Christophe)
- Thomas Muller (Thomas)
- Philippe Martinez (Philippe)
- Sébastien Garcia (Seb)
- David Rodriguez (David)

**2 joueurs ARCHIVÉS** :
- Marc Sanchez (Marc)
- Julien Perez (Julien)

**Avatars** :
- Générés automatiquement via DiceBear API
- 6 styles différents (adventurer, avataaars, big-ears, bottts, micah, personas)
- Uniques pour chaque joueur (seed basé sur nickname)

**Emails** :
- Format: `{nickname}@poker.test`
- Exemples: `nicofo@poker.test`, `greg@poker.test`

---

### 2. Settings Globaux

Configuration par défaut de l'application :
- Buy-in par défaut: 20€
- Starting chips: 10,000 jetons
- Durée des blindes: 12 minutes
- Points par position (1er: 1500, 2ème: 1000, 3ème: 700, etc.)
- Points d'élimination: 50
- Bonus leader killer: 25

---

### 3. Saisons (3 saisons)

#### A. Championnat 2023 (COMPLETED)
- Année: 2023
- Dates: 01/01/2023 → 31/12/2023
- Statut: **COMPLETED** (terminée)
- 12 tournois total
- Top 10 meilleurs performances comptabilisées

#### B. Les Sharks 2024-2025 (ACTIVE)
- Année: 2025
- Dates: 01/09/2024 → 30/06/2025
- Statut: **ACTIVE** (en cours)
- 15 tournois prévus
- Top 12 meilleurs performances comptabilisées
- **C'est la saison principale pour les tests**

#### C. Championnat 2025-2026 (PLANNED)
- Année: 2026
- Dates: 01/09/2025 → 30/06/2026
- Statut: **PLANNED** (planifiée)
- 15 tournois prévus
- Pas encore de données

---

### 4. Tournois (8 tournois)

#### Tournoi #1 - Lancement de saison
- **Date**: 05/10/2024 20:00
- **Statut**: **FINISHED** ✅
- **Saison**: Les Sharks 2024-2025
- **Joueurs**: 16 inscrits, classement complet
- **Buy-in**: 20€ | Prize pool: 320€
- **Location**: Chez Pascal
- **Structure blindes**: NORMAL (12 niveaux)
- **Données**:
  - ✅ Classement final (1er → 16ème)
  - ✅ Éliminations (avec leader kills)
  - ✅ Rebuys (certains joueurs)
  - ✅ Points calculés selon scoring
  - ✅ Prize pool distribué (50%/30%/20%)

#### Tournoi #2 - Halloween
- **Date**: 01/11/2024 20:00
- **Statut**: **FINISHED** ✅
- **Saison**: Les Sharks 2024-2025
- **Joueurs**: 14 inscrits
- **Buy-in**: 20€ | Prize pool: 280€
- **Location**: Chez Greg
- **Structure blindes**: FAST (10 niveaux, durée courte)
- **Données complètes**

#### Tournoi #3 - Noël
- **Date**: 20/12/2024 20:00
- **Statut**: **FINISHED** ✅
- **Saison**: Les Sharks 2024-2025
- **Joueurs**: 17 inscrits
- **Buy-in**: 20€ | Prize pool: 340€
- **Location**: Chez Romain
- **Structure blindes**: SLOW (14 niveaux, durée longue)
- **Données complètes**

#### Tournoi #4 - En cours
- **Date**: 15/01/2025 20:00
- **Statut**: **IN_PROGRESS** 🎮
- **Saison**: Les Sharks 2024-2025
- **Joueurs**: 15 inscrits
- **Buy-in**: 20€ | Prize pool: 300€
- **Location**: Chez Bruno
- **Données**:
  - ✅ 3 tables créées avec assignments
  - ✅ Certains joueurs éliminés (3)
  - ✅ Certains joueurs actifs
  - ✅ Quelques rebuys déjà effectués (5)
  - ✅ Structure blindes définie

**Idéal pour tester** :
- Gestion des tables en temps réel
- Timer de tournoi
- Ajout/suppression d'éliminations
- Rebalancing des tables
- Vue TV en direct

#### Tournoi #5 - Inscriptions ouvertes
- **Date**: 01/02/2025 20:00
- **Statut**: **REGISTRATION** 📝
- **Saison**: Les Sharks 2024-2025
- **Joueurs**: 10 pré-inscrits
- **Buy-in**: 20€
- **Location**: Chez Karine
- **Données**:
  - ✅ Inscriptions ouvertes
  - ✅ Structure blindes définie
  - ✅ Chip denominations prêtes

**Idéal pour tester** :
- Inscription de nouveaux joueurs
- Désinscription
- Lancement du tournoi (passage à IN_PROGRESS)

#### Tournoi #6 - Février
- **Date**: 15/02/2025 20:00
- **Statut**: **PLANNED** 📅
- **Saison**: Les Sharks 2024-2025
- **Joueurs**: Aucun
- **Buy-in**: 20€
- **Location**: TBD
- **Données**:
  - ✅ Structure blindes par défaut

**Idéal pour tester** :
- Création/édition de tournoi
- Configuration initiale
- Ouverture des inscriptions

#### Tournoi annulé - Météo
- **Date**: 15/11/2024 20:00
- **Statut**: **CANCELLED** ❌
- **Saison**: Les Sharks 2024-2025
- **Aucune donnée** (tournoi annulé)

**Idéal pour tester** :
- Affichage des tournois annulés
- Filtres de liste

#### Poker Night - Hors championnat
- **Date**: 31/12/2024 20:00
- **Statut**: **FINISHED** ✅
- **Saison**: **NULL** (hors championnat)
- **Joueurs**: 10 inscrits
- **Buy-in**: 10€ | Prize pool: 100€
- **Location**: Chez Tom
- **Données complètes**

**Idéal pour tester** :
- Tournois hors saison
- Calcul des points sans impact sur classement

---

### 5. Structures de Blindes

3 types de structures créées :

#### FAST (10 niveaux, ~2h)
- Niveaux courts (10-15 min)
- Progression rapide
- Antes dès le niveau 3
- Utilisée pour: Tournoi #2

#### NORMAL (12 niveaux, ~3h)
- Niveaux standards (12-15 min)
- Progression équilibrée
- Antes dès le niveau 4
- Utilisée pour: Tournois #1, #4, #5, #6

#### SLOW (14 niveaux, ~3h30)
- Niveaux longs (15 min)
- Progression lente
- Antes dès le niveau 5
- Utilisée pour: Tournoi #3

Chaque structure inclut :
- Level progressif
- Small blind / Big blind
- Antes
- Durée en minutes

---

### 6. Dénominations de Jetons

Pour chaque tournoi avec chip denominations :

| Valeur | Couleur | Quantité | Total par joueur |
|--------|---------|----------|------------------|
| 25     | Blanc   | 10       | 250             |
| 100    | Rouge   | 10       | 1,000           |
| 500    | Bleu    | 8        | 4,000           |
| 1000   | Vert    | 5        | 5,000           |
| 5000   | Noir    | 2        | 10,000          |

**Total stack**: 10,000 jetons

---

### 7. Résultats de Tournois

Pour chaque tournoi **FINISHED**, les données incluent :

#### Classements (TournamentPlayer)
- Rang final (1 → N)
- Points de classement (selon position)
- Nombre d'éliminations effectuées
- Leader kills
- Nombre de rebuys
- Points d'élimination (éliminationsCount × 50)
- Bonus points (leaderKills × 25)
- Pénalités de recave (-50/-100/-150)
- **Total points** = rankPoints + eliminationPoints + bonusPoints + penaltyPoints
- Prize amount (1er: 50%, 2ème: 30%, 3ème: 20%)

#### Éliminations
- Éliminateur (player qui élimine)
- Éliminé (player éliminé)
- Rank (position finale de l'éliminé)
- Level (niveau de blindes)
- Leader kill (bonus si c'était le leader)

**Logique réaliste** :
- Les joueurs éliminés tôt sont éliminés par ceux qui finissent mieux
- Distribution aléatoire mais cohérente

#### Rebuys/Add-ons
- Joueur
- Montant (20€)
- Type (REBUY)
- Level (niveau où effectué, généralement 1-5)

**Logique** :
- ~30% des joueurs font des rebuys
- 0 à 5 rebuys par joueur
- Pénalités appliquées à partir de 3 rebuys

---

### 8. Tables et Assignments (Tournoi IN_PROGRESS)

Pour le **Tournoi #4** (en cours) :

#### 3 Tables créées
- Table 1: 5 joueurs
- Table 2: 5 joueurs
- Table 3: 5 joueurs

#### Assignments (TableAssignment)
Chaque joueur assigné avec :
- Table number
- Seat number (1 → N)
- **isActive**: false si éliminé, true sinon

**État actuel** :
- 3 joueurs éliminés (isActive = false)
- 12 joueurs actifs (isActive = true)
- Quelques rebuys effectués

**Idéal pour tester** :
- Affichage des tables
- Rebalancing automatique
- Changement de table manuel
- Élimination de joueur

---

## Couverture des Fonctionnalités

### ✅ Gestion des Joueurs
- Création de joueurs
- Joueurs actifs vs archivés
- Avatars personnalisés
- Recherche de joueurs

### ✅ Gestion des Saisons
- Saisons avec différents statuts (COMPLETED, ACTIVE, PLANNED)
- Configuration des points par saison
- Classement général (leaderboard)
- Top N meilleurs performances

### ✅ Gestion des Tournois
- Tous les statuts: PLANNED, REGISTRATION, IN_PROGRESS, FINISHED, CANCELLED
- Tournois de saison vs hors saison
- Buy-in et prize pool
- Localisation

### ✅ Inscriptions
- Inscription de joueurs
- Désinscription
- Liste des inscrits

### ✅ Structure de Blindes
- 3 types de structures (Fast, Normal, Slow)
- Configuration niveau par niveau
- Antes progressives
- Durées personnalisées

### ✅ Dénominations de Jetons
- 5 valeurs standard
- Couleurs associées
- Quantités par joueur
- Calcul automatique du stack

### ✅ Déroulement de Tournoi
- Création des tables
- Assignment des joueurs
- Gestion du timer
- Passage de blindes
- Rebalancing des tables

### ✅ Éliminations
- Qui élimine qui
- Leader kills
- Niveau d'élimination
- Impact sur les points

### ✅ Rebuys / Add-ons
- Enregistrement des rebuys
- Montant et niveau
- Pénalités dans le calcul de points

### ✅ Calcul des Points
- Points de classement (selon position)
- Points d'élimination (50 par élim)
- Bonus leader killer (25 par kill)
- Pénalités de recave (-50/-100/-150)
- Total calculé automatiquement

### ✅ Classements
- Classement d'un tournoi (1er → dernier)
- Classement de saison (cumul des points)
- Podiums (top 3)
- Statistiques par joueur

### ✅ Exports
- Export texte WhatsApp (résultats, blindes, classement)
- Export visuels (graphique, tableau, éliminations)
- PDF et PNG

### ✅ Statistiques
- Statistiques globales
- Statistiques par joueur
- Statistiques par saison
- Éliminations cumulées

### ✅ Vue TV
- Affichage en direct du tournoi
- Tables actives
- Blindes actuelles
- Joueurs éliminés

---

## Scénarios de Test Possibles

### Scénario 1 : Consulter le classement de saison
1. Dashboard → Saisons
2. Cliquer sur "Les Sharks 2024-2025"
3. Cliquer sur "Classement"
4. **Résultat** : Voir le classement avec 3 tournois terminés
5. Cliquer sur "Exports Visuels"
6. **Résultat** : Voir les 3 types d'exports avec données réelles

### Scénario 2 : Gérer un tournoi en cours
1. Dashboard → Tournois
2. Cliquer sur "Tournoi #4 - En cours"
3. **Résultat** : Voir les 3 tables avec joueurs
4. Onglet "Tables"
5. **Résultat** : Voir les assignments, certains éliminés
6. Tester le rebalancing
7. Ajouter une élimination
8. Ajouter un rebuy

### Scénario 3 : Inscrire des joueurs à un tournoi
1. Dashboard → Tournois
2. Cliquer sur "Tournoi #5 - Inscriptions ouvertes"
3. Onglet "Joueurs"
4. **Résultat** : Voir 10 joueurs déjà inscrits
5. Inscrire d'autres joueurs
6. Désinscrire un joueur
7. Lancer le tournoi

### Scénario 4 : Analyser les statistiques
1. Dashboard → Statistiques
2. **Résultat** : Voir stats globales avec données des 3 tournois
3. Top éliminateurs
4. Joueurs les plus performants
5. Graphiques de tendances

### Scénario 5 : Configurer un tournoi planifié
1. Dashboard → Tournois
2. Cliquer sur "Tournoi #6 - Février"
3. Éditer les informations
4. Modifier la structure de blindes
5. Ouvrir les inscriptions (passage à REGISTRATION)

### Scénario 6 : Consulter le profil d'un joueur
1. Dashboard → Joueurs
2. Chercher "Nico Fo" (search bar)
3. Cliquer sur le joueur
4. **Résultat** : Voir historique complet
   - 3 tournois joués
   - Classements
   - Éliminations effectuées
   - Points cumulés
   - Graphique d'évolution

### Scénario 7 : Exporter les résultats d'un tournoi
1. Dashboard → Tournois
2. Cliquer sur "Tournoi #1"
3. Onglet "Résultats"
4. **Résultat** : Voir podium + classement complet
5. Cliquer "Texte WhatsApp"
6. **Résultat** : Texte copié dans presse-papiers
7. Tester aussi les exports PNG/PDF

---

## Données Générées - Résumé Quantitatif

| Entité | Quantité | Description |
|--------|----------|-------------|
| **Players** | 25 | 23 actifs, 2 archivés |
| **Seasons** | 3 | 1 passée, 1 active, 1 future |
| **Tournaments** | 8 | Tous statuts couverts |
| **TournamentPlayers** | ~100 | Inscriptions aux tournois |
| **BlindLevels** | ~90 | Structures de blindes |
| **ChipDenominations** | ~35 | Jetons pour chaque tournoi |
| **Eliminations** | ~60 | Éliminations avec détails |
| **Rebuys** | ~30 | Rebuys/add-ons |
| **TableAssignments** | 15 | Pour tournoi en cours |
| **Settings** | 1 | Configuration globale |

**Total**: ~400+ enregistrements

---

## Maintenance et Évolution

### Ajouter de nouveaux joueurs
Éditer `PLAYER_NAMES` dans le script avec format :
```typescript
{ firstName: 'Prénom', lastName: 'Nom', nickname: 'Pseudo' }
```

### Modifier les paramètres de scoring
Éditer la section "Settings globaux" avec les valeurs souhaitées.

### Ajouter des tournois
Dupliquer un bloc de tournoi et ajuster les propriétés.

### Changer les structures de blindes
Modifier les objets `structures` dans la fonction `createBlindStructure`.

---

## Dépannage

### Erreur "Unique constraint failed"
**Cause** : Données déjà présentes dans la base
**Solution** : Le script nettoie automatiquement. Si l'erreur persiste :
```bash
npm run db:push --force-reset
npm run db:seed-complete
```

### Erreur "Cannot find module"
**Cause** : Dépendances manquantes
**Solution** :
```bash
npm install
npm run db:generate
```

### Seed trop lent
**Cause** : Nombreuses insertions séquentielles
**Solution** : Normal, le seed complet prend ~30-60 secondes

---

## Comparaison avec Autres Seeds

| Feature | seed.ts | seed-test-data.ts | seed-complete.ts |
|---------|---------|-------------------|------------------|
| Joueurs | Admin only | Joueurs actifs | 25 joueurs variés |
| Saisons | 0 | 1 | 3 |
| Tournois | 0 | 5 | 8 |
| Statuts tournois | - | FINISHED only | TOUS |
| Blindes | ❌ | ❌ | ✅ |
| Tables | ❌ | ❌ | ✅ |
| Éliminations | ❌ | ✅ | ✅ Détaillées |
| Rebuys | ❌ | ❌ | ✅ |
| Chip denoms | ❌ | ❌ | ✅ |
| **Usage** | Init prod | Tests basiques | **Tests complets** |

---

## Recommandation

**Utilisez `seed-complete.ts` pour** :
- Développement local avec données réalistes
- Tests manuels de toutes les fonctionnalités
- Démonstrations clients
- Captures d'écran documentation
- Tests d'intégration

**N'utilisez PAS en production** :
- Données de test uniquement
- Emails factices (@poker.test)
- Noms réalistes mais fictifs

---

**Créé pour tester 100% des fonctionnalités de Poker Championship Manager** 🎰🦈
