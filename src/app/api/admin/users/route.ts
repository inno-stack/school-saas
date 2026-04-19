import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

// ── GET /api/admin/users ───────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const role = searchParams.get("role") ?? "";
    const schoolId = searchParams.get("schoolId") ?? "";
    const skip = (page - 1) * limit;

    const where = {
      ...(schoolId && { schoolId }),
      ...(role && { role: role as Role }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
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
          role: true,
          isActive: true,
          createdAt: true,
          school: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return successResponse(
      {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Users fetched successfully",
    );
  } catch (err) {
    console.error("[ADMIN_GET_USERS]", err);
    return errorResponse("Internal server error", 500);
  }
}
