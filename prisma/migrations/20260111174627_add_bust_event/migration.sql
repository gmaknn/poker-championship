-- CreateTable
CREATE TABLE "BustEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "eliminatedId" TEXT NOT NULL,
    "killerId" TEXT,
    "level" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BustEvent_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BustEvent_eliminatedId_fkey" FOREIGN KEY ("eliminatedId") REFERENCES "TournamentPlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BustEvent_killerId_fkey" FOREIGN KEY ("killerId") REFERENCES "TournamentPlayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BustEvent_tournamentId_idx" ON "BustEvent"("tournamentId");

-- CreateIndex
CREATE INDEX "BustEvent_eliminatedId_idx" ON "BustEvent"("eliminatedId");

-- CreateIndex
CREATE INDEX "BustEvent_killerId_idx" ON "BustEvent"("killerId");
