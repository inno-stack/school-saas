import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { createSessionSchema } from "@/validators/session.validator";
import { NextRequest } from "next/server";

// ── GET /api/sessions ──────────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const sessions = await prisma.session.findMany({
      where: { schoolId: auth!.schoolId },
      orderBy: { name: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { terms: true },
        },
        terms: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    const data = sessions.map(({ _count, ...session }) => ({
      ...session,
      totalTerms: _count.terms,
    }));

    return successResponse(data, "Sessions fetched successfully");
  } catch (err) {
    console.error("[GET_SESSIONS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── POST /api/sessions ─────────────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { name } = parsed.data;

    // Check duplicate session name within this school
    const existing = await prisma.session.findUnique({
      where: {
        name_schoolId: { name, schoolId: auth!.schoolId },
      },
    });

    if (existing) {
      return errorResponse(
        `Session "${name}" already exists in this school`,
        409,
      );
    }

    const session = await prisma.session.create({
      data: {
        name,
        schoolId: auth!.schoolId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse(session, "Session created successfully", 201);
  } catch (err) {
    console.error("[CREATE_SESSION]", err);
    return errorResponse("Internal server error", 500);
  }
}
