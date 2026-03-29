# Poker Championship - Le Cyclope

Application web progressive (PWA) de gestion de championnat de poker Texas Hold'em No Limit.

## Fonctionnalités

### Phase 1 - MVP (Implémenté)
- ✅ Gestion des joueurs (CRUD)
- ✅ Authentification administrateur
- ✅ Dashboard avec vue d'ensemble
- ✅ Structure de base de données complète
- ✅ Interface utilisateur moderne avec Tailwind CSS

### À venir
- Création et gestion de tournois
- Timer de blindes avec structure personnalisable
- Vue spectateur pour affichage TV
- Gestion des recaves et éliminations
- Système de points et classement
- Statistiques avancées
- Export PDF/Images des résultats

## Stack Technologique

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4
- **Backend**: Next.js API Routes
- **Base de données**: PostgreSQL avec Prisma ORM
- **Authentification**: NextAuth.js v5
- **UI Components**: Radix UI, Lucide Icons

## Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

## Installation

1. **Cloner le projet** (si applicable)
   ```bash
   cd poker-championship
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration de la base de données**

   Créez une base de données PostgreSQL :
   ```sql
   CREATE DATABASE poker_championship;
   ```

4. **Variables d'environnement**

   Copiez le fichier `.env.example` en `.env` et configurez :
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/poker_championship"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="votre-secret-aleatoire"
   ```

5. **Initialiser la base de données**
   ```bash
   # Générer le client Prisma
   npm run db:generate

   # Créer les tables
   npm run db:push

   # Peupler avec les données initiales
   npm run db:seed
   ```

6. **Lancer le serveur de développement**
   ```bash
   npm run dev
   ```

7. **Accéder à l'application**

   Ouvrez [http://localhost:3002](http://localhost:3002)

## Identifiants par défaut

Après le seed de la base de données :

- **Email**: `admin@poker.com`
- **Mot de passe**: `admin123`

⚠️ **Important**: Changez ces identifiants en production !

## Dev Login (Local Only)

Pour les tests E2E en local sans connaître les identifiants :

1. **Activer le dev login** dans `.env.local` :
   ```bash
   NEXT_PUBLIC_DEV_LOGIN=1
   ```

2. **Aller sur `/login`** - un bouton "Connexion Admin (local)" apparaît

3. **Cliquer** - crée automatiquement un compte `admin@local.test` et connecte

**Sécurité** : Ce mécanisme est désactivé automatiquement si :
- `NODE_ENV` n'est pas `development`
- `NEXT_PUBLIC_DEV_LOGIN` n'est pas `1`
- La requête ne vient pas de `localhost`

## Scripts disponibles

```bash
npm run dev          # Lancer le serveur de développement
npm run build        # Compiler pour la production
npm run start        # Lancer en production
npm run db:generate  # Générer le client Prisma
npm run db:push      # Pousser le schéma vers la DB
npm run db:seed      # Peupler la base de données
npm run db:studio    # Ouvrir Prisma Studio (GUI)
```

## Structure du projet

```
poker-championship/
├── prisma/
│   ├── schema.prisma      # Schéma de la base de données
│   └── seed.ts            # Script d'initialisation
├── src/
│   ├── app/
│   │   ├── api/           # Routes API
│   │   ├── dashboard/     # Pages du dashboard
│   │   ├── login/         # Page de connexion
│   │   └── layout.tsx     # Layout principal
│   ├── components/
│   │   ├── ui/            # Composants UI réutilisables
│   │   └── layout/        # Composants de layout
│   ├── lib/
│   │   ├── auth.ts        # Configuration NextAuth
│   │   ├── prisma.ts      # Client Prisma
│   │   └── utils.ts       # Fonctions utilitaires
│   └── types/
│       └── index.ts       # Types TypeScript
└── package.json
```

## Base de données

Le schéma Prisma inclut les modèles suivants :

- **User** : Comptes administrateurs
- **Player** : Joueurs du championnat
- **Season** : Saisons de championnat
- **Tournament** : Tournois
- **TournamentPlayer** : Participation aux tournois
- **BlindLevel** : Structure des blindes
- **Elimination** : Historique des éliminations
- **TableAssignment** : Répartition des tables
- **TournamentTemplate** : Templates de structures
- **ChipInventory** : Inventaire des jetons

## Développement

### Ajouter un nouveau joueur

1. Connectez-vous avec les identifiants admin
2. Allez dans "Joueurs" dans le menu
3. Cliquez sur "Ajouter un joueur"
4. Remplissez le formulaire

### Visualiser la base de données

```bash
npm run db:studio
```

Ouvre Prisma Studio sur [http://localhost:5555](http://localhost:5555)

## Déploiement

### Prérequis production

1. Base de données PostgreSQL (Supabase, Railway, etc.)
2. Plateforme d'hébergement (Vercel, Railway, etc.)

### Variables d'environnement production

```bash
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://votre-domaine.com
NEXTAUTH_SECRET=secret-securise-aleatoire
NODE_ENV=production
```

### Build

```bash
npm run build
npm run start
```

## Support

Pour toute question ou problème, consultez le cahier des charges dans `cahier_des_charges_poker_championship.md`

## Licence

Projet privé - Le Cyclope © 2025
