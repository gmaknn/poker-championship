-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tournament" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT,
    "createdById" TEXT,
    "name" TEXT,
    "date" DATETIME NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CHAMPIONSHIP',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "buyInAmount" REAL NOT NULL DEFAULT 10,
    "startingChips" INTEGER NOT NULL DEFAULT 5000,
    "targetDuration" INTEGER NOT NULL DEFAULT 180,
    "lightRebuyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lightRebuyMinBB" INTEGER NOT NULL DEFAULT 30,
    "lightRebuyAmount" REAL NOT NULL DEFAULT 5,
    "levelDuration" INTEGER NOT NULL DEFAULT 12,
    "rebuyEndLevel" INTEGER,
    "maxRebuysPerPlayer" INTEGER,
    "prizePool" REAL,
    "prizeDistribution" JSONB,
    "prizePayoutCount" INTEGER,
    "prizePayoutPercents" JSONB,
    "prizePayoutUpdatedAt" DATETIME,
    "prizePoolAdjustment" REAL NOT NULL DEFAULT 0,
    "prizePoolAdjustmentReason" TEXT,
    "totalPlayers" INTEGER,
    "tablesCount" INTEGER,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "timerStartedAt" DATETIME,
    "timerPausedAt" DATETIME,
    "timerElapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "finishedAt" DATETIME,
    CONSTRAINT "Tournament_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Tournament_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Tournament" ("buyInAmount", "createdAt", "createdById", "currentLevel", "date", "finishedAt", "id", "levelDuration", "lightRebuyAmount", "lightRebuyEnabled", "lightRebuyMinBB", "maxRebuysPerPlayer", "name", "prizeDistribution", "prizePayoutCount", "prizePayoutPercents", "prizePayoutUpdatedAt", "prizePool", "rebuyEndLevel", "seasonId", "startingChips", "status", "tablesCount", "targetDuration", "timerElapsedSeconds", "timerPausedAt", "timerStartedAt", "totalPlayers", "type", "updatedAt") SELECT "buyInAmount", "createdAt", "createdById", "currentLevel", "date", "finishedAt", "id", "levelDuration", "lightRebuyAmount", "lightRebuyEnabled", "lightRebuyMinBB", "maxRebuysPerPlayer", "name", "prizeDistribution", "prizePayoutCount", "prizePayoutPercents", "prizePayoutUpdatedAt", "prizePool", "rebuyEndLevel", "seasonId", "startingChips", "status", "tablesCount", "targetDuration", "timerElapsedSeconds", "timerPausedAt", "timerStartedAt", "totalPlayers", "type", "updatedAt" FROM "Tournament";
DROP TABLE "Tournament";
ALTER TABLE "new_Tournament" RENAME TO "Tournament";
CREATE INDEX "Tournament_seasonId_idx" ON "Tournament"("seasonId");
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");
CREATE INDEX "Tournament_date_idx" ON "Tournament"("date");
CREATE INDEX "Tournament_createdById_idx" ON "Tournament"("createdById");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
