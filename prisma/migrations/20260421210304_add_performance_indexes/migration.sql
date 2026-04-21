-- CreateIndex
CREATE INDEX "results_isPublished_idx" ON "results"("isPublished");

-- CreateIndex
CREATE INDEX "results_termId_idx" ON "results"("termId");

-- CreateIndex
CREATE INDEX "scratch_cards_serial_idx" ON "scratch_cards"("serial");

-- CreateIndex
CREATE INDEX "scratch_cards_status_idx" ON "scratch_cards"("status");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE INDEX "students_schoolId_status_idx" ON "students"("schoolId", "status");
