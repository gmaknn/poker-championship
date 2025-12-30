#!/bin/sh
set -e

echo "Starting Poker Championship App..."

# Create data folder if it doesn't exist
mkdir -p /data

# Run Prisma migrations (safe, idempotent operation)
# This applies any pending migrations without data loss
# TEMPORARILY DISABLED for prod baseline - will be re-enabled after baseline
if [ "$SKIP_MIGRATIONS" = "1" ]; then
  echo "Skipping migrations (SKIP_MIGRATIONS=1)"
else
  echo "Running database migrations..."
  npx prisma migrate deploy
  echo "Database migrations complete"
fi

# Start the application
echo "Starting Next.js server..."
exec npm start
