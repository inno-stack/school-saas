import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateSubjectSchema } from "@/validators/class.validator";
import { NextRequest } from "next/server";

// ── PUT /api/classes/[id]/subjects/[subjectId] ─────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id: classId, subjectId } = await params;
    const body = await req.json();

    const parsed = updateSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    // Verify subject belongs to this school + class
    const existing = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        classId,
        schoolId: auth!.schoolId,
      },
    });

    if (!existing) {
      return errorResponse("Subject not found", 404);
    }

    // If renaming, check for duplicates in the same class
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.subject.findUnique({
        where: {
          name_classId: {
            name: parsed.data.name,
            classId,
          },
        },
      });

      if (duplicate) {
        return errorResponse(
          `Subject "${parsed.data.name}" already exists in this class`,
          409,
        );
      }
    }

    const updated = await prisma.subject.update({
      where: { id: subjectId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        code: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "Subject updated successfully");
  } catch (err) {
    console.error("[UPDATE_SUBJECT]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/classes/[id]/subjects/[subjectId] ──
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subjectId: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id: classId, subjectId } = await params;

    const existing = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        classId,
        schoolId: auth!.schoolId,
      },
    });

    if (!existing) {
      return errorResponse("Subject not found", 404);
    }

    await prisma.subject.delete({ where: { id: subjectId } });

    return successResponse(null, "Subject deleted successfully");
  } catch (err) {
    console.error("[DELETE_SUBJECT]", err);
    return errorResponse("Internal server error", 500);
  }
}
