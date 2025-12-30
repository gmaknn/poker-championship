-- Add isRebuyEnd column to BlindLevel table if it doesn't exist
-- This column was defined in schema but may be missing from production DB

-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we use a workaround: the migration will fail if column exists, which is fine
-- because prisma will mark it as applied anyway

ALTER TABLE "BlindLevel" ADD COLUMN "isRebuyEnd" BOOLEAN NOT NULL DEFAULT false;
