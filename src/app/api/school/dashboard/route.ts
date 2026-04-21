import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ─── GET /api/school/dashboard ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    // Parallel queries for performance
    const [totalTeachers, totalParents, totalStudents, totalResults, school] =
      await Promise.all([
        prisma.user.count({
          where: { schoolId: auth!.schoolId, role: "TEACHER", isActive: true },
        }),
        prisma.user.count({
          where: { schoolId: auth!.schoolId, role: "PARENT", isActive: true },
        }),
        prisma.student.count({
          where: { schoolId: auth!.schoolId, status: "ACTIVE" },
        }),
        prisma.result.count({
          where: { schoolId: auth!.schoolId, isPublished: true },
        }),
        prisma.school.findUnique({
          where: { id: auth!.schoolId },
          select: { name: true, slug: true, createdAt: true },
        }),
      ]);

    return successResponse(
      {
        school,
        stats: {
          totalTeachers,
          totalParents,
          totalStudents,
          totalResults,
        },
      },
      "Dashboard data fetched successfully",
    );
  } catch (err) {
    console.error("[GET_DASHBOARD]", err);
    return errorResponse("Internal server error", 500);
  }
}
