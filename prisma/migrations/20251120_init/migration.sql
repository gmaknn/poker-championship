warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

Loaded Prisma config from prisma.config.ts.

warn The Prisma config file in prisma.config.ts overrides the deprecated `package.json#prisma` property in package.json.
  For more information, see: https://pris.ly/prisma-config

-- CreateEnum
CREATE TYPE "PlayerRole" AS ENUM ('PLAYER', 'TOURNAMENT_DIRECTOR', 'ANIMATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TournamentType" AS ENUM ('CHAMPIONSHIP', 'CASUAL');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('PLANNED', 'REGISTRATION', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT,
    "avatar" TEXT,
    "status" "PlayerStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "PlayerRole" NOT NULL DEFAULT 'PLAYER',
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "activationToken" TEXT,
    "activationTokenExpiry" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "resetPasswordTokenExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SeasonStatus" NOT NULL DEFAULT 'ACTIVE',
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
    "leaderKillerBonus" INTEGER NOT NULL DEFAULT 25,
    "freeRebuysCount" INTEGER NOT NULL DEFAULT 2,
    "rebuyPenaltyTier1" INTEGER NOT NULL DEFAULT -50,
    "rebuyPenaltyTier2" INTEGER NOT NULL DEFAULT -100,
    "rebuyPenaltyTier3" INTEGER NOT NULL DEFAULT -150,
    "totalTournamentsCount" INTEGER,
    "bestTournamentsCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT,
    "createdById" TEXT,
    "name" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "TournamentType" NOT NULL DEFAULT 'CHAMPIONSHIP',
    "status" "TournamentStatus" NOT NULL DEFAULT 'PLANNED',
    "buyInAmount" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "startingChips" INTEGER NOT NULL DEFAULT 5000,
    "targetDuration" INTEGER NOT NULL DEFAULT 180,
    "lightRebuyEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lightRebuyMinBB" INTEGER NOT NULL DEFAULT 30,
    "lightRebuyAmount" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "levelDuration" INTEGER NOT NULL DEFAULT 12,
    "rebuyEndLevel" INTEGER,
    "prizePool" DOUBLE PRECISION,
    "prizeDistribution" JSONB,
    "totalPlayers" INTEGER,
    "tablesCount" INTEGER,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "timerStartedAt" TIMESTAMP(3),
    "timerPausedAt" TIMESTAMP(3),
    "timerElapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "hasPaid" BOOLEAN NOT NULL DEFAULT false,
    "finalRank" INTEGER,
    "rebuysCount" INTEGER NOT NULL DEFAULT 0,
    "lightRebuyUsed" BOOLEAN NOT NULL DEFAULT false,
    "eliminationsCount" INTEGER NOT NULL DEFAULT 0,
    "leaderKills" INTEGER NOT NULL DEFAULT 0,
    "rankPoints" INTEGER NOT NULL DEFAULT 0,
    "eliminationPoints" INTEGER NOT NULL DEFAULT 0,
    "bonusPoints" INTEGER NOT NULL DEFAULT 0,
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "prizeAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlindLevel" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "smallBlind" INTEGER NOT NULL,
    "bigBlind" INTEGER NOT NULL,
    "ante" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 12,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "rebalanceTables" BOOLEAN NOT NULL DEFAULT false,
    "isRebuyEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlindLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableAssignment" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "seatNumber" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Elimination" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "eliminatedId" TEXT NOT NULL,
    "eliminatorId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "isLeaderKill" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Elimination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetDuration" INTEGER,
    "startingChips" INTEGER,
    "levelDuration" INTEGER,
    "rebuyEndLevel" INTEGER,
    "structure" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipInventory" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChipInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChipSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipSetDenomination" (
    "id" TEXT NOT NULL,
    "chipSetId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "colorSecondary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChipSetDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentChipConfig" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "chipSetsUsed" JSONB NOT NULL,
    "distribution" JSONB NOT NULL,
    "playersCount" INTEGER NOT NULL,
    "stackSize" INTEGER NOT NULL,
    "rebuysExpected" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentChipConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChipDenomination" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT,
    "value" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "colorSecondary" TEXT,
    "quantity" INTEGER,
    "order" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChipDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "championshipName" TEXT NOT NULL DEFAULT 'POKER CHAMPIONSHIP',
    "clubName" TEXT NOT NULL DEFAULT 'WPT VILLELAURE',
    "clubLogo" TEXT,
    "defaultBuyIn" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "defaultStartingChips" INTEGER NOT NULL DEFAULT 5000,
    "defaultLevelDuration" INTEGER NOT NULL DEFAULT 12,
    "defaultTargetDuration" INTEGER NOT NULL DEFAULT 180,
    "enableEmailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "enableSmsNotifications" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Player_nickname_key" ON "Player"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Player_activationToken_key" ON "Player"("activationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Player_resetPasswordToken_key" ON "Player"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "Player_status_idx" ON "Player"("status");

-- CreateIndex
CREATE INDEX "Player_nickname_idx" ON "Player"("nickname");

-- CreateIndex
CREATE INDEX "Player_role_idx" ON "Player"("role");

-- CreateIndex
CREATE INDEX "Player_email_idx" ON "Player"("email");

-- CreateIndex
CREATE INDEX "Player_activationToken_idx" ON "Player"("activationToken");

-- CreateIndex
CREATE INDEX "Player_resetPasswordToken_idx" ON "Player"("resetPasswordToken");

-- CreateIndex
CREATE INDEX "Season_status_idx" ON "Season"("status");

-- CreateIndex
CREATE INDEX "Season_year_idx" ON "Season"("year");

-- CreateIndex
CREATE INDEX "Tournament_seasonId_idx" ON "Tournament"("seasonId");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Tournament_date_idx" ON "Tournament"("date");

-- CreateIndex
CREATE INDEX "Tournament_createdById_idx" ON "Tournament"("createdById");

-- CreateIndex
CREATE INDEX "TournamentPlayer_tournamentId_idx" ON "TournamentPlayer"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentPlayer_playerId_idx" ON "TournamentPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_playerId_key" ON "TournamentPlayer"("tournamentId", "playerId");

-- CreateIndex
CREATE INDEX "BlindLevel_tournamentId_idx" ON "BlindLevel"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "BlindLevel_tournamentId_level_key" ON "BlindLevel"("tournamentId", "level");

-- CreateIndex
CREATE INDEX "TableAssignment_tournamentId_idx" ON "TableAssignment"("tournamentId");

-- CreateIndex
CREATE INDEX "TableAssignment_tournamentId_tableNumber_idx" ON "TableAssignment"("tournamentId", "tableNumber");

-- CreateIndex
CREATE INDEX "Elimination_tournamentId_idx" ON "Elimination"("tournamentId");

-- CreateIndex
CREATE INDEX "Elimination_eliminatedId_idx" ON "Elimination"("eliminatedId");

-- CreateIndex
CREATE INDEX "Elimination_eliminatorId_idx" ON "Elimination"("eliminatorId");

-- CreateIndex
CREATE INDEX "TournamentTemplate_name_idx" ON "TournamentTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChipInventory_value_key" ON "ChipInventory"("value");

-- CreateIndex
CREATE INDEX "ChipSet_isActive_idx" ON "ChipSet"("isActive");

-- CreateIndex
CREATE INDEX "ChipSetDenomination_chipSetId_idx" ON "ChipSetDenomination"("chipSetId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentChipConfig_tournamentId_key" ON "TournamentChipConfig"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentChipConfig_tournamentId_idx" ON "TournamentChipConfig"("tournamentId");

-- CreateIndex
CREATE INDEX "ChipDenomination_tournamentId_idx" ON "ChipDenomination"("tournamentId");

-- CreateIndex
CREATE INDEX "ChipDenomination_isDefault_idx" ON "ChipDenomination"("isDefault");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlindLevel" ADD CONSTRAINT "BlindLevel_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableAssignment" ADD CONSTRAINT "TableAssignment_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Elimination" ADD CONSTRAINT "Elimination_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Elimination" ADD CONSTRAINT "Elimination_eliminatedId_fkey" FOREIGN KEY ("eliminatedId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Elimination" ADD CONSTRAINT "Elimination_eliminatorId_fkey" FOREIGN KEY ("eliminatorId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipSetDenomination" ADD CONSTRAINT "ChipSetDenomination_chipSetId_fkey" FOREIGN KEY ("chipSetId") REFERENCES "ChipSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentChipConfig" ADD CONSTRAINT "TournamentChipConfig_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChipDenomination" ADD CONSTRAINT "ChipDenomination_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

