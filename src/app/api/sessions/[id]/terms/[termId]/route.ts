import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateTermSchema } from "@/validators/session.validator";
import { NextRequest } from "next/server";

// ── PUT /api/sessions/[id]/terms/[termId] ──────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id: sessionId, termId } = await params;
    const body = await req.json();

    const parsed = updateTermSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const existing = await prisma.term.findFirst({
      where: { id: termId, sessionId, schoolId: auth!.schoolId },
    });

    if (!existing) {
      return errorResponse("Term not found", 404);
    }

    if (existing.isActive && parsed.data.name) {
      return errorResponse("Cannot rename an active term", 400);
    }

    // Check duplicate term name in same session
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.term.findUnique({
        where: {
          name_sessionId: {
            name: parsed.data.name,
            sessionId,
          },
        },
      });

      if (duplicate) {
        return errorResponse(`This term already exists in this session`, 409);
      }
    }

    const updated = await prisma.term.update({
      where: { id: termId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "Term updated successfully");
  } catch (err) {
    console.error("[UPDATE_TERM]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/sessions/[id]/terms/[termId] ───────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; termId: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id: sessionId, termId } = await params;

    const existing = await prisma.term.findFirst({
      where: { id: termId, sessionId, schoolId: auth!.schoolId },
    });

    if (!existing) {
      return errorResponse("Term not found", 404);
    }

    if (existing.isActive) {
      return errorResponse(
        "Cannot delete the active term. Activate another term first.",
        400,
      );
    }

    await prisma.term.delete({ where: { id: termId } });

    return successResponse(null, "Term deleted successfully");
  } catch (err) {
    console.error("[DELETE_TERM]", err);
    return errorResponse("Internal server error", 500);
  }
}
