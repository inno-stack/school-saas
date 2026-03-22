import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/results/class?classId=xxx ─────────────
// Get all results for a class in the active term
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return errorResponse("classId query parameter is required", 400);
    }

    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { session, term } = activePeriod!;

    // Verify class belongs to this school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: auth!.schoolId },
    });
    if (!cls) {
      return errorResponse("Class not found", 404);
    }

    const results = await prisma.result.findMany({
      where: { classId, termId: term.id, schoolId: auth!.schoolId },
      orderBy: { position: "asc" },
      select: {
        id: true,
        totalScore: true,
        average: true,
        position: true,
        outOf: true,
        performance: true,
        isPublished: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            regNumber: true,
            gender: true,
          },
        },
        _count: { select: { items: true } },
      },
    });

    const data = results.map(({ _count, ...result }) => ({
      ...result,
      position: result.position ? getOrdinal(result.position) : null,
      subjectsEntered: _count.items,
    }));

    return successResponse(
      {
        class: { id: cls.id, name: cls.name },
        session: session.name,
        term: term.name,
        total: results.length,
        results: data,
      },
      "Class results fetched successfully",
    );
  } catch (err) {
    console.error("[GET_CLASS_RESULTS]", err);
    return errorResponse("Internal server error", 500);
  }
}
