import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { linkChildSchema } from "@/validators/parent.validator";
import { NextRequest } from "next/server";

// ── POST /api/parent/link-child ────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = linkChildSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { parentId, studentId } = parsed.data;

    // ── Verify parent belongs to this school ───────
    const parent = await prisma.user.findFirst({
      where: {
        id: parentId,
        schoolId: auth!.schoolId,
        role: "PARENT",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!parent) {
      return errorResponse("Parent not found in this school", 404);
    }

    // ── Verify student belongs to this school ──────
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: auth!.schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        regNumber: true,
      },
    });

    if (!student) {
      return errorResponse("Student not found in this school", 404);
    }

    // ── Check if already linked ────────────────────
    const existing = await prisma.parentStudent.findUnique({
      where: {
        parentId_studentId: { parentId, studentId },
      },
    });

    if (existing) {
      return errorResponse(
        `${parent.firstName} is already linked to ${student.firstName}`,
        409,
      );
    }

    // ── Create link ────────────────────────────────
    const link = await prisma.parentStudent.create({
      data: {
        parentId,
        studentId,
        schoolId: auth!.schoolId,
      },
    });

    return successResponse(
      {
        link,
        parent: {
          id: parent.id,
          name: `${parent.firstName} ${parent.lastName}`,
          email: parent.email,
        },
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          regNumber: student.regNumber,
        },
      },
      `${parent.firstName} ${parent.lastName} successfully linked to ${student.firstName} ${student.lastName}`,
      201,
    );
  } catch (err) {
    console.error("[LINK_CHILD]", err);
    return errorResponse("Internal server error", 500);
  }
}
