# Script de Génération de Données de Test

## Description

Ce script génère automatiquement des données de test pour le système de gestion de championnats de poker, incluant une saison complète et plusieurs tournois avec classements.

## Prérequis

- Des joueurs doivent déjà exister dans la base de données (status = 'ACTIVE')
- La base de données doit être initialisée (migrations appliquées)

## Utilisation

```bash
npm run db:seed-test
```

## Ce que le script génère

### 1. Saison de Test
- **Nom**: Saison Test 2025
- **Année**: 2025
- **Période**: 01/01/2025 - 31/12/2025
- **Statut**: ACTIVE
- **Paramètres de scoring**: Valeurs par défaut du système

### 2. Tournois (5 au total)

#### Tournois Terminés (2 premiers)
- **Statut**: FINISHED
- **Joueurs inscrits**: Nombre aléatoire (8 minimum)
- **Classements**: Complets avec rangs, points, éliminations
- **Éliminations**: 5 éliminations créées par tournoi
- **Points calculés**:
  - Points de classement selon le rang
  - Points d'élimination (0-3 éliminations par joueur)
  - Bonus leader killer (20% de chance)
  - Malus de recave (0-3 recaves aléatoires)
- **Prize pool**: Distribué sur le podium (50% / 30% / 20%)

#### Tournois Planifiés (3 suivants)
- **Statut**: PLANNED
- **Dates**: Espacées de 2 semaines
- **Le 3ème tournoi**: A des joueurs inscrits (prêt à démarrer)
- **Les 4ème et 5ème**: Aucun joueur inscrit

### 3. Données générées par tournoi terminé

Pour chaque joueur d'un tournoi terminé:
- **Rang final**: De 1 à N (N = nombre de joueurs)
- **Points de classement**: Selon barème de la saison
- **Éliminations**: 0-3 aléatoires
- **Leader kills**: 0-1 (20% de chance)
- **Recaves**: 0-3 aléatoires avec malus si > 2
- **Points totaux**: Somme de tous les points
- **Prize**: Seulement pour le podium (top 3)

### 4. Éliminations

- **Nombre**: 5 par tournoi terminé
- **Éliminés**: Les joueurs classés en fin de tableau
- **Éliminateurs**: Choisis parmi le top 5 aléatoirement
- **Niveau**: Aléatoire entre 1 et 10
- **Leader kill**: 20% de chance

## Structure des données

### Points par rang (défaut)
- 1er: 1500 points
- 2e: 1000 points
- 3e: 700 points
- 4e: 500 points
- 5e: 400 points
- 6e: 300 points
- 7e-9e: 200 points
- 10e: 200 points
- 11e: 100 points
- 16e+: 50 points
- 12e-15e: 100 points

### Points bonus/malus
- **Élimination**: +50 points par élimination
- **Leader killer**: +25 points par leader kill
- **Malus recaves**:
  - 3 recaves: -50 points
  - 4 recaves: -100 points
  - 5+ recaves: -150 points
  - (Les 2 premières recaves sont gratuites)

### Prize Pool
Pour un tournoi à 12 joueurs à 10€:
- Prize total: 120€
- 1er: 60€ (50%)
- 2e: 36€ (30%)
- 3e: 24€ (20%)

## Exemples de résultats

Après exécution, vous aurez:

```
📊 Résumé:
   - 1 saison créée: Saison Test 2025
   - 5 tournois créés
   - 2 tournois terminés avec classements
   - 3 tournois planifiés
```

### Tournoi Test #1 (FINISHED)
- Date: 15/01/2025 20:00
- Joueurs: 12-16 (aléatoire)
- Classement complet avec points
- 5 éliminations enregistrées
- Prize pool distribué

### Tournoi Test #2 (FINISHED)
- Date: 01/02/2025 20:00
- Joueurs: 12-16 (aléatoire)
- Classement complet avec points
- 5 éliminations enregistrées
- Prize pool distribué

### Tournoi Test #3 (PLANNED)
- Date: 15/02/2025 20:00
- Joueurs inscrits mais non classés
- Prêt à démarrer

### Tournois Test #4 et #5 (PLANNED)
- Dates: 01/03/2025 et 15/03/2025 20:00
- Aucun joueur inscrit
- En attente d'inscriptions

## Vérification des données

### Via Prisma Studio
```bash
npm run db:studio
```

Puis naviguer vers:
- **Seasons**: Voir "Saison Test 2025"
- **Tournaments**: Voir les 5 tournois
- **TournamentPlayers**: Voir les inscriptions et classements
- **Eliminations**: Voir les éliminations créées

### Via l'interface web
1. Démarrer l'app: `npm run dev`
2. Accéder à: http://localhost:3003/dashboard
3. Naviguer vers:
   - **Tournois**: Voir les tournois créés avec podiums
   - **Classement**: Voir le classement de la saison
   - **Statistiques**: Voir les stats générées

## Nettoyage

Pour supprimer les données de test et recommencer:

### Option 1: Supprimer via Prisma Studio
```bash
npm run db:studio
```
Puis supprimer manuellement les éléments créés.

### Option 2: Reset complet de la base (ATTENTION: supprime TOUT)
```bash
rm prisma/dev.db
npm run db:push
```

## Notes importantes

- Le script utilise les joueurs existants - assurez-vous d'en avoir au moins 8
- Les classements sont générés aléatoirement (rangs mélangés)
- Les points sont calculés selon le barème de la saison
- Les éliminations sont créées de manière cohérente (éliminés vs éliminateurs)
- Le script peut être exécuté plusieurs fois (crée de nouvelles données à chaque fois)

## Dépannage

### Erreur: "Aucun joueur trouvé"
→ Créez d'abord des joueurs via l'interface web ou avec un autre seed script

### Erreur: "Argument `rank` is missing"
→ Le modèle Elimination a changé, vérifiez la migration Prisma

### Erreur: "Invalid `prisma.tournamentPlayer.create()`"
→ Vérifiez que le schéma Prisma est à jour: `npm run db:generate`

## Améliorations futures

- [ ] Paramètres configurables (nombre de tournois, dates, etc.)
- [ ] Génération de blind levels pour les tournois
- [ ] Génération de chip denominations
- [ ] Génération de table assignments
- [ ] Option de nettoyage intégrée
- [ ] Seed de données réalistes (noms, dates cohérentes)
