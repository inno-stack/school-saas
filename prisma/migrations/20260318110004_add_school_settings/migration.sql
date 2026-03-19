-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "motto" TEXT,
ADD COLUMN     "resultPin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showPosition" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "termName" TEXT NOT NULL DEFAULT 'Term',
ADD COLUMN     "website" TEXT;
