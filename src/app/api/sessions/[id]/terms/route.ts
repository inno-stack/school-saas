import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { createTermSchema } from "@/validators/session.validator";
import { NextRequest } from "next/server";

const TERM_LABEL: Record<string, string> = {
  FIRST: "1st Term",
  SECOND: "2nd Term",
  THIRD: "3rd Term",
};

// ── GET /api/sessions/[id]/terms ───────────────────
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
    const { id: sessionId } = await params;

    // Verify session belongs to this school
    const session = await prisma.session.findFirst({
      where: { id: sessionId, schoolId: auth!.schoolId },
    });

    if (!session) {
      return errorResponse("Session not found", 404);
    }

    const terms = await prisma.term.findMany({
      where: { sessionId, schoolId: auth!.schoolId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        session: {
          id: session.id,
          name: session.name,
          isActive: session.isActive,
        },
        terms,
      },
      "Terms fetched successfully",
    );
  } catch (err) {
    console.error("[GET_TERMS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── POST /api/sessions/[id]/terms ─────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id: sessionId } = await params;
    const body = await req.json();

    const parsed = createTermSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { name } = parsed.data;

    // Verify session belongs to this school
    const session = await prisma.session.findFirst({
      where: { id: sessionId, schoolId: auth!.schoolId },
    });

    if (!session) {
      return errorResponse("Session not found", 404);
    }

    // Check duplicate term within this session
    const existing = await prisma.term.findUnique({
      where: {
        name_sessionId: { name, sessionId },
      },
    });

    if (existing) {
      return errorResponse(
        `${TERM_LABEL[name]} already exists in session "${session.name}"`,
        409,
      );
    }

    const term = await prisma.term.create({
      data: {
        name,
        sessionId,
        schoolId: auth!.schoolId,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse(
      term,
      `${TERM_LABEL[name]} created successfully`,
      201,
    );
  } catch (err) {
    console.error("[CREATE_TERM]", err);
    return errorResponse("Internal server error", 500);
  }
}
