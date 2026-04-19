import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/admin/schools ─────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? ""; // "active" | "disabled"
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(status === "active" && { isActive: true }),
      ...(status === "disabled" && { isActive: false }),
    };

    const [schools, total] = await Promise.all([
      prisma.school.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              students: true,
              classes: true,
              sessions: true,
              results: true,
              scratchCards: true,
            },
          },
        },
      }),
      prisma.school.count({ where }),
    ]);

    const data = schools.map(({ _count, ...school }) => ({
      ...school,
      stats: {
        users: _count.users,
        students: _count.students,
        classes: _count.classes,
        sessions: _count.sessions,
        results: _count.results,
        scratchCards: _count.scratchCards,
      },
    }));

    return successResponse(
      {
        schools: data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Schools fetched successfully",
    );
  } catch (err) {
    console.error("[ADMIN_GET_SCHOOLS]", err);
    return errorResponse("Internal server error", 500);
  }
}
