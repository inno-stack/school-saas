import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── POST /api/sessions/[id]/activate ──────────────
// Only ONE session can be active per school at a time
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const session = await prisma.session.findFirst({
      where: { id, schoolId: auth!.schoolId },
    });

    if (!session) {
      return errorResponse("Session not found", 404);
    }

    if (session.isActive) {
      return errorResponse("Session is already active", 400);
    }

    // ── Atomic: deactivate all → activate one ─────
    await prisma.$transaction([
      // Step 1: Deactivate ALL sessions for this school
      prisma.session.updateMany({
        where: { schoolId: auth!.schoolId },
        data: { isActive: false },
      }),
      // Step 2: Deactivate ALL terms for this school
      // (switching session means no term is active yet)
      prisma.term.updateMany({
        where: { schoolId: auth!.schoolId },
        data: { isActive: false },
      }),
      // Step 3: Activate the selected session
      prisma.session.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    const updated = await prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        terms: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    return successResponse(updated, `Session "${session.name}" is now active`);
  } catch (err) {
    console.error("[ACTIVATE_SESSION]", err);
    return errorResponse("Internal server error", 500);
  }
}
