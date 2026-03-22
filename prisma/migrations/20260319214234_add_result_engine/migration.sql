-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('A', 'B', 'C', 'P', 'F');

-- CreateEnum
CREATE TYPE "SkillRating" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'VERY_POOR');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('PSYCHOMOTOR', 'SOCIAL');

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" INTEGER,
    "outOf" INTEGER NOT NULL DEFAULT 0,
    "performance" TEXT,
    "daysOpen" INTEGER,
    "daysPresent" INTEGER,
    "daysAbsent" INTEGER,
    "vacationDate" TIMESTAMP(3),
    "resumptionDate" TIMESTAMP(3),
    "teacherComment" TEXT,
    "principalComment" TEXT,
    "teacherName" TEXT,
    "principalName" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_items" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "caScore" DOUBLE PRECISION,
    "examScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "grade" "Grade",
    "remark" TEXT,
    "description" TEXT,
    "positionInClass" INTEGER,
    "classAverage" DOUBLE PRECISION,

    CONSTRAINT "result_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "result_skills" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "rating" "SkillRating",

    CONSTRAINT "result_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "results_schoolId_idx" ON "results"("schoolId");

-- CreateIndex
CREATE INDEX "results_classId_termId_idx" ON "results"("classId", "termId");

-- CreateIndex
CREATE INDEX "results_studentId_idx" ON "results"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "results_studentId_termId_key" ON "results"("studentId", "termId");

-- CreateIndex
CREATE INDEX "result_items_resultId_idx" ON "result_items"("resultId");

-- CreateIndex
CREATE INDEX "result_items_subjectId_idx" ON "result_items"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "result_items_resultId_subjectId_key" ON "result_items"("resultId", "subjectId");

-- CreateIndex
CREATE INDEX "result_skills_resultId_idx" ON "result_skills"("resultId");

-- CreateIndex
CREATE UNIQUE INDEX "result_skills_resultId_name_key" ON "result_skills"("resultId", "name");

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_termId_fkey" FOREIGN KEY ("termId") REFERENCES "terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_items" ADD CONSTRAINT "result_items_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_items" ADD CONSTRAINT "result_items_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_items" ADD CONSTRAINT "result_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_skills" ADD CONSTRAINT "result_skills_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "result_skills" ADD CONSTRAINT "result_skills_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
