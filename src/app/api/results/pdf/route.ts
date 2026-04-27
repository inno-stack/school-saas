import { ResultSheet } from "@/components/pdf/ResultSheet";
import { requireAuth } from "@/lib/auth-guard";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/response";
import { getSchoolForPdf } from "@/lib/school-cache";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { createElement } from "react";

// ── GET /api/results/pdf?studentId=x&termId=y ─────
// Note: This endpoint is separate from the parent-specific PDF generation endpoint because it has different auth requirements (only school staff can access, and they can access all results for their school — not just their own children + only published results)
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
    // Note: We fetch the full result here (including related student, class, session, term, school, and subject data) because the PDF generation requires all of that data — and it's more efficient to fetch it all in one query than to do multiple queries later during PDF generation
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
            // ── Signature images (base64 stored in DB) ────
            teacherSignature: true,
            schoolSeal: true,
            principalSignature: true,
          },
        },
        items: {
          include: {
            subject: { select: { name: true, code: true } },
          },
          orderBy: { subject: { name: "asc" } },
        },
      },
    });

    if (!result) {
      return errorResponse("Result not found", 404);
    }

    // Enforce tenant isolation
    if (result.schoolId !== auth!.schoolId) {
      return errorResponse("Result not found", 404);
    }
    // ── Fetch school from cache (fast after first request) ─
    const school = await getSchoolForPdf(result.schoolId);

    // ── Format data for PDF component ─────────────
    // Note: We do this before consuming any scratch card use (in the case of the scratch card validation endpoint) so that if there are any issues with the data that cause PDF generation to fail, we don't consume a use on the card (we only mark the card as used after successfully generating the PDF)
    const pdfData = {
      school: {
        name: result.school.name,
        address: result.school.address,
        phone: result.school.phone,
        email: result.school.email,
        logo: result.school.logo ?? null,
        motto: result.school.motto ?? null,
        // ── Signature images ──────────────────────────
        teacherSignature: result.school.teacherSignature ?? null,
        schoolSeal: result.school.schoolSeal ?? null,
        principalSignature: result.school.principalSignature ?? null,
      },
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

    // ── Render result sheet to downloadable PDF buffer ─
    // Cast required: renderToBuffer expects DocumentProps at root.
    // ResultSheet wraps <Document> internally so the cast is safe.
    const pdfBuffer = await renderToBuffer(
      createElement(ResultSheet, {
        data: pdfData,
      }) as ReactElement<DocumentProps>,
    );

    // ── Build safe filename from student + term info ───
    // Note: We do this after rendering the PDF so that if there are any issues with the student or term data that cause rendering to fail, we don't attempt to build a filename from potentially malformed data
    const filename =
      `Result_${result.student.lastName}_${result.term.name}_${result.session.name}.pdf`
        .replace(/\//g, "-")
        .replace(/\s+/g, "_");

    // ── Convert Buffer → Uint8Array for Web Response API compatibility ──
    // Node.js Buffer is not directly assignable to BodyInit in TypeScript,
    // but Uint8Array is — and Buffer is a subclass so this is safe.
    const uint8 = new Uint8Array(pdfBuffer);

    return new Response(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("[GENERATE_PDF]", err);
    return errorResponse("Failed to generate PDF", 500);
  }
}
