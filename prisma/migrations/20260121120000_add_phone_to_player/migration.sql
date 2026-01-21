-- AlterTable
ALTER TABLE "Player" ADD COLUMN "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Player_phone_key" ON "Player"("phone");
