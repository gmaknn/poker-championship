-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BustEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "eliminatedId" TEXT NOT NULL,
    "killerId" TEXT,
    "level" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recaveApplied" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BustEvent_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BustEvent_eliminatedId_fkey" FOREIGN KEY ("eliminatedId") REFERENCES "TournamentPlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BustEvent_killerId_fkey" FOREIGN KEY ("killerId") REFERENCES "TournamentPlayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BustEvent" ("createdAt", "eliminatedId", "id", "killerId", "level", "tournamentId") SELECT "createdAt", "eliminatedId", "id", "killerId", "level", "tournamentId" FROM "BustEvent";
DROP TABLE "BustEvent";
ALTER TABLE "new_BustEvent" RENAME TO "BustEvent";
CREATE INDEX "BustEvent_tournamentId_idx" ON "BustEvent"("tournamentId");
CREATE INDEX "BustEvent_eliminatedId_idx" ON "BustEvent"("eliminatedId");
CREATE INDEX "BustEvent_killerId_idx" ON "BustEvent"("killerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
