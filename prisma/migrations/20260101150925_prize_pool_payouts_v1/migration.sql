-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "prizePayoutCount" INTEGER;
ALTER TABLE "Tournament" ADD COLUMN "prizePayoutPercents" JSONB;
ALTER TABLE "Tournament" ADD COLUMN "prizePayoutUpdatedAt" DATETIME;
