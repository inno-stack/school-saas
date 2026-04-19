import { requireAuth } from "@/lib/auth-guard";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/parent/children/[studentId]/results/[termId]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string; termId: string }> },
) {
  const { auth, error } = requireAuth(req, [
    "PARENT",
    "SCHOOL_ADMIN",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { studentId, termId } = await params;

    // ── Verify parent-child link ───────────────────
    if (auth!.role === "PARENT") {
      const link = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: auth!.userId,
            studentId,
          },
        },
      });

      if (!link) {
        return errorResponse("You are not linked to this student", 403);
      }
    }

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
      return errorResponse("Result not found", 404);
    }

    // Tenant check
    if (result.schoolId !== auth!.schoolId) {
      return errorResponse("Result not found", 404);
    }

    // Parents can only see published results
    if (auth!.role === "PARENT" && !result.isPublished) {
      return errorResponse(
        "This result has not been published yet. Please check back later.",
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
      isPublished: result.isPublished,
    };

    return successResponse(formatted, "Result fetched successfully");
  } catch (err) {
    console.error("[GET_CHILD_RESULT]", err);
    return errorResponse("Internal server error", 500);
  }
}
