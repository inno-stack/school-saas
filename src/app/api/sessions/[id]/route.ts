import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateSessionSchema } from "@/validators/session.validator";
import { NextRequest } from "next/server";

// ── GET /api/sessions/[id] ─────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { id } = await params;

    const session = await prisma.session.findFirst({
      where: { id, schoolId: auth!.schoolId },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        terms: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      return errorResponse("Session not found", 404);
    }

    return successResponse(session, "Session fetched successfully");
  } catch (err) {
    console.error("[GET_SESSION]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/sessions/[id] ─────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = updateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const existing = await prisma.session.findFirst({
      where: { id, schoolId: auth!.schoolId },
    });

    if (!existing) {
      return errorResponse("Session not found", 404);
    }

    // Can't rename an active session
    if (existing.isActive && parsed.data.name) {
      return errorResponse("Cannot rename an active session", 400);
    }

    // Check duplicate name if renaming
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.session.findUnique({
        where: {
          name_schoolId: {
            name: parsed.data.name,
            schoolId: auth!.schoolId,
          },
        },
      });

      if (duplicate) {
        return errorResponse(
          `Session "${parsed.data.name}" already exists`,
          409,
        );
      }
    }

    const updated = await prisma.session.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "Session updated successfully");
  } catch (err) {
    console.error("[UPDATE_SESSION]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/sessions/[id] ──────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.session.findFirst({
      where: { id, schoolId: auth!.schoolId },
      include: { _count: { select: { terms: true } } },
    });

    if (!existing) {
      return errorResponse("Session not found", 404);
    }

    // Can't delete the active session
    if (existing.isActive) {
      return errorResponse(
        "Cannot delete the active session. Deactivate it first by activating another session.",
        400,
      );
    }

    await prisma.session.delete({ where: { id } });

    return successResponse(null, "Session deleted successfully");
  } catch (err) {
    console.error("[DELETE_SESSION]", err);
    return errorResponse("Internal server error", 500);
  }
}
