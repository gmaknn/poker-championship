# Cahier des Charges Fonctionnel
## Application de Gestion de Championnat de Poker Texas Hold'em No Limit

**Version** : 1.0  
**Date** : 7 novembre 2025  
**Client** : Grégory - Le Cyclope  

---

## 1. CONTEXTE ET OBJECTIFS

### 1.1 Contexte
Application web progressive (PWA) destinée à gérer un championnat de poker hebdomadaire regroupant environ 20 joueurs, se déroulant tous les vendredis soirs.

### 1.2 Objectifs principaux
- Automatiser la gestion des tournois (inscriptions, timer, blindes, éliminations)
- Gérer un système de classement avec attribution de points
- Proposer des statistiques engageantes et ludiques
- Faciliter la communication des résultats (exports PDF/images pour WhatsApp)
- Offrir une expérience visuelle optimale pour l'affichage sur TV durant les tournois

### 1.3 Utilisateurs
- **Administrateur unique** : gestion complète de l'application
- **Joueurs** : consultation des classements et statistiques (lecture seule)
- **Mode spectateur** : affichage TV temps réel pendant les tournois

---

## 2. RÈGLES MÉTIER DU CHAMPIONNAT

### 2.1 Structure d'un tournoi
Chaque tournoi se déroule en 2 phases distinctes :

#### Phase 1 : Période de recave
- Les joueurs peuvent se recaver un nombre illimité de fois
- Durée paramétrable
- Malus appliqués selon le nombre de recaves (paramétrable)

#### Phase 2 : Élimination directe
- Plus de recave possible
- Les éliminations comptent pour les points
- Bonus d'élimination actifs

### 2.2 Système de recave spécial "Dernière chance"
**Règle de la "recave allégée"** :
- Activable uniquement lors de la dernière recave avant la phase d'élimination
- Si un joueur possède plus de X big blinds (BB) - **paramétrable**
- Il peut recaver au stack de départ pour un montant réduit
- **Exemple** : Cave de départ = 5000 jetons pour 10€. Si le joueur a > 3000 jetons, il peut revenir à 5000 jetons pour 5€

**Paramètres à configurer** :
- Seuil minimum en BB pour être éligible
- Montant de la recave allégée
- Activation/désactivation de cette option

### 2.3 Types de tournois
- **Tournoi comptant pour le championnat** : attribution de points selon les règles
- **Tournoi hors championnat** : pas d'impact sur le classement général

### 2.4 Système de points

#### Attribution des points de classement
Barème par défaut (paramétrable) :
```
1er  → 1500 points
2e   → 1000 points
3e   → 700 points
4e   → 500 points
5e   → 400 points
6e   → 300 points
7e-10e → 200 points
11e-15e → 100 points
16e+ → 50 points
```

#### Points d'élimination (après fin des recaves)
- **+50 points** par élimination (paramétrable)
- **Bonus "Leader Killer"** : +25 points supplémentaires (paramétrable) si le joueur éliminé était le leader du classement général
  - **Cas spécial J1** : Lors de la première journée, possibilité de tirer au sort un "leader fictif" pour pimenter le jeu

#### Malus de recave
Système progressif paramétrable :
```
Exemple par défaut :
- 0-2 recaves : 0 point de malus
- 3 recaves : -50 points
- 4 recaves : -100 points
- 5+ recaves : -150 points
```

**Paramètres configurables** :
- Nombre de recaves gratuites (seuil)
- Montant du malus par palier
- Progression linéaire ou par paliers

### 2.5 Classement final du championnat

#### Système de "meilleures performances"
- Le championnat peut inclure X journées au total (ex: 12)
- Le classement final ne retient que les Y meilleures journées de chaque joueur (ex: 10 meilleures sur 12)
- **Paramétrable** : nombre de journées à retenir

#### Gestion des absences
- Un joueur absent ne marque aucun point pour la journée
- Pas de pénalité appliquée
- Son classement général reste inchangé jusqu'à sa prochaine participation

---

## 3. FONCTIONNALITÉS DÉTAILLÉES

### 3.1 Gestion des joueurs

