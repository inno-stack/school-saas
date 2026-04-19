/*
  Warnings:

  - The values [UNUSED,USED] on the enum `CardStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `usedAt` on the `scratch_cards` table. All the data in the column will be lost.
  - You are about to drop the column `usedBy` on the `scratch_cards` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `scratch_cards` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CardStatus_new" AS ENUM ('ACTIVE', 'EXHAUSTED', 'DISABLED');
ALTER TABLE "public"."scratch_cards" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "scratch_cards" ALTER COLUMN "status" TYPE "CardStatus_new" USING ("status"::text::"CardStatus_new");
ALTER TYPE "CardStatus" RENAME TO "CardStatus_old";
ALTER TYPE "CardStatus_new" RENAME TO "CardStatus";
DROP TYPE "public"."CardStatus_old";
ALTER TABLE "scratch_cards" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropIndex
DROP INDEX "scratch_cards_serial_idx";

-- AlterTable
ALTER TABLE "scratch_cards" DROP COLUMN "usedAt",
DROP COLUMN "usedBy",
ADD COLUMN     "maxUses" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "sessionId" TEXT NOT NULL,
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "card_usages" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_usages_cardId_idx" ON "card_usages"("cardId");

-- CreateIndex
CREATE INDEX "card_usages_studentId_idx" ON "card_usages"("studentId");

-- CreateIndex
CREATE INDEX "scratch_cards_sessionId_idx" ON "scratch_cards"("sessionId");

-- AddForeignKey
ALTER TABLE "scratch_cards" ADD CONSTRAINT "scratch_cards_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_usages" ADD CONSTRAINT "card_usages_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "scratch_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_usages" ADD CONSTRAINT "card_usages_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_usages" ADD CONSTRAINT "card_usages_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_usages" ADD CONSTRAINT "card_usages_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
