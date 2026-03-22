import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { calculateGrade, getOverallPerformance } from "@/lib/grade-engine";
import {
  recalculateClassPositions,
  recalculateSubjectPositions,
} from "@/lib/position-calculator";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { inputScoresSchema } from "@/validators/result.validator";
import { NextRequest } from "next/server";

// ── POST /api/results/scores ───────────────────────
// Input or update scores for a student (bulk by subject)
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = inputScoresSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { studentId, classId, scores } = parsed.data;

    // ── 1. Get active session + term ───────────────
    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { session, term } = activePeriod!;

    // ── 2. Verify student belongs to this school ───
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: auth!.schoolId },
    });
    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // ── 3. Verify class belongs to this school ─────
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: auth!.schoolId },
    });
    if (!cls) {
      return errorResponse("Class not found", 404);
    }

    // ── 4. Verify all subject IDs belong to this class
    const subjectIds = scores.map((s) => s.subjectId);
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        classId,
        schoolId: auth!.schoolId,
      },
    });

    if (subjects.length !== subjectIds.length) {
      return errorResponse("One or more subjects not found in this class", 404);
    }

    // ── 5. Upsert the parent Result record ─────────
    const result = await prisma.result.upsert({
      where: {
        studentId_termId: { studentId, termId: term.id },
      },
      create: {
        studentId,
        classId,
        sessionId: session.id,
        termId: term.id,
        schoolId: auth!.schoolId,
      },
      update: {}, // just ensure it exists
    });

    // ── 6. Upsert each subject score ───────────────
    const upsertedItems = await Promise.all(
      scores.map(async ({ subjectId, caScore, examScore }) => {
        const ca = caScore ?? 0;
        const exam = examScore ?? 0;
        const total = parseFloat((ca + exam).toFixed(2));

        const { grade, description, remark } = calculateGrade(total);

        return prisma.resultItem.upsert({
          where: {
            resultId_subjectId: {
              resultId: result.id,
              subjectId,
            },
          },
          create: {
            resultId: result.id,
            subjectId,
            schoolId: auth!.schoolId,
            caScore: ca,
            examScore: exam,
            totalScore: total,
            grade,
            description,
            remark,
          },
          update: {
            caScore: ca,
            examScore: exam,
            totalScore: total,
            grade,
            description,
            remark,
          },
        });
      }),
    );

    // ── 7. Recalculate result summary ──────────────
    const allItems = await prisma.resultItem.findMany({
      where: { resultId: result.id, totalScore: { not: null } },
      select: { totalScore: true },
    });

    const totalScore = parseFloat(
      allItems.reduce((sum, i) => sum + (i.totalScore ?? 0), 0).toFixed(2),
    );
    const average = parseFloat(
      (allItems.length > 0 ? totalScore / allItems.length : 0).toFixed(2),
    );
    const performance = getOverallPerformance(average);

    await prisma.result.update({
      where: { id: result.id },
      data: { totalScore, average, performance },
    });

    // ── 8. Recalculate positions ───────────────────
    await Promise.all([
      recalculateClassPositions(classId, term.id, auth!.schoolId),
      ...subjectIds.map((subjectId) =>
        recalculateSubjectPositions(
          classId,
          term.id,
          auth!.schoolId,
          subjectId,
        ),
      ),
    ]);

    return successResponse(
      {
        resultId: result.id,
        studentId,
        session: session.name,
        term: term.name,
        totalScore,
        average,
        performance,
        itemsUpdated: upsertedItems.length,
      },
      "Scores saved successfully",
      201,
    );
  } catch (err) {
    console.error("[INPUT_SCORES]", err);
    return errorResponse("Internal server error", 500);
  }
}
