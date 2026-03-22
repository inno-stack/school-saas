import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

const TERM_LABEL: Record<string, string> = {
  FIRST: "1st Term",
  SECOND: "2nd Term",
  THIRD: "3rd Term",
};

// ── POST /api/sessions/[id]/terms/[termId]/activate
// Only ONE term can be active per school at a time
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id: sessionId, termId } = await params;

    // Verify term belongs to this session + school
    const term = await prisma.term.findFirst({
      where: {
        id: termId,
        sessionId,
        schoolId: auth!.schoolId,
      },
      include: { session: true },
    });

    if (!term) {
      return errorResponse("Term not found", 404);
    }

    if (term.isActive) {
      return errorResponse("This term is already active", 400);
    }

    // The term's session must be the active session
    if (!term.session.isActive) {
      return errorResponse(
        `Session "${term.session.name}" is not active. Activate the session first.`,
        400,
      );
    }

    // ── Atomic: deactivate all terms → activate one ─
    await prisma.$transaction([
      // Step 1: Deactivate ALL terms for this school
      prisma.term.updateMany({
        where: { schoolId: auth!.schoolId },
        data: { isActive: false },
      }),
      // Step 2: Activate the selected term
      prisma.term.update({
        where: { id: termId },
        data: { isActive: true },
      }),
    ]);

    const updated = await prisma.term.findUnique({
      where: { id: termId },
      select: {
        id: true,
        name: true,
        isActive: true,
        session: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    return successResponse(
      updated,
      `${TERM_LABEL[term.name]} of ${term.session.name} is now active`,
    );
  } catch (err) {
    console.error("[ACTIVATE_TERM]", err);
    return errorResponse("Internal server error", 500);
  }
}
