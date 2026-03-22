import { getActivePeriod } from "@/lib/active-period";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { validateCardSchema } from "@/validators/scratch-card.validator";
import { NextRequest } from "next/server";

// ── POST /api/scratch-cards/validate ──────────────
// PUBLIC endpoint — no auth required
// Student enters reg number + PIN to access result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = validateCardSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { regNumber, pin } = parsed.data;

    // ── 1. Find student by reg number ──────────────
    const student = await prisma.student.findUnique({
      where: { regNumber },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        regNumber: true,
        schoolId: true,
        status: true,
      },
    });

    // Use same error message — prevent reg number enumeration
    if (!student || student.status === "INACTIVE") {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 2. Find the scratch card by PIN ────────────
    const card = await prisma.scratchCard.findUnique({
      where: { pin },
    });

    if (!card) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 3. Card must belong to the same school ─────
    if (card.schoolId !== student.schoolId) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 4. Check card status ───────────────────────
    if (card.status === "DISABLED") {
      return errorResponse("This scratch card has been disabled", 403);
    }

    if (card.status === "USED") {
      // If already used by this same student, allow re-access
      if (card.usedBy === student.id) {
        return await fetchAndReturnResult(student.id, student.schoolId);
      }
      return errorResponse("This scratch card has already been used", 403);
    }

    // ── 5. If card is pre-assigned, verify student ─
    if (card.assignedTo && card.assignedTo !== student.id) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 6. Mark card as USED ───────────────────────
    await prisma.scratchCard.update({
      where: { id: card.id },
      data: {
        status: "USED",
        usedBy: student.id,
        usedAt: new Date(),
      },
    });

    // ── 7. Fetch and return the result ─────────────
    return await fetchAndReturnResult(student.id, student.schoolId);
  } catch (err) {
    console.error("[VALIDATE_CARD]", err);
    return errorResponse("Internal server error", 500);
  }
}

// Helper: fetch the active term result for a student
async function fetchAndReturnResult(studentId: string, schoolId: string) {
  const { activePeriod, error } = await getActivePeriod(schoolId);

  if (error || !activePeriod) {
    return errorResponse("Results are not available at this time", 404);
  }

  const result = await prisma.result.findUnique({
    where: {
      studentId_termId: {
        studentId,
        termId: activePeriod.term.id,
      },
    },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          middleName: true,
          gender: true,
          regNumber: true,
          photo: true,
        },
      },
      class: { select: { name: true } },
      session: { select: { name: true } },
      term: { select: { name: true } },
      school: {
        select: {
          name: true,
          address: true,
          phone: true,
          email: true,
          logo: true,
          motto: true,
        },
      },
      items: {
        include: {
          subject: { select: { name: true, code: true } },
        },
        orderBy: { subject: { name: "asc" } },
      },
      skills: {
        orderBy: { name: "asc" },
      },
    },
  });

  if (!result) {
    return errorResponse("No result found for the current term", 404);
  }

  // Result must be published for public access
  if (!result.isPublished) {
    return errorResponse(
      "Results have not been published yet. Please check back later.",
      403,
    );
  }

  return successResponse(result, "Result retrieved successfully");
}
