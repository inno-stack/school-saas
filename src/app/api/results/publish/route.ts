import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";
import { z } from "zod";

const publishSchema = z.object({
  studentIds: z.array(z.string()).optional(), // publish specific students
  classId: z.string().optional(), // or publish whole class
  publish: z.boolean(), // true = publish, false = unpublish
});

// ── POST /api/results/publish ──────────────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { studentIds, classId, publish } = parsed.data;

    if (!studentIds?.length && !classId) {
      return errorResponse("Provide either studentIds or classId", 400);
    }

    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { term } = activePeriod!;

    const where = {
      schoolId: auth!.schoolId,
      termId: term.id,
      ...(classId && { classId }),
      ...(studentIds?.length && { studentId: { in: studentIds } }),
    };

    const { count } = await prisma.result.updateMany({
      where,
      data: { isPublished: publish },
    });

    return successResponse(
      { resultsUpdated: count },
      `${count} result(s) ${publish ? "published" : "unpublished"} successfully`,
    );
  } catch (err) {
    console.error("[PUBLISH_RESULTS]", err);
    return errorResponse("Internal server error", 500);
  }
}
