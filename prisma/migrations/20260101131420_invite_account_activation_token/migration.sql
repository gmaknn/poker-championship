-- CreateTable
CREATE TABLE "AccountActivationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountActivationToken_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
-- Migrer les joueurs existants en conservant leur statut (les existants restent ACTIVE)
-- Les nouveaux joueurs créés après cette migration seront INACTIVE par défaut
INSERT INTO "new_Player" ("avatar", "createdAt", "email", "firstName", "id", "lastName", "nickname", "role", "status", "updatedAt", "password")
SELECT "avatar", "createdAt", "email", "firstName", "id", "lastName", "nickname", "role",
       CASE WHEN "status" = 'ACTIVE' THEN 'ACTIVE' WHEN "status" = 'ARCHIVED' THEN 'ARCHIVED' ELSE 'ACTIVE' END,
       "updatedAt", NULL
FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_nickname_key" ON "Player"("nickname");
CREATE INDEX "Player_status_idx" ON "Player"("status");
CREATE INDEX "Player_nickname_idx" ON "Player"("nickname");
CREATE INDEX "Player_role_idx" ON "Player"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AccountActivationToken_tokenHash_key" ON "AccountActivationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountActivationToken_playerId_idx" ON "AccountActivationToken"("playerId");

-- CreateIndex
CREATE INDEX "AccountActivationToken_expiresAt_idx" ON "AccountActivationToken"("expiresAt");
