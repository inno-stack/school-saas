import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/parent/children ───────────────────────
// Parent views their own linked children
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "PARENT",
    "SCHOOL_ADMIN",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    // If SCHOOL_ADMIN, they can pass ?parentId=xxx to view
    // any parent's children. If PARENT, force their own ID.
    const { searchParams } = new URL(req.url);
    const targetParentId =
      auth!.role === "PARENT"
        ? auth!.userId
        : (searchParams.get("parentId") ?? auth!.userId);

    const links = await prisma.parentStudent.findMany({
      where: {
        parentId: targetParentId,
        schoolId: auth!.schoolId,
      },
      include: {
        student: {
          select: {
            id: true,
            regNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            gender: true,
            dateOfBirth: true,
            photo: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (links.length === 0) {
      return successResponse(
        { children: [] },
        "No children linked to this account yet",
      );
    }

    // Get latest result summary for each child
    const children = await Promise.all(
      links.map(async (link) => {
        const latestResult = await prisma.result.findFirst({
          where: {
            studentId: link.studentId,
            schoolId: auth!.schoolId,
            isPublished: true,
          },
          orderBy: { createdAt: "desc" },
          select: {
            average: true,
            performance: true,
            position: true,
            outOf: true,
            term: { select: { name: true } },
            session: { select: { name: true } },
          },
        });

        return {
          ...link.student,
          fullName: `${link.student.firstName} ${link.student.lastName}`,
          latestResult: latestResult
            ? {
                average: latestResult.average,
                performance: latestResult.performance,
                position: latestResult.position,
                outOf: latestResult.outOf,
                term: latestResult.term.name,
                session: latestResult.session.name,
              }
            : null,
        };
      }),
    );

    return successResponse(
      { total: children.length, children },
      "Children fetched successfully",
    );
  } catch (err) {
    console.error("[GET_CHILDREN]", err);
    return errorResponse("Internal server error", 500);
  }
}
