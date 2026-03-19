import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateUserSchema } from "@/validators/user.validator";
import { NextRequest } from "next/server";

// ── GET /api/users/parents/[id] ────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const parent = await prisma.user.findFirst({
      where: { id, schoolId: auth!.schoolId, role: "PARENT" },
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

    if (!parent) {
      return errorResponse("Parent not found", 404);
    }

    return successResponse(parent, "Parent fetched successfully");
  } catch (err) {
    console.error("[GET_PARENT]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/users/parents/[id] ────────────────────
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

    const existing = await prisma.user.findFirst({
      where: { id, schoolId: auth!.schoolId, role: "PARENT" },
    });

    if (!existing) {
      return errorResponse("Parent not found", 404);
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

    return successResponse(updated, "Parent updated successfully");
  } catch (err) {
    console.error("[UPDATE_PARENT]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/users/parents/[id] ────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const existing = await prisma.user.findFirst({
      where: { id, schoolId: auth!.schoolId, role: "PARENT" },
    });

    if (!existing) {
      return errorResponse("Parent not found", 404);
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return successResponse(null, "Parent deactivated successfully");
  } catch (err) {
    console.error("[DELETE_PARENT]", err);
    return errorResponse("Internal server error", 500);
  }
}
