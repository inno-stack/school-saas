import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";
import { z } from "zod";

const updateSchoolAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  address: z.string().max(255).optional().nullable(),
  website: z.string().url().optional().nullable(),
  motto: z.string().max(255).optional().nullable(),
});

// ── GET /api/admin/schools/[id] ────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            students: true,
            classes: true,
            subjects: true,
            sessions: true,
            results: true,
            scratchCards: true,
          },
        },
        sessions: {
          orderBy: { name: "desc" },
          take: 3,
          select: {
            id: true,
            name: true,
            isActive: true,
            _count: { select: { terms: true } },
          },
        },
        users: {
          where: { role: "SCHOOL_ADMIN" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    const { _count, ...schoolData } = school;

    return successResponse(
      {
        ...schoolData,
        stats: {
          users: _count.users,
          students: _count.students,
          classes: _count.classes,
          subjects: _count.subjects,
          sessions: _count.sessions,
          results: _count.results,
          scratchCards: _count.scratchCards,
        },
      },
      "School fetched successfully",
    );
  } catch (err) {
    console.error("[ADMIN_GET_SCHOOL]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/admin/schools/[id] ────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;
    const body = await req.json();

    const parsed = updateSchoolAdminSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const existing = await prisma.school.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("School not found", 404);
    }

    const updated = await prisma.school.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        website: true,
        motto: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return successResponse(updated, "School updated successfully");
  } catch (err) {
    console.error("[ADMIN_UPDATE_SCHOOL]", err);
    return errorResponse("Internal server error", 500);
  }
}
