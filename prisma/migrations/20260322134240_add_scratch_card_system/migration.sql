-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('UNUSED', 'USED', 'DISABLED');

-- CreateTable
CREATE TABLE "scratch_cards" (
    "id" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'UNUSED',
    "schoolId" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scratch_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scratch_cards_serial_key" ON "scratch_cards"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "scratch_cards_pin_key" ON "scratch_cards"("pin");

-- CreateIndex
CREATE INDEX "scratch_cards_schoolId_idx" ON "scratch_cards"("schoolId");

-- CreateIndex
CREATE INDEX "scratch_cards_pin_idx" ON "scratch_cards"("pin");

-- CreateIndex
CREATE INDEX "scratch_cards_serial_idx" ON "scratch_cards"("serial");

-- AddForeignKey
ALTER TABLE "scratch_cards" ADD CONSTRAINT "scratch_cards_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
