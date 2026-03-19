import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { createSubjectSchema } from "@/validators/class.validator";
import { NextRequest } from "next/server";

// ── GET /api/classes/[id]/subjects ─────────────────
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
    const { id: classId } = await params;

    // Verify class belongs to this school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: auth!.schoolId },
    });

    if (!cls) {
      return errorResponse("Class not found", 404);
    }

    const subjects = await prisma.subject.findMany({
      where: { classId, schoolId: auth!.schoolId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
      },
    });

    return successResponse(
      { class: { id: cls.id, name: cls.name }, subjects },
      "Subjects fetched successfully",
    );
  } catch (err) {
    console.error("[GET_SUBJECTS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── POST /api/classes/[id]/subjects ────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id: classId } = await params;
    const body = await req.json();

    const parsed = createSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { name, code } = parsed.data;

    // Verify class belongs to this school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId: auth!.schoolId },
    });

    if (!cls) {
      return errorResponse("Class not found", 404);
    }

    // Check duplicate subject name within this class
    const existing = await prisma.subject.findUnique({
      where: {
        name_classId: { name, classId },
      },
    });

    if (existing) {
      return errorResponse(
        `Subject "${name}" already exists in ${cls.name}`,
        409,
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code,
        classId,
        schoolId: auth!.schoolId,
      },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
      },
    });

    return successResponse(subject, "Subject created successfully", 201);
  } catch (err) {
    console.error("[CREATE_SUBJECT]", err);
    return errorResponse("Internal server error", 500);
  }
}
