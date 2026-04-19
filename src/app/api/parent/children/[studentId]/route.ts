import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/parent/children/[studentId] ───────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { auth, error } = requireAuth(req, [
    "PARENT",
    "SCHOOL_ADMIN",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { studentId } = await params;

    // Verify parent is linked to this student
    if (auth!.role === "PARENT") {
      const link = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: auth!.userId,
            studentId,
          },
        },
      });

      if (!link) {
        return errorResponse("You are not linked to this student", 403);
      }
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: auth!.schoolId },
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
        parentLinks: {
          include: {
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
        },
      },
    });

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    return successResponse(
      {
        ...student,
        fullName: `${student.firstName} ${student.lastName}${
          student.middleName ? " " + student.middleName : ""
        }`,
        parents: student.parentLinks.map((l) => l.parent),
      },
      "Student profile fetched successfully",
    );
  } catch (err) {
    console.error("[GET_CHILD_PROFILE]", err);
    return errorResponse("Internal server error", 500);
  }
}
