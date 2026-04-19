import { ResultSheet } from "@/components/pdf/ResultSheet";
import { requireAuth } from "@/lib/auth-guard";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/response";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import { createElement } from "react";

// ── GET /api/results/pdf?studentId=x&termId=y ─────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, [
    "SCHOOL_ADMIN",
    "TEACHER",
    "SUPER_ADMIN",
  ]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const termId = searchParams.get("termId");

    if (!studentId || !termId) {
      return errorResponse(
        "studentId and termId query params are required",
        400,
      );
    }

    // ── Fetch full result ──────────────────────────
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

    // Enforce tenant isolation
    if (result.schoolId !== auth!.schoolId) {
      return errorResponse("Result not found", 404);
    }

    // ── Format data for PDF component ─────────────
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

    // ── Render PDF to buffer ───────────────────────
    const pdfBuffer = await renderToBuffer(
      createElement(ResultSheet, { data: pdfData }),
    );

    // ── Return as downloadable PDF ─────────────────
    const filename =
      `Result_${result.student.lastName}_${result.term.name}_${result.session.name}.pdf`
        .replace(/\//g, "-")
        .replace(/\s+/g, "_");

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[GENERATE_PDF]", err);
    return errorResponse("Failed to generate PDF", 500);
  }
}
