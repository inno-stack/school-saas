import { requireAuth } from "@/lib/auth-guard";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/parent/children/[studentId]/results ───
// All published results across all terms for a child
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { auth, error } = requireAuth(req, [
    "PARENT",
    "SCHOOL_ADMIN",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { studentId } = await params;

    // ── Verify parent-child link ───────────────────
    if (auth!.role === "PARENT") {
      const link = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: auth!.userId,
            studentId,
          },
        },
      });

      if (!link) {
        return errorResponse("You are not linked to this student", 403);
      }
    }

    // Verify student is in this school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: auth!.schoolId },
      select: {
        firstName: true,
        lastName: true,
        regNumber: true,
      },
    });

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // Fetch all published results
    const results = await prisma.result.findMany({
      where: {
        studentId,
        schoolId: auth!.schoolId,
        isPublished: true, // parents only see published
      },
      orderBy: [{ session: { name: "desc" } }, { term: { name: "asc" } }],
      select: {
        id: true,
        totalScore: true,
        average: true,
        position: true,
        outOf: true,
        performance: true,
        createdAt: true,
        term: {
          select: { id: true, name: true },
        },
        session: {
          select: { id: true, name: true },
        },
        class: {
          select: { name: true },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    const formatted = results.map(({ _count, ...result }) => ({
      ...result,
      termLabel:
        result.term.name === "FIRST"
          ? "1st Term"
          : result.term.name === "SECOND"
            ? "2nd Term"
            : "3rd Term",
      position: result.position ? getOrdinal(result.position) : null,
      subjectsCount: _count.items,
    }));

    return successResponse(
      {
        student: {
          name: `${student.firstName} ${student.lastName}`,
          regNumber: student.regNumber,
        },
        totalResults: formatted.length,
        results: formatted,
      },
      "Results fetched successfully",
    );
  } catch (err) {
    console.error("[GET_CHILD_RESULTS]", err);
    return errorResponse("Internal server error", 500);
  }
}
