import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { generateRegNumber } from "@/lib/reg-number";
import { errorResponse, successResponse } from "@/lib/response";
import { createStudentSchema } from "@/validators/student.validator";
import { NextRequest } from "next/server";

// ── GET /api/students ──────────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const gender = searchParams.get("gender") ?? "";
    const status = searchParams.get("status") ?? "";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      schoolId: auth!.schoolId,
      ...(gender && { gender }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { regNumber: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          regNumber: true,
          firstName: true,
          lastName: true,
          middleName: true,
          gender: true,
          photo: true,
          status: true,
          createdAt: true,
          parent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return successResponse(
      {
        students,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Students fetched successfully",
    );
  } catch (err) {
    console.error("[GET_STUDENTS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── POST /api/students ─────────────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const {
      firstName,
      lastName,
      middleName,
      gender,
      dateOfBirth,
      photo,
      address,
      parentId,
    } = parsed.data;

    // If parentId provided, verify parent belongs to same school
    if (parentId) {
      const parent = await prisma.user.findFirst({
        where: {
          id: parentId,
          schoolId: auth!.schoolId,
          role: "PARENT",
        },
      });

      if (!parent) {
        return errorResponse("Parent not found in this school", 404);
      }
    }

    // Get school info for reg number generation
    const school = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: { slug: true },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    // Auto-generate registration number
    const regNumber = await generateRegNumber(auth!.schoolId, school.slug);

    const student = await prisma.student.create({
      data: {
        regNumber,
        firstName,
        lastName,
        middleName,
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        photo,
        address,
        parentId: parentId ?? null,
        schoolId: auth!.schoolId,
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
        createdAt: true,
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

    return successResponse(student, "Student created successfully", 201);
  } catch (err) {
    console.error("[CREATE_STUDENT]", err);
    return errorResponse("Internal server error", 500);
  }
}
