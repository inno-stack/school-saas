import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateStudentSchema } from "@/validators/student.validator";
import { NextRequest } from "next/server";

// ── GET /api/students/[id] ─────────────────────────
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

    const student = await prisma.student.findFirst({
      where: { id, schoolId: auth!.schoolId }, // ← tenant isolation
      select: {
        id: true,
        regNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        gender: true,
        dateOfBirth: true,
        photo: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    return successResponse(student, "Student fetched successfully");
  } catch (err) {
    console.error("[GET_STUDENT]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/students/[id] ─────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    // Ensure student belongs to this school
    const existing = await prisma.student.findFirst({
      where: { id, schoolId: auth!.schoolId },
    });

    if (!existing) {
      return errorResponse("Student not found", 404);
    }

    // If updating parentId, verify parent belongs to same school
    if (parsed.data.parentId) {
      const parent = await prisma.user.findFirst({
        where: {
          id: parsed.data.parentId,
          schoolId: auth!.schoolId,
          role: "PARENT",
        },
      });

      if (!parent) {
        return errorResponse("Parent not found in this school", 404);
      }
    }

    const { dateOfBirth, ...rest } = parsed.data;

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined && {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        }),
      },
      select: {
        id: true,
        regNumber: true,
        firstName: true,
        lastName: true,
        middleName: true,
        gender: true,
        dateOfBirth: true,
        photo: true,
        address: true,
        status: true,
        updatedAt: true,
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    return successResponse(updated, "Student updated successfully");
  } catch (err) {
    console.error("[UPDATE_STUDENT]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/students/[id] ──────────────────────
// Soft delete → sets status to INACTIVE
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.student.findFirst({
      where: { id, schoolId: auth!.schoolId },
    });

    if (!existing) {
      return errorResponse("Student not found", 404);
    }

    await prisma.student.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return successResponse(null, "Student deactivated successfully");
  } catch (err) {
    console.error("[DELETE_STUDENT]", err);
    return errorResponse("Internal server error", 500);
  }
}
