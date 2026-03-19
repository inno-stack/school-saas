import { requireAuth } from "@/lib/auth-guard";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { createParentSchema } from "@/validators/user.validator";
import { NextRequest } from "next/server";

// ── GET /api/users/parents ─────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const skip = (page - 1) * limit;

    const where = {
      schoolId: auth!.schoolId,
      role: "PARENT" as const,
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [parents, total] = await Promise.all([
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
        parents,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Parents fetched successfully",
    );
  } catch (err) {
    console.error("[GET_PARENTS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── POST /api/users/parents ────────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = createParentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { firstName, lastName, email, password, phone, address, photo } =
      parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("A user with this email already exists", 409);
    }

    const hashedPassword = await hashPassword(password);

    const parent = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        address,
        photo,
        role: "PARENT",
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

    return successResponse(parent, "Parent created successfully", 201);
  } catch (err) {
    console.error("[CREATE_PARENT]", err);
    return errorResponse("Internal server error", 500);
  }
}
