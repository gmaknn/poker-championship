-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Elimination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "eliminatedId" TEXT NOT NULL,
    "eliminatorId" TEXT,
    "rank" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "isLeaderKill" BOOLEAN NOT NULL DEFAULT false,
    "isAutoElimination" BOOLEAN NOT NULL DEFAULT false,
    "isAbandonment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Elimination_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Elimination_eliminatedId_fkey" FOREIGN KEY ("eliminatedId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Elimination_eliminatorId_fkey" FOREIGN KEY ("eliminatorId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Elimination" ("createdAt", "eliminatedId", "eliminatorId", "id", "isAutoElimination", "isLeaderKill", "level", "rank", "tournamentId") SELECT "createdAt", "eliminatedId", "eliminatorId", "id", "isAutoElimination", "isLeaderKill", "level", "rank", "tournamentId" FROM "Elimination";
DROP TABLE "Elimination";
ALTER TABLE "new_Elimination" RENAME TO "Elimination";
CREATE INDEX "Elimination_tournamentId_idx" ON "Elimination"("tournamentId");
CREATE INDEX "Elimination_eliminatedId_idx" ON "Elimination"("eliminatedId");
CREATE INDEX "Elimination_eliminatorId_idx" ON "Elimination"("eliminatorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
