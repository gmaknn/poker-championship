#!/bin/sh
set -e

echo "Starting Poker Championship App..."

# Create data folder if it doesn't exist
mkdir -p /data

# Create avatars directory in the persistent volume
# Fly.io only supports 1 volume per machine, so avatars go in /data
mkdir -p /data/avatars
chmod 755 /data/avatars
echo "Avatars directory ready at /data/avatars"

# Run Prisma migrations (safe, idempotent operation)
# This applies any pending migrations without data loss
echo "Running database migrations..."
npx prisma migrate deploy
echo "Database migrations complete"

# Start the application
echo "Starting Next.js server..."
exec npm start