#### 3.1.1 CRUD Joueurs
**Fonctionnalités** :
- Ajouter un joueur (nom, prénom, pseudo, email optionnel, photo optionnelle)
- Modifier les informations d'un joueur
- Désactiver/Archiver un joueur (ne pas supprimer pour conserver l'historique)
- Réactiver un joueur archivé

**Données joueur** :
- Identifiant unique
- Nom complet
- Pseudo (affiché pendant les tournois)
- Email (optionnel, pour envoi automatique de résultats)
- Photo/Avatar (optionnel)
- Date d'inscription
- Statut (actif/archivé)
- Statistiques globales (automatiques)

### 3.2 Configuration des saisons

#### 3.2.1 Gestion des saisons
- Créer une nouvelle saison (année de référence)
- Définir les dates de début/fin
- Paramétrer les règles spécifiques de la saison :
  - Barème de points de classement
  - Points d'élimination
  - Bonus "Leader Killer"
  - Système de malus de recave
  - Nombre de journées à retenir pour le classement final
- Archiver une saison terminée
- Consulter l'historique de toutes les saisons

### 3.3 Calendrier des tournois

#### 3.3.1 Planification
- Vue calendrier mensuelle/annuelle
- Créer une journée de championnat (date, heure de début prévue)
- Créer un tournoi hors championnat
- Modifier/Annuler un tournoi planifié
- Statuts : Planifié / En cours / Terminé / Annulé

### 3.4 Configuration d'un tournoi

#### 3.4.1 Paramètres généraux
**Avant le démarrage** :
- Type : Championnat ou Hors championnat
- Date et heure
- Cave de départ (montant en €, nombre de jetons)
- Durée souhaitée du tournoi (estimation)
- Activation de la recave allégée (oui/non + paramètres)

#### 3.4.2 Gestion des jetons physiques
**Configuration des valeurs de jetons disponibles** :
- Valeurs par défaut : 10, 20, 50, 100, 250, 500, 1000
- Possibilité de personnaliser les valeurs pour des cas spécifiques
- Paramétrage global (appliqué à tous les tournois) ou par tournoi

**Assistant intelligent de répartition** :
Pour faciliter la préparation matérielle du tournoi, l'application propose un outil de calcul automatique basé sur :

**Données d'entrée** :
- Nombre de joueurs participants
- Heure de début et heure de fin souhaitée
- Inventaire des jetons disponibles (quantité par valeur)
- Budget de jetons total souhaité par joueur (optionnel)

**Calculs et propositions automatiques** :
- **Stack de départ optimal** : Calcul du nombre de jetons adapté à la durée et au nombre de joueurs
- **Répartition des jetons par joueur** : Distribution optimale des différentes valeurs pour faciliter le jeu
  - Exemple : Pour un stack de 5000, proposer 8×10 + 8×50 + 6×100 + 7×500 + 1×1000 = 5080 jetons
- **Structure des niveaux** : Paliers de blindes cohérents avec le stack
- **Durée des niveaux** : Timing calculé pour finir à l'heure prévue
- **Validation de faisabilité** : Vérification que l'inventaire de jetons est suffisant

**Exemple d'utilisation** :
```
Saisie :
- 20 joueurs
- Début : 20h00, Fin souhaitée : 23h30 (durée 3h30)
- Jetons disponibles : 200×10, 200×20, 150×50, 100×100, 80×250, 60×500, 40×1000

Proposition :
- Stack par joueur : 5000 jetons
- Répartition : 8×10 + 8×50 + 6×100 + 7×500 + 1×1000 = 5080
- Total requis : 160×10, 160×50, 120×100, 140×500, 20×1000
- Verdict : ✓ Inventaire suffisant
- Structure : 15 niveaux de 14 minutes (avec pause de 10 min au niveau 8)
- Fin de recaves : Niveau 6 (1h40 après le début)
```

**Fonctionnalités avancées** :
- Simulation de différents scénarios (durée 2h30 vs 3h30)
- Optimisation de la répartition selon l'inventaire disponible
- Export de la liste de préparation (nombre de jetons à sortir par valeur)
- Historique des configurations utilisées pour réutilisation

#### 3.4.3 Structure des blindes
**Assistant de configuration** :
- L'application propose une structure de tournoi en fonction :
  - Durée souhaitée
  - Nombre de joueurs estimé
  - Stack de départ
  
**Proposition automatique** :
```
Exemple de structure pour 3h, 20 joueurs, 5000 jetons :
Niveau 1 : 10/20 - 12 min
Niveau 2 : 15/30 - 12 min
Niveau 3 : 25/50 - 12 min
Niveau 4 : 50/100 - 12 min
[...]
Avec ante à partir du niveau X
```

**Personnalisation** :
- Ajouter/supprimer des niveaux
- Modifier la durée de chaque niveau
- Définir SB, BB, ante pour chaque niveau
- Définir le niveau de fin de recave
- Sauvegarder des structures personnalisées (templates)

#### 3.4.4 Répartition des gains
**Après la phase de recave** :
- Calcul du prize pool (montant total)
- Proposition automatique de répartition selon le nombre de joueurs restants
- Modification manuelle possible par l'administrateur
- Validation avant passage en phase finale

**Exemples de répartition** :
```
20 joueurs → Top 5 payés (50% / 25% / 15% / 7% / 3%)
15 joueurs → Top 4 payés (45% / 30% / 15% / 10%)
10 joueurs → Top 3 payés (50% / 30% / 20%)
```

### 3.5 Inscription des joueurs et répartition des tables

#### 3.5.1 Inscription au tournoi
- Liste des joueurs actifs
- Sélection des joueurs présents (checkbox)
- Confirmation du nombre de joueurs inscrits

#### 3.5.2 Répartition aléatoire des tables
**Paramètres** :
- Nombre de joueurs inscrits (automatique)
- Nombre de tables disponibles (saisie manuelle)
- Nombre max de joueurs par table (généralement 9-10)

**Algorithme** :
- Répartition équilibrée automatique
- Possibilité de régénérer l'aléatoire
- Affichage de la composition des tables
- Validation et démarrage du tournoi

**Exemple** :
```
20 joueurs, 2 tables :
Table 1 (10 joueurs) : J1, J5, J7, J12, J14, J15, J17, J18, J19, J20
Table 2 (10 joueurs) : J2, J3, J4, J6, J8, J9, J10, J11, J13, J16
```

### 3.6 Gestion du tournoi en cours

#### 3.6.1 Interface administrateur (contrôle)
**Panneau de contrôle** :
- Timer (pause/reprise/reset)
- Passage manuel au niveau suivant
- Modification à chaud des niveaux (durée, montant des blindes)
- Ajout/suppression de niveaux
- Gestion des recaves :
  - Enregistrer une recave pour un joueur
  - Compteur de recaves par joueur
  - Voir qui a recavé combien de fois
- Déclaration d'éliminations :
  - Sélectionner le joueur éliminé
  - Sélectionner le joueur éliminateur
  - Rang de sortie (automatique)
- Marqueur de fin de phase de recave
- Réassignation des tables (équilibrage)
- Fin du tournoi

#### 3.6.2 Vue spectateur (affichage TV)
**Écran optimisé en plein écran** :
- Timer géant avec compte à rebours
- Niveau actuel (Niveau X / Total Y)
- Blindes actuelles : SB / BB / Ante
- Blindes du prochain niveau (prévisualisation)
- Nombre de joueurs restants
- Stack moyen (average)
- Prize pool et répartition
- Message "PÉRIODE DE RECAVE" ou "ÉLIMINATION DIRECTE"
- Indicateur de pause

**Design** :
- Contraste élevé, lisibilité à distance
- Animations fluides lors des changements de niveau
- Mode sombre par défaut
- Avertissement visuel et sonore (optionnel) à 1 minute de la fin du niveau

#### 3.6.3 Réassignation des tables
**Déclencheurs** :
- Manuel : l'administrateur décide de rééquilibrer
- Automatique : quand une table tombe sous X joueurs (paramétrable)

**Processus** :
- Pause du timer
- Calcul de la nouvelle répartition équilibrée
- Affichage de la nouvelle composition
- Validation et reprise

### 3.7 Clôture du tournoi et calcul des points

#### 3.7.1 Finalisation
Une fois le dernier joueur éliminé :
- Saisie automatique du classement final (ordre d'élimination inversé)
- Vérification des données :
  - Recaves par joueur
  - Éliminations par joueur
  - Classement final
- Calcul automatique des points selon les règles

#### 3.7.2 Fiche récapitulative du tournoi
**Contenu** :
- Date et type de tournoi
- Nombre de participants
- Prize pool et répartition
- Classement final avec points attribués
- Détail par joueur :
  - Rang de sortie
  - Nombre de recaves
  - Nombre d'éliminations
  - Bonus "Leader Killer" (si applicable)
  - Malus de recave
  - Points de classement
  - Points d'élimination
  - Total des points
- Tableau "Qui a éliminé qui"
- Podium avec gains

**Formats d'export** :
- PDF (impression/email)
- Image PNG/JPG (optimisée pour WhatsApp)
- HTML (consultation web)

### 3.8 Classement du championnat

#### 3.8.1 Tableau général
**Vue principale** :
- Rang actuel
- Pseudo du joueur
- Points totaux
- Variation de place (↑↓)
- Nombre de tournois joués
- Meilleur résultat
- Moyenne de points

**Vue détaillée par joueur** :
- Historique de tous ses tournois
- Graphique d'évolution
- Mise en évidence des X meilleures performances retenues
- Détail des points par tournoi

#### 3.8.2 Export et partage
- PDF du classement complet
- Image du TOP 10 (format WhatsApp)
- Évolution du TOP 3 en graphique

### 3.9 Statistiques et palmarès

#### 3.9.1 Statistiques globales (toutes saisons)
**Par joueur** :
- Nombre de tournois joués
- Nombre de victoires
- Nombre de podiums (TOP 3)
- Taux de ROI (gains vs recaves)
- Moyenne de classement
- Total d'éliminations
- Plus forte progression sur une saison
- Plus forte régression sur une saison

**Records généraux** :
- Plus de victoires sur une saison
- Meilleur ratio éliminations/tournois
- Plus de recaves sur un tournoi
- Plus longue série de podiums
- Plus de bonus "Leader Killer"

#### 3.9.2 "Top Sharks" - Classement des éliminateurs
- Classement par nombre total d'éliminations
- Ratio éliminations par tournoi
- Graphique des duels (qui élimine qui le plus souvent)
- "Némésis" : afficher pour chaque joueur qui l'élimine le plus

#### 3.9.3 Statistiques ludiques
**"Fun stats"** :
- 🐟 "Le Poisson" : joueur avec le plus de recaves
- 🦈 "Le Requin" : meilleur ratio éliminations/tournois
- 📈 "Fusée" : plus forte progression d'une saison
- 📉 "Chute libre" : plus forte régression
- 👑 "Assassin du Roi" : plus de bonus "Leader Killer"
- 🎯 "Régularité" : joueur avec la plus faible variation de classement
- 💰 "Money Man" : plus gros gains cumulés

**Formats d'export** :
- PDF complet avec tous les stats
- Images individuelles par catégorie (partage WhatsApp)

### 3.10 Paramétrages avancés

#### 3.10.1 Paramètres globaux de l'application
- Nom du championnat
- Logo/Image de bannière
- Fuseau horaire
- Langue (français par défaut)
- Devise (€ par défaut)

#### 3.10.2 Templates de structures de tournoi
- Sauvegarder des structures prédéfinies
- Nommer les templates (ex: "Structure Rapide 2h", "Structure Standard 3h")
- Réutiliser en un clic

#### 3.10.3 Notifications (optionnel - V2)
- Email automatique des résultats aux joueurs
- Rappel de tournoi (24h avant)
- Notification de nouveau classement

---

## 4. SPÉCIFICATIONS TECHNIQUES

### 4.1 Architecture
**Type** : Progressive Web App (PWA)

**Stack technologique suggérée** :
- **Frontend** : React / Next.js
- **Backend** : Node.js / API REST ou GraphQL
- **Base de données** : PostgreSQL ou MongoDB
- **Hébergement** : Vercel, Railway, ou similaire
- **Authentification** : JWT ou session-based (admin uniquement)

### 4.2 Compatibilité
- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Responsive design (desktop, tablette, mobile)
- Mode hors ligne (PWA) pour consultation des données
- Optimisation pour affichage TV (vue spectateur)

### 4.3 Performance
- Temps de chargement < 2 secondes
- Timer précis au 1/10e de seconde
- Synchronisation temps réel (WebSocket) pour la vue spectateur
- Sauvegarde automatique des données du tournoi en cours

### 4.4 Sécurité
- Authentification de l'administrateur
- Protection des routes d'administration
- Sauvegarde automatique des données
- Export/Import de backup

---

## 5. INTERFACE UTILISATEUR

### 5.1 Navigation principale (Admin)

**Menu** :
1. **Dashboard** : Vue d'ensemble, prochain tournoi, TOP 3 actuel
2. **Tournois** : Calendrier, créer, historique
3. **Joueurs** : Liste, ajouter, gérer
4. **Classement** : Vue générale, détails par joueur
5. **Statistiques** : Tous les stats et records
6. **Paramètres** : Configuration générale, saisons, templates

### 5.2 Workflow d'un tournoi

```
1. Création du tournoi
   ↓
2. Configuration (blindes, options, recaves)
   ↓
3. Inscription des joueurs
   ↓
4. Répartition des tables
   ↓
5. Démarrage du tournoi
   ↓
6. Gestion en direct (recaves, éliminations, timer)
   ↓
7. Fin de phase de recave → Config des gains
   ↓
8. Phase finale (élimination directe)
   ↓
9. Clôture et calcul des points
   ↓
10. Export des résultats
```

### 5.3 Wireframes prioritaires

**Écrans critiques** :
1. Vue spectateur TV (timer + infos live)
2. Panneau de contrôle du tournoi en cours
3. Classement général avec variations
4. Fiche récapitulative de tournoi

---

## 6. SUGGESTIONS D'AMÉLIORATION

### 6.1 Gamification additionnelle
**Badges et achievements** :
- Attribution automatique de badges selon les performances
- Ex: "Première victoire", "10 tournois joués", "Hat-trick" (3 victoires consécutives)
- Affichage sur le profil joueur

**Rivalités et duels** :
- Détection automatique des "rivalités" (joueurs qui s'affrontent souvent)
- Statistiques de duel A vs B (qui gagne le plus souvent)
- "Ennemi juré" : joueur qui vous élimine le plus

### 6.2 Prédictions et projections
**Calcul dynamique** :
- Projection du classement si X gagne ce soir
- "Il faut finir Xème pour dépasser Y au classement"
- Simulateur de fin de saison

### 6.3 Mode "Invité"
**Gestion des joueurs ponctuels** :
- Créer un joueur "invité" pour un tournoi unique
- Ne compte pas dans le classement championnat
- Utile si vous avez un ami de passage

### 6.4 Historique des confrontations
**"Head to Head"** :
- Bilan détaillé entre 2 joueurs
- Qui a le plus éliminé l'autre
- Graphique d'évolution de leur classement respectif

### 6.5 Export avancé
**Kit de communication** :
- Template Instagram Story (format 9:16) avec résultats
- Template post LinkedIn/Facebook
- QR Code vers le classement en ligne

### 6.6 Mode "Blind Timer" uniquement
**Usage simplifié** :
- Utiliser l'app juste comme timer de blindes
- Sans gestion des joueurs ni du classement
- Utile pour tournois ponctuels informels

### 6.7 Intégration Telegram/WhatsApp Bot (V2)
**Automatisation** :
- Bot qui poste automatiquement les résultats dans le groupe
- Commande `/classement` pour voir le TOP 5
- Commande `/nextgame` pour voir le prochain tournoi
- Rappels automatiques

---

## 7. PRIORISATION DES DÉVELOPPEMENTS

### Phase 1 - MVP (Minimum Viable Product)
**Fonctionnalités essentielles** :
- ✅ CRUD Joueurs
- ✅ Création et gestion d'un tournoi
- ✅ Timer avec structure de blindes
- ✅ Vue spectateur TV
- ✅ Gestion des recaves et éliminations
- ✅ Calcul des points selon les règles
- ✅ Classement général
- ✅ Export PDF/Image des résultats

**Délai estimé** : 4-6 semaines

### Phase 2 - Améliorations
**Fonctionnalités avancées** :
- ✅ Statistiques complètes
- ✅ Top Sharks et stats ludiques
- ✅ Gestion multi-saisons
- ✅ Templates de structures
- ✅ Système de meilleures performances
- ✅ Graphiques et évolutions

**Délai estimé** : 2-3 semaines

### Phase 3 - Features bonus
**Nice to have** :
- Badges et achievements
- Mode invité
- Prédictions de classement
- Intégrations tierces (WhatsApp bot)
- Kit de communication

**Délai estimé** : Au fil de l'eau

---

## 8. LIVRABLES ATTENDUS

### 8.1 Code source
- Repository Git avec historique
- Documentation technique (README)
- Instructions d'installation et déploiement
- Variables d'environnement (.env.example)

### 8.2 Documentation utilisateur
- Guide administrateur (création tournoi, paramétrage)
- Guide de démarrage rapide
- FAQ

### 8.3 Design
- Charte graphique sobre et moderne
- Pictos en outline (lucide-react recommandé)
- Mode sombre privilégié pour la vue TV
- Responsive

---

## 9. CRITÈRES D'ACCEPTATION

### 9.1 Fonctionnels
- ✅ Un administrateur peut créer et gérer un tournoi de A à Z
- ✅ Le timer fonctionne de manière précise et fluide
- ✅ Les points sont calculés correctement selon les règles
- ✅ Les exports PDF/images sont générés sans erreur
- ✅ Le classement est mis à jour automatiquement après chaque tournoi
- ✅ La vue spectateur est lisible depuis 3+ mètres (TV)

### 9.2 Techniques
- ✅ L'application fonctionne sur tous les navigateurs modernes
- ✅ Aucune perte de données en cas de fermeture de navigateur pendant un tournoi
- ✅ L'app est responsive (mobile, tablette, desktop)
- ✅ Temps de chargement < 2s sur connexion standard

### 9.3 UX
- ✅ L'interface est intuitive (pas de formation nécessaire)
- ✅ Les actions critiques demandent confirmation
- ✅ Les messages d'erreur sont explicites
- ✅ Le workflow d'un tournoi est fluide et logique

---

## 10. ANNEXES

### Annexe A : Glossaire
- **BB** : Big Blind (grosse blinde)
- **SB** : Small Blind (petite blinde)
- **Ante** : Mise obligatoire pour tous les joueurs à chaque main
- **Recave** : Rachat de jetons après avoir perdu son stack
- **Stack** : Nombre de jetons d'un joueur
- **Average** : Stack moyen de tous les joueurs restants
- **Prize Pool** : Montant total des gains à répartir
- **ROI** : Return On Investment (retour sur investissement)

### Annexe B : Exemple de barème de points complet
```
Classement:
#1  → 1500 pts
#2  → 1000 pts
#3  → 700 pts
#4  → 500 pts
#5  → 400 pts
#6  → 300 pts
#7  → 250 pts
#8  → 200 pts
#9  → 200 pts
#10 → 200 pts
#11-15 → 100 pts
#16+ → 50 pts

Éliminations (après fin recave):
+50 pts par élimination

Bonus:
+25 pts pour élimination du leader

Malus recaves:
0-2 recaves : 0
3 recaves : -50 pts
4 recaves : -100 pts
5+ recaves : -150 pts
```

### Annexe C : Exemple de structure de tournoi
```
Structure 3h - 20 joueurs - 5000 jetons
====================================
Cave: 10€ → 5000 jetons
Durée des niveaux: 12 minutes

Niveau 1  : 10/20
Niveau 2  : 15/30
Niveau 3  : 25/50
Niveau 4  : 50/100
Niveau 5  : 75/150
Niveau 6  : 100/200
← FIN DES RECAVES
Niveau 7  : 150/300 (ante 25)
Niveau 8  : 200/400 (ante 50)
Niveau 9  : 300/600 (ante 75)
Niveau 10 : 400/800 (ante 100)
Niveau 11 : 600/1200 (ante 150)
Niveau 12 : 800/1600 (ante 200)
Niveau 13 : 1000/2000 (ante 300)
Niveau 14 : 1500/3000 (ante 400)
Niveau 15 : 2000/4000 (ante 500)
```

---

## NOTES FINALES

### Points d'attention pour le développement
1. **Sauvegarde du tournoi en cours** : Crucial ! Si le navigateur se ferme, on doit pouvoir reprendre exactement où on en était
2. **Timer précis** : Utiliser `setInterval` côté serveur ou `requestAnimationFrame` côté client
3. **Vue spectateur en temps réel** : WebSocket ou Server-Sent Events pour la synchronisation
4. **Calcul des points** : Bien tester tous les cas de figure (leader killer, recaves, etc.)
5. **Export images** : Utiliser html2canvas ou domtoimage pour convertir le HTML en image

### Évolutions futures possibles
- Application mobile native (React Native)
- Mode multi-championnat (gérer plusieurs groupes)
- Système de cash game (en plus des tournois)
- Marketplace de structures de tournois
- API publique pour intégrations tierces

---

**Prêt à coder ! 🎰♠️♥️♣️♦️**