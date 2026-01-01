-- CreateTable
CREATE TABLE "PlayerRoleAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerRoleAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TournamentDirector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,
    CONSTRAINT "TournamentDirector_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TournamentDirector_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayerRoleAssignment_playerId_idx" ON "PlayerRoleAssignment"("playerId");

-- CreateIndex
CREATE INDEX "PlayerRoleAssignment_role_idx" ON "PlayerRoleAssignment"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerRoleAssignment_playerId_role_key" ON "PlayerRoleAssignment"("playerId", "role");

-- CreateIndex
CREATE INDEX "TournamentDirector_tournamentId_idx" ON "TournamentDirector"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentDirector_playerId_idx" ON "TournamentDirector"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentDirector_tournamentId_playerId_key" ON "TournamentDirector"("tournamentId", "playerId");
