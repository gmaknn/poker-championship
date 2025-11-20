# Configuration de la base de données de production

## 🎯 Problème actuel
- L'app utilise SQLite localement (ne fonctionne pas sur Vercel)
- Besoin d'une base de données PostgreSQL pour la production

## ✅ Solution : Vercel Postgres

### 1. Créer une base de données Vercel Postgres

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet `poker-championship`
3. Allez dans l'onglet **Storage**
4. Cliquez sur **Create Database**
5. Choisissez **Postgres**
6. Sélectionnez la région (choisir la plus proche : Europe West)
7. Cliquez sur **Create**

### 2. Connecter la base de données au projet

Vercel va automatiquement ajouter ces variables d'environnement :
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL` (utilisez celle-ci pour Prisma)
- `POSTGRES_URL_NON_POOLING`

### 3. Mettre à jour le schema Prisma pour PostgreSQL

Modifiez `prisma/schema.prisma` :

```prisma
datasource db {
  provider = "postgresql"  // Change de "sqlite" à "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4. Ajouter la variable d'environnement DATABASE_URL

Dans les **Environment Variables** de Vercel :
- Nom: `DATABASE_URL`
- Valeur: `${POSTGRES_PRISMA_URL}` (référence automatique)

### 5. Déployer avec les migrations

Ajoutez un script dans `package.json` :

```json
"scripts": {
  "vercel-build": "prisma generate && prisma migrate deploy && next build"
}
```

### 6. Exécuter le seed pour créer l'admin

Via la console Vercel ou en local connecté à la prod :

```bash
# Connecter la base de données prod localement
# Copier POSTGRES_PRISMA_URL depuis Vercel
export DATABASE_URL="postgresql://..."

# Exécuter le seed
npm run db:seed
```

## 🔑 Identifiants admin par défaut

Après le seed, connectez-vous avec :
- **Email**: `admin@poker.com`
- **Password**: `admin123`

⚠️ **IMPORTANT** : Changez le mot de passe immédiatement après la première connexion !

---

## 📌 Alternative : Supabase (Gratuit + Généreux)

1. Créez un compte sur https://supabase.com
2. Créez un nouveau projet
3. Copiez la "Connection string" (format PostgreSQL)
4. Ajoutez-la comme variable d'environnement `DATABASE_URL` sur Vercel
5. Suivez les étapes 3-6 ci-dessus

---

## 🚀 Redéploiement

Après configuration :
```bash
git add .
git commit -m "Configure PostgreSQL for production"
git push
```

Vercel redéployera automatiquement avec la nouvelle base de données.
