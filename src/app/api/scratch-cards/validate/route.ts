/**
 * @file src/app/api/scratch-cards/validate/route.ts
 * @description Fixed term resolution — looks up by termId only,
 * then verifies the session separately. Removes the schoolId+sessionId
 * compound lookup that was causing the 404.
 */

import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";
import { z } from "zod";

// ── Validation schema ──────────────────────────────
const validateSchema = z.object({
  regNumber: z.string().min(1, "Registration number is required"),
  pin: z
    .string()
    .length(12, "PIN must be exactly 12 digits")
    .regex(/^\d+$/, "PIN must contain only numbers"),
  sessionId: z.string().optional().nullable(),
  termId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { regNumber, pin, sessionId, termId } = parsed.data;

    // ── 1. Find student ────────────────────────────
    const student = await prisma.student.findUnique({
      where: { regNumber },
      select: {
        id: true,
        schoolId: true,
        status: true,
      },
    });

    if (!student || student.status === "INACTIVE") {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 2. Find card ───────────────────────────────
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

    if (card.schoolId !== student.schoolId) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    if (card.status === "DISABLED") {
      return errorResponse(
        "This scratch card has been disabled. Please contact your school.",
        403,
      );
    }

    // ── 3. Handle cumulative selection ─────────────
    if (termId === "CUMULATIVE") {
      // ── Card session must match selected session ──
      if (sessionId) {
        // ── Find the school's equivalent session by name ─
        const cardSession = card.session;
        const requestedSession = await prisma.session.findFirst({
          where: {
            id: sessionId,
          },
          select: { id: true, name: true },
        });

        // ── Match by session name not ID ───────────
        // This handles cross-school session ID mismatch
        if (requestedSession && cardSession.name !== requestedSession.name) {
          return errorResponse(
            `This card is for the ${cardSession.name} session. ` +
              `It cannot be used for a different session.`,
            403,
          );
        }
      }

      // ── Consume one card use ─────────────────────
      if (card.usageCount >= card.maxUses) {
        return errorResponse(
          `This scratch card has been used ${card.maxUses} times and is exhausted.`,
          403,
        );
      }

      const newCount = card.usageCount + 1;
      await prisma.scratchCard.update({
        where: { id: card.id },
        data: {
          usageCount: newCount,
          status: newCount >= card.maxUses ? "EXHAUSTED" : "ACTIVE",
        },
      });

      return successResponse(
        {
          isCumulative: true,
          sessionId: card.sessionId,
          regNumber,
          pin,
          cardInfo: {
            usesRemaining: card.maxUses - newCount,
            message:
              newCount >= card.maxUses
                ? "⚠️ This was your last use. Please get a new scratch card."
                : `✅ You have ${card.maxUses - newCount} use(s) remaining on this card.`,
          },
        },
        "Cumulative result access granted",
      );
    }

    /**
     * When termId is "CUMULATIVE", return a special cumulative response.
     */

    // ── Handle cumulative term selection ───────────────
    if (termId === "CUMULATIVE") {
      // ── Verify card session matches requested session ─
      if (sessionId && card.sessionId !== sessionId) {
        return errorResponse(
          `This card is for the ${card.session.name} session. ` +
            `It cannot be used for a different session.`,
          403,
        );
      }

      // ── Consume one card use ───────────────────────
      const newUsageCount = card.usageCount + 1;
      const newStatus = newUsageCount >= card.maxUses ? "EXHAUSTED" : "ACTIVE";

      await prisma.scratchCard.update({
        where: { id: card.id },
        data: { usageCount: newUsageCount, status: newStatus },
      });

      // ── Return a special cumulative indicator ──────
      // The frontend will call validate-cumulative-pdf separately
      return successResponse(
        {
          isCumulative: true,
          sessionId: card.sessionId,
          regNumber,
          pin,
          cardInfo: {
            usesRemaining: card.maxUses - newUsageCount,
            message:
              newUsageCount >= card.maxUses
                ? "⚠️ This was your last use. Please get a new scratch card."
                : `✅ You have ${card.maxUses - newUsageCount} use(s) remaining.`,
          },
        },
        "Cumulative result access granted",
      );
    }

    // ── 4. Resolve the term for the student's school ─
    // KEY FIX: Look up term by ID only, then verify it belongs
    // to the student's school. Don't filter by sessionId from
    // the dropdown since that sessionId may belong to another school.
    let resolvedTerm: {
      id: string;
      name: string;
      sessionId: string;
      schoolId: string;
    } | null = null;

    if (termId && termId !== "CUMULATIVE") {
      // ── Try direct lookup by termId ────────────────
      resolvedTerm = await prisma.term.findFirst({
        where: {
          id: termId,
          schoolId: student.schoolId, // ← must belong to student's school
        },
        select: {
          id: true,
          name: true,
          sessionId: true,
          schoolId: true,
        },
      });

      // ── If not found by ID, find by name + session name ─
      // This handles the cross-school ID mismatch case
      if (!resolvedTerm && sessionId) {
        const sessionFromDropdown = await prisma.session.findUnique({
          where: { id: sessionId },
          select: { name: true },
        });

        if (sessionFromDropdown) {
          // ── Find the school's session with same name ─
          const schoolSession = await prisma.session.findFirst({
            where: {
              schoolId: student.schoolId,
              name: sessionFromDropdown.name,
            },
            select: { id: true, name: true },
          });

          if (schoolSession) {
            // ── Find the term by name within school's session ─
            const termFromDropdown = await prisma.term.findUnique({
              where: { id: termId },
              select: { name: true },
            });

            if (termFromDropdown) {
              resolvedTerm = await prisma.term.findFirst({
                where: {
                  schoolId: student.schoolId,
                  sessionId: schoolSession.id,
                  name: termFromDropdown.name,
                },
                select: {
                  id: true,
                  name: true,
                  sessionId: true,
                  schoolId: true,
                },
              });
            }
          }
        }
      }
    }

    // ── Fall back to active term ───────────────────
    if (!resolvedTerm) {
      resolvedTerm = await prisma.term.findFirst({
        where: {
          schoolId: student.schoolId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          sessionId: true,
          schoolId: true,
        },
      });

      if (!resolvedTerm) {
        return errorResponse(
          "Could not find the selected term for your school. " +
            "Please contact your school administrator.",
          400,
        );
      }
    }

    // ── 5. Get the session for this term ───────────
    const resolvedSession = await prisma.session.findUnique({
      where: { id: resolvedTerm.sessionId },
      select: { id: true, name: true },
    });

    if (!resolvedSession) {
      return errorResponse("Session not found", 404);
    }

    // ── 6. Card session must match resolved session ─
    // Compare by NAME not ID to handle cross-school scenarios
    if (card.session.name !== resolvedSession.name) {
      return errorResponse(
        `This scratch card is for the ${card.session.name} session. ` +
          `It cannot be used to check ${resolvedSession.name} results. ` +
          `Please get a scratch card for the ${resolvedSession.name} session.`,
        403,
      );
    }

    // ── 7. Check usage count ───────────────────────
    if (card.usageCount >= card.maxUses) {
      return errorResponse(
        `This scratch card has been used ${card.maxUses} times and is now exhausted. ` +
          `Please purchase a new scratch card from your school.`,
        403,
      );
    }

    // ── 8. Record usage + increment count ─────────
    const newUsageCount = card.usageCount + 1;
    const newStatus = newUsageCount >= card.maxUses ? "EXHAUSTED" : "ACTIVE";

    await prisma.$transaction([
      prisma.cardUsage.create({
        data: {
          cardId: card.id,
          studentId: student.id,
          termId: resolvedTerm.id,
          schoolId: student.schoolId,
        },
      }),
      prisma.scratchCard.update({
        where: { id: card.id },
        data: { usageCount: newUsageCount, status: newStatus },
      }),
    ]);

    // ── 9. Fetch and return the result ─────────────
    return await fetchAndFormatResult(
      student.id,
      resolvedTerm.id,
      resolvedSession.name,
      resolvedTerm.name,
      {
        usesRemaining: card.maxUses - newUsageCount,
        totalUses: card.maxUses,
        usedCount: newUsageCount,
      },
    );
  } catch (err) {
    console.error("[VALIDATE_CARD]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── Helper: fetch and format result data ───────────
async function fetchAndFormatResult(
  studentId: string,
  termId: string,
  sessionName: string,
  termName: string,
  cardInfo: {
    usesRemaining: number;
    totalUses: number;
    usedCount: number;
  },
) {
  const result = await prisma.result.findUnique({
    where: { studentId_termId: { studentId, termId } },
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
        include: { subject: { select: { name: true, code: true } } },
        orderBy: { subject: { name: "asc" } },
      },
    },
  });

  if (!result) {
    const tLabel =
      termName === "FIRST"
        ? "1st Term"
        : termName === "SECOND"
          ? "2nd Term"
          : "3rd Term";

    return errorResponse(
      `No result found for ${tLabel} of ${sessionName}. ` +
        `Results may not have been published yet.`,
      404,
    );
  }

  if (!result.isPublished) {
    return errorResponse(
      "Results for this term have not been published yet. " +
        "Please check back later.",
      403,
    );
  }

  const formatted = {
    school: result.school,
    student: {
      firstName: result.student.firstName,
      lastName: result.student.lastName,
      gender: result.student.gender,
      regNumber: result.student.regNumber,
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
      vacationDate: result.vacationDate,
      resumptionDate: result.resumptionDate,
    },
    subjects: result.items.map((item, idx) => ({
      sn: idx + 1,
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
    cardInfo: {
      usesRemaining: cardInfo.usesRemaining,
      message:
        cardInfo.usesRemaining === 0
          ? "⚠️ This was your last use. Please get a new scratch card."
          : `✅ You have ${cardInfo.usesRemaining} use(s) remaining on this card.`,
    },
  };

  return successResponse(formatted, "Result retrieved successfully");
}
