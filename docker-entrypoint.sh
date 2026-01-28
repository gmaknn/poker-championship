#!/bin/sh
set -e

echo "Starting Poker Championship App..."

# Create data folder if it doesn't exist
mkdir -p /data

# Ensure avatars directory exists and is writable
# (mounted as volume, but may be empty on first deploy)
mkdir -p /app/public/avatars
chmod 755 /app/public/avatars

# Run Prisma migrations (safe, idempotent operation)
# This applies any pending migrations without data loss
echo "Running database migrations..."
npx prisma migrate deploy
echo "Database migrations complete"

# Start the application
echo "Starting Next.js server..."
exec npm start
