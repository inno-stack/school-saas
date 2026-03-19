import { requireAuth } from "@/lib/auth-guard";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { createTeacherSchema } from "@/validators/user.validator";
import { NextRequest } from "next/server";

// ── GET /api/users/teachers ────────────────────────
// List all teachers in the school (paginated)
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      schoolId: auth!.schoolId,
      role: "TEACHER" as const,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    // Parallel: fetch teachers + total count
    const [teachers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          photo: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse(
      {
        teachers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Teachers fetched successfully",
    );
  } catch (err) {
    console.error("[GET_TEACHERS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── POST /api/users/teachers ───────────────────────
// Create a new teacher account
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    // Validate
    const parsed = createTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { firstName, lastName, email, password, phone, address, photo } =
      parsed.data;

    // Check email uniqueness globally (users share email table)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("A user with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(password);

    const teacher = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        address,
        photo,
        role: "TEACHER",
        schoolId: auth!.schoolId, // ← tenant isolation
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        photo: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse(teacher, "Teacher created successfully", 201);
  } catch (err) {
    console.error("[CREATE_TEACHER]", err);
    return errorResponse("Internal server error", 500);
  }
}
