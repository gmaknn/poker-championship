-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "avatar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INACTIVE',
    "role" TEXT NOT NULL DEFAULT 'PLAYER',
    "lastLoginAt" DATETIME,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Player" ("avatar", "createdAt", "email", "firstName", "id", "lastName", "nickname", "password", "phone", "role", "status", "updatedAt") SELECT "avatar", "createdAt", "email", "firstName", "id", "lastName", "nickname", "password", "phone", "role", "status", "updatedAt" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_nickname_key" ON "Player"("nickname");
CREATE UNIQUE INDEX "Player_phone_key" ON "Player"("phone");
CREATE INDEX "Player_status_idx" ON "Player"("status");
CREATE INDEX "Player_nickname_idx" ON "Player"("nickname");
CREATE INDEX "Player_role_idx" ON "Player"("role");
CREATE TABLE "new_TableAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "seatNumber" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isTableDirector" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TableAssignment_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TableAssignment" ("createdAt", "id", "isActive", "playerId", "seatNumber", "tableNumber", "tournamentId", "updatedAt") SELECT "createdAt", "id", "isActive", "playerId", "seatNumber", "tableNumber", "tournamentId", "updatedAt" FROM "TableAssignment";
DROP TABLE "TableAssignment";
ALTER TABLE "new_TableAssignment" RENAME TO "TableAssignment";
CREATE INDEX "TableAssignment_tournamentId_idx" ON "TableAssignment"("tournamentId");
CREATE INDEX "TableAssignment_tournamentId_tableNumber_idx" ON "TableAssignment"("tournamentId", "tableNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
