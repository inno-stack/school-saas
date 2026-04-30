/**
 * @file src/app/api/results/cumulative/route.ts
 * @description Fetches cumulative result for a student in a session.
 * Used by admin dashboard to view/print cumulative reports.
 */

import { requireAuth } from "@/lib/auth-guard";
import {
  calculateCumulativePositions,
  calculateCumulativeResult,
} from "@/lib/cumulative-engine";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/results/cumulative?studentId=x&sessionId=y ─
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const sessionId = searchParams.get("sessionId");

    if (!studentId || !sessionId) {
      return errorResponse("studentId and sessionId are required", 400);
    }

    // ── Verify student belongs to this school ──────
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: auth!.schoolId },
      select: { id: true, classId: true },
    });

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // ── Calculate cumulative result ────────────────
    const cumulative = await calculateCumulativeResult(
      studentId,
      sessionId,
      auth!.schoolId,
    );

    if (!cumulative) {
      return errorResponse(
        "No published results found for this student in this session.",
        404,
      );
    }

    // ── Calculate class position ───────────────────
    const positions = await calculateCumulativePositions(
      cumulative.classId,
      sessionId,
      auth!.schoolId,
    );

    const pos = positions.get(studentId);
    if (pos) {
      cumulative.summary.position = getOrdinal(pos.position);
      cumulative.summary.outOf = pos.outOf;
    }

    return successResponse(
      cumulative,
      "Cumulative result calculated successfully",
    );
  } catch (err) {
    console.error("[CUMULATIVE_RESULT]", err);
    return errorResponse("Internal server error", 500);
  }
}
