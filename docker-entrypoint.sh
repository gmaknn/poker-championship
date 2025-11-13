#!/bin/sh
set -e

echo "🚀 Starting Poker Championship App..."

# Créer le dossier data s'il n'existe pas
mkdir -p /data

# Si la base de données n'existe pas, l'initialiser
if [ ! -f /data/dev.db ]; then
    echo "📊 Initializing database..."
    npx prisma db push --accept-data-loss
    echo "✅ Database initialized"
else
    echo "✅ Database already exists"
fi

# Lancer l'application
echo "🎰 Starting Next.js server..."
exec npm start
