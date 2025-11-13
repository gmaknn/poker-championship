# Étape 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci

# Copier le reste du code
COPY . .

# Générer Prisma Client (DATABASE_URL factice pour la génération)
ENV DATABASE_URL="file:/tmp/dev.db"
RUN npx prisma generate

# Builder l'application
RUN npm run build

# Étape 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Copier seulement ce qui est nécessaire
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3003
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/data/dev.db"

# Exposer le port
EXPOSE 3003

# Script de démarrage
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
