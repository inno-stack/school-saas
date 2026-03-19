import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { createClassSchema } from "@/validators/class.validator";
import { NextRequest } from "next/server";

// ── GET /api/classes ───────────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";

    const classes = await prisma.class.findMany({
      where: {
        schoolId: auth!.schoolId,
        ...(search && {
          name: { contains: search, mode: "insensitive" },
        }),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: { subjects: true }, // ← subject count per class
        },
      },
    });

    // Reshape _count into a cleaner format
    const data = classes.map(({ _count, ...cls }) => ({
      ...cls,
      totalSubjects: _count.subjects,
    }));

    return successResponse(data, "Classes fetched successfully");
  } catch (err) {
    console.error("[GET_CLASSES]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── POST /api/classes ──────────────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = createClassSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { name, description } = parsed.data;

    // Check duplicate class name within this school
    const existing = await prisma.class.findUnique({
      where: {
        name_schoolId: { name, schoolId: auth!.schoolId },
      },
    });

    if (existing) {
      return errorResponse(
        `Class "${name}" already exists in this school`,
        409,
      );
    }

    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        schoolId: auth!.schoolId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      },
    });

    return successResponse(newClass, "Class created successfully", 201);
  } catch (err) {
    console.error("[CREATE_CLASS]", err);
    return errorResponse("Internal server error", 500);
  }
}
