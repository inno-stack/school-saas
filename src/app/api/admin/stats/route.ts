import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/admin/stats ───────────────────────────
// Deep analytics for monitoring + billing decisions
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SUPER_ADMIN"]);
  if (error) return error;

  try {
    // ── Top schools by student count ───────────────
    const topSchoolsByStudents = await prisma.school.findMany({
      where: { isActive: true },
      orderBy: { students: { _count: "desc" } },
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            students: true,
            users: true,
            results: true,
            scratchCards: true,
          },
        },
      },
    });

    // ── Top schools by result count ────────────────
    const topSchoolsByResults = await prisma.school.findMany({
      where: { isActive: true },
      orderBy: { results: { _count: "desc" } },
      take: 10,
      select: {
        id: true,
        name: true,
        _count: {
          select: { results: true },
        },
      },
    });

    // ── Scratch card usage across all schools ──────
    const [totalCards, activeCards, exhaustedCards, disabledCards] =
      await Promise.all([
        prisma.scratchCard.count(),
        prisma.scratchCard.count({ where: { status: "ACTIVE" } }),
        prisma.scratchCard.count({ where: { status: "EXHAUSTED" } }),
        prisma.scratchCard.count({ where: { status: "DISABLED" } }),
      ]);

    // ── Results published vs unpublished ──────────
    const [publishedResults, unpublishedResults] = await Promise.all([
      prisma.result.count({ where: { isPublished: true } }),
      prisma.result.count({ where: { isPublished: false } }),
    ]);

    // ── New schools this month ─────────────────────
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newSchoolsThisMonth = await prisma.school.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    const newStudentsThisMonth = await prisma.student.count({
      where: { createdAt: { gte: startOfMonth } },
    });

    // ── Student gender breakdown ───────────────────
    const [maleStudents, femaleStudents] = await Promise.all([
      prisma.student.count({ where: { gender: "MALE" } }),
      prisma.student.count({ where: { gender: "FEMALE" } }),
    ]);

    // ── Grade distribution across all results ──────
    const gradeDistribution = await prisma.resultItem.groupBy({
      by: ["grade"],
      _count: { grade: true },
      orderBy: { grade: "asc" },
    });

    return successResponse(
      {
        thisMonth: {
          newSchools: newSchoolsThisMonth,
          newStudents: newStudentsThisMonth,
        },
        students: {
          male: maleStudents,
          female: femaleStudents,
          total: maleStudents + femaleStudents,
        },
        results: {
          published: publishedResults,
          unpublished: unpublishedResults,
          total: publishedResults + unpublishedResults,
        },
        scratchCards: {
          total: totalCards,
          active: activeCards,
          exhausted: exhaustedCards,
          disabled: disabledCards,
          usageRate:
            totalCards > 0
              ? `${Math.round((exhaustedCards / totalCards) * 100)}%`
              : "0%",
        },
        topSchoolsByStudents: topSchoolsByStudents.map(({ _count, ...s }) => ({
          ...s,
          students: _count.students,
          users: _count.users,
          results: _count.results,
          scratchCards: _count.scratchCards,
        })),
        topSchoolsByResults: topSchoolsByResults.map(({ _count, ...s }) => ({
          ...s,
          results: _count.results,
        })),
        gradeDistribution: gradeDistribution.map((g) => ({
          grade: g.grade,
          count: g._count.grade,
        })),
      },
      "System stats fetched successfully",
    );
  } catch (err) {
    console.error("[ADMIN_STATS]", err);
    return errorResponse("Internal server error", 500);
  }
}
