-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "randomTargetPlayerId" TEXT;
ALTER TABLE "Tournament" ADD COLUMN "seasonTopSharkAtStartId" TEXT;

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
    "isTopSharkLeaderKill" BOOLEAN NOT NULL DEFAULT false,
    "isRandomTargetKill" BOOLEAN NOT NULL DEFAULT false,
    "isAutoElimination" BOOLEAN NOT NULL DEFAULT false,
    "isAbandonment" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Elimination_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Elimination_eliminatedId_fkey" FOREIGN KEY ("eliminatedId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Elimination_eliminatorId_fkey" FOREIGN KEY ("eliminatorId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Elimination" ("createdAt", "eliminatedId", "eliminatorId", "id", "isAbandonment", "isAutoElimination", "isLeaderKill", "level", "rank", "tournamentId") SELECT "createdAt", "eliminatedId", "eliminatorId", "id", "isAbandonment", "isAutoElimination", "isLeaderKill", "level", "rank", "tournamentId" FROM "Elimination";
DROP TABLE "Elimination";
ALTER TABLE "new_Elimination" RENAME TO "Elimination";
CREATE INDEX "Elimination_tournamentId_idx" ON "Elimination"("tournamentId");
CREATE INDEX "Elimination_eliminatedId_idx" ON "Elimination"("eliminatedId");
CREATE INDEX "Elimination_eliminatorId_idx" ON "Elimination"("eliminatorId");
CREATE TABLE "new_Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pointsFirst" INTEGER NOT NULL DEFAULT 1500,
    "pointsSecond" INTEGER NOT NULL DEFAULT 1000,
    "pointsThird" INTEGER NOT NULL DEFAULT 700,
    "pointsFourth" INTEGER NOT NULL DEFAULT 500,
    "pointsFifth" INTEGER NOT NULL DEFAULT 400,
    "pointsSixth" INTEGER NOT NULL DEFAULT 300,
    "pointsSeventh" INTEGER NOT NULL DEFAULT 200,
    "pointsEighth" INTEGER NOT NULL DEFAULT 200,
    "pointsNinth" INTEGER NOT NULL DEFAULT 200,
    "pointsTenth" INTEGER NOT NULL DEFAULT 200,
    "pointsEleventh" INTEGER NOT NULL DEFAULT 100,
    "pointsSixteenth" INTEGER NOT NULL DEFAULT 50,
    "eliminationPoints" INTEGER NOT NULL DEFAULT 50,
    "bustEliminationBonus" INTEGER NOT NULL DEFAULT 25,
    "leaderKillerBonus" INTEGER NOT NULL DEFAULT 25,
    "topSharkLeaderBonus" INTEGER NOT NULL DEFAULT 25,
    "randomKillerBonus" INTEGER NOT NULL DEFAULT 25,
    "freeRebuysCount" INTEGER NOT NULL DEFAULT 2,
    "rebuyPenaltyTier1" INTEGER NOT NULL DEFAULT -50,
    "rebuyPenaltyTier2" INTEGER NOT NULL DEFAULT -100,
    "rebuyPenaltyTier3" INTEGER NOT NULL DEFAULT -150,
    "recavePenaltyTiers" JSONB,
    "detailedPointsConfig" JSONB,
    "totalTournamentsCount" INTEGER,
    "bestTournamentsCount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Season" ("bestTournamentsCount", "bustEliminationBonus", "createdAt", "detailedPointsConfig", "eliminationPoints", "endDate", "freeRebuysCount", "id", "leaderKillerBonus", "name", "pointsEighth", "pointsEleventh", "pointsFifth", "pointsFirst", "pointsFourth", "pointsNinth", "pointsSecond", "pointsSeventh", "pointsSixteenth", "pointsSixth", "pointsTenth", "pointsThird", "rebuyPenaltyTier1", "rebuyPenaltyTier2", "rebuyPenaltyTier3", "recavePenaltyTiers", "startDate", "status", "totalTournamentsCount", "updatedAt", "year") SELECT "bestTournamentsCount", "bustEliminationBonus", "createdAt", "detailedPointsConfig", "eliminationPoints", "endDate", "freeRebuysCount", "id", "leaderKillerBonus", "name", "pointsEighth", "pointsEleventh", "pointsFifth", "pointsFirst", "pointsFourth", "pointsNinth", "pointsSecond", "pointsSeventh", "pointsSixteenth", "pointsSixth", "pointsTenth", "pointsThird", "rebuyPenaltyTier1", "rebuyPenaltyTier2", "rebuyPenaltyTier3", "recavePenaltyTiers", "startDate", "status", "totalTournamentsCount", "updatedAt", "year" FROM "Season";
DROP TABLE "Season";
ALTER TABLE "new_Season" RENAME TO "Season";
CREATE INDEX "Season_status_idx" ON "Season"("status");
CREATE INDEX "Season_year_idx" ON "Season"("year");
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
    "topSharkLeaderKills" INTEGER NOT NULL DEFAULT 0,
    "randomTargetKills" INTEGER NOT NULL DEFAULT 0,
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
INSERT INTO "new_TournamentPlayer" ("bonusPoints", "bustEliminations", "createdAt", "currentStack", "eliminationPoints", "eliminationsCount", "finalRank", "hasPaid", "id", "leaderKills", "lightRebuyUsed", "penaltyPoints", "playerId", "prizeAmount", "rankPoints", "rebuysCount", "totalPoints", "tournamentId", "updatedAt", "voluntaryFullRebuyUsed") SELECT "bonusPoints", "bustEliminations", "createdAt", "currentStack", "eliminationPoints", "eliminationsCount", "finalRank", "hasPaid", "id", "leaderKills", "lightRebuyUsed", "penaltyPoints", "playerId", "prizeAmount", "rankPoints", "rebuysCount", "totalPoints", "tournamentId", "updatedAt", "voluntaryFullRebuyUsed" FROM "TournamentPlayer";
DROP TABLE "TournamentPlayer";
ALTER TABLE "new_TournamentPlayer" RENAME TO "TournamentPlayer";
CREATE INDEX "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId");
CREATE INDEX "TournamentPlayer_playerId_idx" ON "TournamentPlayer"("playerId");
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_finalRank_key" ON "TournamentPlayer"("tournamentId", "finalRank");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
