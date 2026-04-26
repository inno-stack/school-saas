import { ResultSheet } from "@/components/pdf/ResultSheet";
import { requireAuth } from "@/lib/auth-guard";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/response";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { createElement } from "react";

// ── GET /api/parent/children/[studentId]/results/[termId]/pdf
// Note: This endpoint is separate from the main PDF generation endpoint because it has different auth requirements (parents can access, but only for their own children + only published results)
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
    // Note: We do this before fetching the result, so that if the parent is not linked to the student we don't leak any information about whether the result exists or not
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
    // Note: We do this after verifying the parent-child link, so that if the result doesn't exist or doesn't belong to the parent's child, we don't leak that information
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
    // Note: We do this after verifying the parent-child link, so that if the result exists but is not published, we don't leak that information to unauthorized users
    if (auth!.role === "PARENT" && !result.isPublished) {
      return errorResponse("Result has not been published yet", 403);
    }

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

    // ── Render the result sheet to a PDF binary buffer ─
    // Note: We do this before consuming any scratch card use (in the case of the scratch card validation endpoint) so that if PDF generation fails for any reason, we don't consume a use on the card
    const pdfBuffer = await renderToBuffer(
      createElement(ResultSheet, {
        data: pdfData,
      }) as ReactElement<DocumentProps>,
    );

    // ── Build safe filename from student + term info ───
    // Note: We do this after rendering the PDF so that if there are any issues with the student or term data that cause rendering to fail, we don't attempt to build a filename from potentially malformed data
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
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": uint8.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("[PARENT_PDF]", err);
    return errorResponse("Failed to generate PDF", 500);
  }
}
