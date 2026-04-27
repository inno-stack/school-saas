/**
 * @file src/app/api/school/profile/route.ts
 * @description School profile GET and PUT endpoints.
 * Logo field included in all selects and update operations.
 */

import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { invalidateSchoolCache } from "@/lib/school-cache";
import { updateSchoolProfileSchema } from "@/validators/school.validator";
import { NextRequest } from "next/server";

// ── GET /api/school/profile ────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const school = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        logo: true, // ← include logo in GET
        website: true,
        motto: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    return successResponse(school, "School profile fetched successfully");
  } catch (err) {
    console.error("[GET_SCHOOL_PROFILE]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/school/profile ────────────────────────
export async function PUT(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    // ── Validate — logo now accepted by schema ─────
    const parsed = updateSchoolProfileSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    // ── Verify school exists ───────────────────────
    const existing = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse("School not found", 404);
    }

    // ── Update including logo ──────────────────────
    const updated = await prisma.school.update({
      where: { id: auth!.schoolId },
      data: parsed.data, // logo is now part of parsed.data
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        logo: true, // ← return logo in response
        website: true,
        motto: true,
        updatedAt: true,
      },
    });
    invalidateSchoolCache(auth!.schoolId);

    return successResponse(updated, "School profile updated successfully");
  } catch (err) {
    console.error("[UPDATE_SCHOOL_PROFILE]", err);
    return errorResponse("Internal server error", 500);
  }
}
