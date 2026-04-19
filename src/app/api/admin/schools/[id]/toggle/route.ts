import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── POST /api/admin/schools/[id]/toggle ────────────
// Enable or disable a school + invalidate all tokens
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const school = await prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, isActive: true },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    const newStatus = !school.isActive;

    // ── Atomic: toggle school + revoke all tokens ──
    await prisma.$transaction(async (tx) => {
      // Toggle school active status
      await tx.school.update({
        where: { id },
        data: { isActive: newStatus },
      });

      // If disabling — revoke ALL refresh tokens for
      // every user in this school (force logout everyone)
      if (!newStatus) {
        const schoolUsers = await tx.user.findMany({
          where: { schoolId: id },
          select: { id: true },
        });

        const userIds = schoolUsers.map((u) => u.id);

        if (userIds.length > 0) {
          await tx.token.deleteMany({
            where: { userId: { in: userIds } },
          });
        }
      }
    });

    return successResponse(
      {
        id: school.id,
        name: school.name,
        isActive: newStatus,
      },
      `School "${school.name}" has been ${
        newStatus ? "enabled ✅" : "disabled 🚫"
      }`,
    );
  } catch (err) {
    console.error("[ADMIN_TOGGLE_SCHOOL]", err);
    return errorResponse("Internal server error", 500);
  }
}
