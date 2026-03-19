import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateUserSchema } from "@/validators/user.validator";
import { NextRequest } from "next/server";

// ── GET /api/users/teachers/[id] ───────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const teacher = await prisma.user.findFirst({
      where: {
        id,
        schoolId: auth!.schoolId, // ← tenant isolation
        role: "TEACHER",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        photo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!teacher) {
      return errorResponse("Teacher not found", 404);
    }

    return successResponse(teacher, "Teacher fetched successfully");
  } catch (err) {
    console.error("[GET_TEACHER]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/users/teachers/[id] ───────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    // Ensure teacher belongs to this school
    const existing = await prisma.user.findFirst({
      where: { id, schoolId: auth!.schoolId, role: "TEACHER" },
    });

    if (!existing) {
      return errorResponse("Teacher not found", 404);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        photo: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "Teacher updated successfully");
  } catch (err) {
    console.error("[UPDATE_TEACHER]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/users/teachers/[id] ───────────────
// Soft delete — deactivate instead of hard delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    // Prevent admin from deactivating themselves
    if (id === auth!.userId) {
      return errorResponse("You cannot deactivate your own account", 400);
    }

    const existing = await prisma.user.findFirst({
      where: { id, schoolId: auth!.schoolId, role: "TEACHER" },
    });

    if (!existing) {
      return errorResponse("Teacher not found", 404);
    }

    // Soft delete — keeps data intact, just blocks login
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(null, "Teacher deactivated successfully");
  } catch (err) {
    console.error("[DELETE_TEACHER]", err);
    return errorResponse("Internal server error", 500);
  }
}
