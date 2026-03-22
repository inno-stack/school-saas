import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateSkillsSchema } from "@/validators/result.validator";
import { NextRequest } from "next/server";

// ── POST /api/results/skills ───────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = updateSkillsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { studentId, classId, skills } = parsed.data;

    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { term } = activePeriod!;

    // Get the result for this student + term
    const result = await prisma.result.findUnique({
      where: {
        studentId_termId: { studentId, termId: term.id },
      },
    });

    if (!result) {
      return errorResponse(
        "No result found for this student this term. Input scores first.",
        404,
      );
    }

    // Upsert each skill rating
    const upserted = await Promise.all(
      skills.map(({ name, category, rating }) =>
        prisma.resultSkill.upsert({
          where: {
            resultId_name: { resultId: result.id, name },
          },
          create: {
            resultId: result.id,
            schoolId: auth!.schoolId,
            name,
            category,
            rating: rating ?? undefined,
          },
          update: {
            rating: rating ?? undefined,
            category,
          },
        }),
      ),
    );

    return successResponse(
      { skillsUpdated: upserted.length },
      "Skills updated successfully",
    );
  } catch (err) {
    console.error("[UPDATE_SKILLS]", err);
    return errorResponse("Internal server error", 500);
  }
}
