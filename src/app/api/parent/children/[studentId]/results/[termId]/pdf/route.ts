import { ResultSheet } from "@/components/pdf/ResultSheet";
import { requireAuth } from "@/lib/auth-guard";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/response";
import { renderToBuffer} from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { createElement } from "react";
import type { DocumentProps }      from "@react-pdf/renderer";
import type { ReactElement }       from "react";


// ── GET /api/parent/children/[studentId]/results/[termId]/pdf
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

    // Fetch full result
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

    if (result.schoolId !== auth!.schoolId) {
      return errorResponse("Result not found", 404);
    }

    // Parents can only download published results
    if (auth!.role === "PARENT" && !result.isPublished) {
      return errorResponse("Result has not been published yet", 403);
    }

    const pdfData = {
      school: result.school,
      student: {
        fullName: `${result.student.lastName} ${result.student.firstName}${
          result.student.middleName ? " " + result.student.middleName : ""
        }`.toUpperCase(),
        regNumber: result.student.regNumber,
        gender: result.student.gender,
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
        vacationDate: result.vacationDate?.toISOString() ?? null,
        resumptionDate: result.resumptionDate?.toISOString() ?? null,
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
    };

// ── Render the result sheet to a PDF binary buffer ─
const pdfBuffer = await renderToBuffer(
  createElement(ResultSheet, { data: pdfData }) as ReactElement<DocumentProps>
);


    // ── Build safe filename from student + term info ───
    const filename =
      `Result_${result.student.lastName}_${result.term.name}_Term_${result.session.name}.pdf`
        .replace(/\//g, "-")
        .replace(/\s+/g, "_");

  // ── Convert Buffer → Uint8Array for Web Response API compatibility ──
// Node.js Buffer is not directly assignable to BodyInit in TypeScript,
// but Uint8Array is — and Buffer is a subclass so this is safe.
   const uint8 = new Uint8Array(pdfBuffer);

return new Response(uint8, {
  status: 200,
  headers: {
    "Content-Type":        "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length":      uint8.byteLength.toString(),
  },
});

  } catch (err) {
    console.error("[PARENT_PDF]", err);
    return errorResponse("Failed to generate PDF", 500);
  }
}
