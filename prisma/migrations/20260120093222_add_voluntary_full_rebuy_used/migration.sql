-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TournamentPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "hasPaid" BOOLEAN NOT NULL DEFAULT false,
    "finalRank" INTEGER,
    "rebuysCount" INTEGER NOT NULL DEFAULT 0,
    "lightRebuyUsed" BOOLEAN NOT NULL DEFAULT false,
    "voluntaryFullRebuyUsed" BOOLEAN NOT NULL DEFAULT false,
    "currentStack" INTEGER,
    "eliminationsCount" INTEGER NOT NULL DEFAULT 0,
    "bustEliminations" INTEGER NOT NULL DEFAULT 0,
    "leaderKills" INTEGER NOT NULL DEFAULT 0,
    "rankPoints" INTEGER NOT NULL DEFAULT 0,
    "eliminationPoints" INTEGER NOT NULL DEFAULT 0,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "prizeAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TournamentPlayer" ("bonusPoints", "bustEliminations", "createdAt", "currentStack", "eliminationPoints", "eliminationsCount", "finalRank", "hasPaid", "id", "leaderKills", "lightRebuyUsed", "penaltyPoints", "playerId", "prizeAmount", "rankPoints", "rebuysCount", "totalPoints", "tournamentId", "updatedAt") SELECT "bonusPoints", "bustEliminations", "createdAt", "currentStack", "eliminationPoints", "eliminationsCount", "finalRank", "hasPaid", "id", "leaderKills", "lightRebuyUsed", "penaltyPoints", "playerId", "prizeAmount", "rankPoints", "rebuysCount", "totalPoints", "tournamentId", "updatedAt" FROM "TournamentPlayer";
DROP TABLE "TournamentPlayer";
ALTER TABLE "new_TournamentPlayer" RENAME TO "TournamentPlayer";
CREATE INDEX "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId");
CREATE INDEX "TournamentPlayer_playerId_idx" ON "TournamentPlayer"("playerId");
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_finalRank_key" ON "TournamentPlayer"("tournamentId", "finalRank");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
