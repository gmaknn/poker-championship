# 🚀 Guide de Déploiement sur Fly.io (Gratuit)

## 📋 Prérequis

- Compte Fly.io (gratuit)
- Carte bancaire (pour vérification, pas débitée)
- Git installé

---

## 🔧 Installation de Fly CLI

### Windows (PowerShell)
```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Linux/Mac
```bash
curl -L https://fly.io/install.sh | sh
```

Redémarrez votre terminal après l'installation.

---

## 🎯 Déploiement Étape par Étape

### 1. S'authentifier sur Fly.io

```bash
# Créer un compte (première fois)
fly auth signup

# OU se connecter si vous avez déjà un compte
fly auth login
```

### 2. Lancer l'application

```bash
cd C:\Users\gmakn\projets\poker-championship

# Lancer l'application (Fly.io va détecter automatiquement le Dockerfile)
fly launch

# Répondre aux questions :
# - App name : wpt-villelaure (ou laissez fly générer)
# - Region : cdg (Paris) ou lhr (Londres) - le plus proche
# - Create a Postgres database? : Non
# - Create a Redis database? : Non
```

### 3. Créer le volume pour la base de données

```bash
# Créer un volume de 1GB pour stocker SQLite
fly volumes create poker_data --region cdg --size 1
```

### 4. Configurer les variables d'environnement

```bash
# Si vous avez une clé Anthropic pour l'IA
fly secrets set ANTHROPIC_API_KEY="sk-ant-votre-cle"
```

### 5. Déployer !

```bash
fly deploy

# ⏳ Attendez 2-3 minutes...
# ✅ Déploiement terminé !
```

### 6. Ouvrir l'application

```bash
fly open

# Votre app est accessible à : https://wpt-villelaure.fly.dev
```

---

## 📊 Initialiser la base de données avec des données de test

Une fois l'app déployée, vous pouvez seed la base de données :

```bash
# Se connecter à la machine Fly
fly ssh console

# Dans le conteneur :
cd /app
npx tsx prisma/seed-complete.ts

# Quitter
exit
```

---

## 🔄 Mises à jour futures

Après chaque modification de votre code :

```bash
# 1. Commit vos changements
git add .
git commit -m "Nouvelle fonctionnalité"

# 2. Déployer
fly deploy

# ✅ Mise à jour en ~2 minutes
```

---

## 🛠️ Commandes utiles

### Voir les logs en temps réel
```bash
fly logs
```

### Statut de l'application
```bash
fly status
```

### Voir les infos de l'app
```bash
fly info
```

### Redémarrer l'application
```bash
fly apps restart wpt-villelaure
```

### SSH dans le conteneur
```bash
fly ssh console
```

### Voir les volumes
```bash
fly volumes list
```

### Sauvegarder la base de données

```bash
# Télécharger la base SQLite
fly sftp get /data/dev.db ./backup-$(date +%Y%m%d).db
```

### Restaurer une sauvegarde

```bash
# Upload une sauvegarde
fly sftp put ./backup-20251112.db /data/dev.db

# Redémarrer
fly apps restart wpt-villelaure
```

---

## 📱 Partager l'application

**URL publique :** https://wpt-villelaure.fly.dev

Vos joueurs peuvent :
1. Visiter l'URL
2. Cliquer sur "Installer l'application" (PWA)
3. Utiliser l'app même hors ligne

---

## 🎛️ Panneau de contrôle

Fly.io Dashboard : https://fly.io/dashboard

Vous pouvez y voir :
- Métriques (CPU, RAM, réseau)
- Logs
- Volumes
- Coût (normalement $0 !)

---

## 💰 Limites du plan gratuit

**Ce qui est inclus gratuitement :**
- ✅ 3 machines partagées
- ✅ 160GB de trafic/mois
- ✅ Volumes persistants (3GB)
- ✅ HTTPS automatique
- ✅ Déploiements illimités

**Au-delà :**
- Machines supplémentaires : ~$2/mois
- Trafic : $0.02/GB
- Stockage : $0.15/GB/mois

**Pour votre usage (championnat local) : vous resterez à $0 !**

---

## 🆘 Dépannage

### L'app ne démarre pas ?

```bash
# Voir les logs
fly logs

# Vérifier le status
fly status

# Redémarrer
fly apps restart
```

### Base de données vide après déploiement ?

```bash
# SSH dans le conteneur
fly ssh console

# Initialiser la base
npx prisma db push

# Seeder si nécessaire
npx tsx prisma/seed-complete.ts
```

### Volume non monté ?

```bash
# Vérifier les volumes
fly volumes list

# Le volume doit être attaché à la machine
fly volumes show poker_data
```

### "Out of memory" ?

Augmentez la RAM (passe à payant ~$2/mois) :
```bash
fly scale memory 1024
```

---

## 🔒 Sécurité

### Sauvegardes automatiques

Créez un cron job local pour sauvegarder régulièrement :

**Windows (Task Scheduler) :**
```powershell
# backup-poker.ps1
cd C:\backups-poker
fly sftp get /data/dev.db backup-$(Get-Date -Format "yyyyMMdd").db
```

**Linux (crontab) :**
```bash
# Tous les jours à 3h du matin
0 3 * * * cd /home/backups && fly sftp get /data/dev.db backup-$(date +\%Y\%m\%d).db
```

### Variables d'environnement sensibles

Ne jamais commit dans Git :
- `.env`
- Clés API
- Secrets

Utilisez `fly secrets set` à la place.

---

## 🌟 Alternative : Cloudflare Tunnel (Si vous préférez garder l'app chez vous)

Si vous avez un PC qui tourne H24 :

```bash
# 1. Installer Cloudflared
winget install Cloudflare.cloudflared

# 2. Lancer un tunnel temporaire
cloudflared tunnel --url http://localhost:3003

# Vous obtenez une URL publique gratuite !
# Ex: https://abc-def-ghi.trycloudflare.com
```

**Avantages :**
- 100% gratuit
- Pas de limite de trafic
- Contrôle total
- Base SQLite locale

**Inconvénients :**
- PC doit rester allumé
- IP publique exposée (protégée par Cloudflare)

---

## ✅ Checklist Post-Déploiement

- [ ] Application accessible publiquement
- [ ] Base de données initialisée
- [ ] Admin créé (scripts/create-admin.js)
- [ ] PWA installable sur mobile
- [ ] Mode offline fonctionne
- [ ] Sauvegarde manuelle effectuée
- [ ] URL partagée avec vos joueurs

---

## 🎉 Vous êtes prêt !

Votre championnat de poker est maintenant accessible depuis n'importe où, gratuitement, et fonctionne même hors ligne !

**URL de votre app :** https://wpt-villelaure.fly.dev

Bon jeu ! 🎰♠️♥️♣️♦️
