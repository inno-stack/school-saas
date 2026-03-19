import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateSchoolSettingsSchema } from "@/validators/school.validator";
import { NextRequest } from "next/server";

// ─── GET /api/school/settings ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const school = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: {
        termName: true,
        resultPin: true,
        showPosition: true,
      },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    return successResponse(school, "School settings fetched successfully");
  } catch (err) {
    console.error("[GET_SCHOOL_SETTINGS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ─── PUT /api/school/settings ──────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = updateSchoolSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const updated = await prisma.school.update({
      where: { id: auth!.schoolId },
      data: parsed.data,
      select: {
        termName: true,
        resultPin: true,
        showPosition: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "School settings updated successfully");
  } catch (err) {
    console.error("[UPDATE_SCHOOL_SETTINGS]", err);
    return errorResponse("Internal server error", 500);
  }
}
