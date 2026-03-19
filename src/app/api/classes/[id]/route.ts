import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateClassSchema } from "@/validators/class.validator";
import { NextRequest } from "next/server";

// ── GET /api/classes/[id] ──────────────────────────
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

    const cls = await prisma.class.findFirst({
      where: { id, schoolId: auth!.schoolId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        subjects: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: { subjects: true },
        },
      },
    });

    if (!cls) {
      return errorResponse("Class not found", 404);
    }

    const { _count, ...rest } = cls;

    return successResponse(
      { ...rest, totalSubjects: _count.subjects },
      "Class fetched successfully",
    );
  } catch (err) {
    console.error("[GET_CLASS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/classes/[id] ──────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = updateClassSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const existing = await prisma.class.findFirst({
      where: { id, schoolId: auth!.schoolId },
    });

    if (!existing) {
      return errorResponse("Class not found", 404);
    }

    // If renaming, check the new name isn't already taken
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.class.findUnique({
        where: {
          name_schoolId: {
            name: parsed.data.name,
            schoolId: auth!.schoolId,
          },
        },
      });

      if (duplicate) {
        return errorResponse(
          `Class "${parsed.data.name}" already exists in this school`,
          409,
        );
      }
    }

    const updated = await prisma.class.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "Class updated successfully");
  } catch (err) {
    console.error("[UPDATE_CLASS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/classes/[id] ───────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.class.findFirst({
      where: { id, schoolId: auth!.schoolId },
      include: { _count: { select: { subjects: true } } },
    });

    if (!existing) {
      return errorResponse("Class not found", 404);
    }

    // Warn if class has subjects (cascade will delete them)
    // Hard delete is safe here — classes have no result history yet
    await prisma.class.delete({ where: { id } });

    return successResponse(null, "Class deleted successfully");
  } catch (err) {
    console.error("[DELETE_CLASS]", err);
    return errorResponse("Internal server error", 500);
  }
}
