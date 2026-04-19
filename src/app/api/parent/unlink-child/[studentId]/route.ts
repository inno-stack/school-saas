import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── DELETE /api/parent/unlink-child/[studentId] ────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { studentId } = await params;
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");

    if (!parentId) {
      return errorResponse("parentId query param is required", 400);
    }

    // Verify both belong to this school
    const link = await prisma.parentStudent.findFirst({
      where: {
        parentId,
        studentId,
        schoolId: auth!.schoolId,
      },
    });

    if (!link) {
      return errorResponse("Parent-student link not found", 404);
    }

    await prisma.parentStudent.delete({
      where: {
        parentId_studentId: { parentId, studentId },
      },
    });

    return successResponse(null, "Parent-student link removed successfully");
  } catch (err) {
    console.error("[UNLINK_CHILD]", err);
    return errorResponse("Internal server error", 500);
  }
}
