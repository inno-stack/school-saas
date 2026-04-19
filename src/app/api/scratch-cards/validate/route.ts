import { getActivePeriod } from "@/lib/active-period";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { validateCardSchema } from "@/validators/scratch-card.validator";
import { NextRequest } from "next/server";

// ── POST /api/scratch-cards/validate ──────────────
// PUBLIC — no auth required
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

    if (!student || student.status === "INACTIVE") {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 2. Find card by PIN ────────────────────────
    const card = await prisma.scratchCard.findUnique({
      where: { pin },
      include: {
        session: { select: { id: true, name: true } },
        usages: {
          where: { studentId: student.id },
          select: { termId: true },
        },
      },
    });

    if (!card) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 3. Card must belong to same school ─────────
    if (card.schoolId !== student.schoolId) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 4. Check card is not disabled ─────────────
    if (card.status === "DISABLED") {
      return errorResponse(
        "This scratch card has been disabled. Contact your school.",
        403,
      );
    }

    // ── 5. Get active session + term ───────────────
    const { activePeriod, error: periodError } = await getActivePeriod(
      student.schoolId,
    );
    if (periodError) return periodError;

    const { session, term } = activePeriod!;

    // ── 6. Card must belong to the active session ──
    // 2025/2026 card CANNOT check 2026/2027 results
    if (card.sessionId !== session.id) {
      return errorResponse(
        `This card is for the ${card.session.name} session and cannot be used to check ${session.name} results. Please get a new card.`,
        403,
      );
    }

    // ── 7. Check if student already used this card
    //       for THIS specific term ──────────────────
    // const usedForThisTerm = card.usages.some((u) => u.termId === term.id);

    // if (usedForThisTerm) {
    // Already checked this term — allow re-fetch without
    // consuming another use (viewing same term again)
    // return await fetchResult(student.id, term.id, session.name, term.name);
    // }

    // ── 8. Check total usage count ─────────────────
    if (card.usageCount >= card.maxUses) {
      return errorResponse(
        `This scratch card has been used ${card.maxUses} times and is now exhausted. Please get a new card.`,
        403,
      );
    }

    // ── 9. If pre-assigned, verify student ─────────
    if (card.assignedTo && card.assignedTo !== student.id) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 10. Record this usage + increment count ────
    const newUsageCount = card.usageCount + 1;
    const newStatus = newUsageCount >= card.maxUses ? "EXHAUSTED" : "ACTIVE";

    await prisma.$transaction([
      // Record the individual use
      prisma.cardUsage.create({
        data: {
          cardId: card.id,
          studentId: student.id,
          termId: term.id,
          schoolId: student.schoolId,
        },
      }),
      // Update card usage count + status
      prisma.scratchCard.update({
        where: { id: card.id },
        data: {
          usageCount: newUsageCount,
          status: newStatus,
        },
      }),
    ]);

    // ── 11. Fetch and return the result ───────────
    return await fetchResult(student.id, term.id, session.name, term.name, {
      usesRemaining: card.maxUses - newUsageCount,
      totalUses: card.maxUses,
      usedCount: newUsageCount,
    });
  } catch (err) {
    console.error("[VALIDATE_CARD]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── Helper: fetch published result ────────────────
async function fetchResult(
  studentId: string,
  termId: string,
  sessionName: string,
  termName: string,
  cardInfo?: {
    usesRemaining: number;
    totalUses: number;
    usedCount: number;
  },
) {
  const result = await prisma.result.findUnique({
    where: {
      studentId_termId: { studentId, termId },
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
      skills: { orderBy: { name: "asc" } },
    },
  });

  if (!result) {
    return errorResponse(
      `No result found for ${termName} of ${sessionName}. Results may not have been entered yet.`,
      404,
    );
  }

  if (!result.isPublished) {
    return errorResponse(
      "Results have not been published yet. Please check back later.",
      403,
    );
  }

  const formatted = {
    school: result.school,
    student: {
      ...result.student,
      fullName: `${result.student.lastName} ${result.student.firstName}${
        result.student.middleName ? " " + result.student.middleName : ""
      }`.toUpperCase(),
    },
    class: result.class.name,
    session: result.session.name,
    term: result.term.name,
    summary: {
      subjectsOffered: result.items.length,
      subjectsEvaluated: result.items.filter((i) => i.totalScore !== null)
        .length,
      totalScore: result.totalScore,
      average: result.average,
      position: result.position ? getOrdinal(result.position) : null,
      outOf: result.outOf,
      performance: result.performance,
    },
    attendance: {
      daysOpen: result.daysOpen,
      daysPresent: result.daysPresent,
      daysAbsent: result.daysAbsent,
      vacationDate: result.vacationDate,
      resumptionDate: result.resumptionDate,
    },
    subjects: result.items.map((item, index) => ({
      sn: index + 1,
      name: item.subject.name,
      code: item.subject.code,
      caScore: item.caScore,
      examScore: item.examScore,
      totalScore: item.totalScore,
      grade: item.grade,
      description: item.description,
      remark: item.remark,
      positionInClass: item.positionInClass
        ? getOrdinal(item.positionInClass)
        : null,
      classAverage: item.classAverage,
    })),
    psychomotorSkills: result.skills
      .filter((s) => s.category === "PSYCHOMOTOR")
      .map((s) => ({ name: s.name, rating: s.rating })),
    socialBehaviour: result.skills
      .filter((s) => s.category === "SOCIAL")
      .map((s) => ({ name: s.name, rating: s.rating })),
    comments: {
      teacher: result.teacherComment,
      teacherName: result.teacherName,
      principal: result.principalComment,
      principalName: result.principalName,
    },
    gradeKey: [
      {
        range: "70 - 100",
        grade: "A",
        description: "Distinction",
        remark: "Excellent",
      },
      {
        range: "60 - 69",
        grade: "B",
        description: "Upper Credit",
        remark: "Very Good",
      },
      { range: "50 - 59", grade: "C", description: "Credit", remark: "Good" },
      { range: "45 - 49", grade: "P", description: "Pass", remark: "Fair" },
      { range: "0 - 44", grade: "F", description: "Fail", remark: "Poor" },
    ],
    // Show card usage info to student
    ...(cardInfo && {
      cardInfo: {
        usesRemaining: cardInfo.usesRemaining,
        message:
          cardInfo.usesRemaining === 0
            ? "⚠️ This was your last use. Get a new card for future checks."
            : `✅ You have ${cardInfo.usesRemaining} use(s) remaining on this card.`,
      },
    }),
  };

  return successResponse(formatted, "Result retrieved successfully");
}
