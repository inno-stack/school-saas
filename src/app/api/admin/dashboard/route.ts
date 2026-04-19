import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/admin/dashboard ───────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SUPER_ADMIN"]);
  if (error) return error;

  try {
    // ── All counts in parallel ─────────────────────
    const [
      totalSchools,
      activeSchools,
      disabledSchools,
      totalUsers,
      totalStudents,
      totalResults,
      totalScratchCards,
      usedCards,
      totalSessions,

      // Recent activity
      recentSchools,
      recentStudents,
    ] = await Promise.all([
      prisma.school.count(),
      prisma.school.count({ where: { isActive: true } }),
      prisma.school.count({ where: { isActive: false } }),

      prisma.user.count(),
      prisma.student.count(),
      prisma.result.count(),
      prisma.scratchCard.count(),
      prisma.scratchCard.count({ where: { status: "EXHAUSTED" } }),
      prisma.session.count(),

      // Last 5 schools registered
      prisma.school.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              students: true,
            },
          },
        },
      }),

      // Last 5 students enrolled across all schools
      prisma.student.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          regNumber: true,
          createdAt: true,
          school: {
            select: { name: true },
          },
        },
      }),
    ]);

    // ── Per-role user breakdown ────────────────────
    const [totalAdmins, totalTeachers, totalParents] = await Promise.all([
      prisma.user.count({ where: { role: "SCHOOL_ADMIN" } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "PARENT" } }),
    ]);

    // ── Schools registered per month (last 6 months) ─
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const schoolsPerMonth = await prisma.school.groupBy({
      by: ["createdAt"],
      where: { createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(
      {
        overview: {
          totalSchools,
          activeSchools,
          disabledSchools,
          totalUsers,
          totalStudents,
          totalResults,
          totalSessions,
          scratchCards: {
            total: totalScratchCards,
            used: usedCards,
            active: totalScratchCards - usedCards,
          },
        },
        userBreakdown: {
          admins: totalAdmins,
          teachers: totalTeachers,
          parents: totalParents,
        },
        recentSchools: recentSchools.map(({ _count, ...s }) => ({
          ...s,
          totalUsers: _count.users,
          totalStudents: _count.students,
        })),
        recentStudents,
        schoolsPerMonth,
      },
      "Dashboard data fetched successfully",
    );
  } catch (err) {
    console.error("[ADMIN_DASHBOARD]", err);
    return errorResponse("Internal server error", 500);
  }
}
