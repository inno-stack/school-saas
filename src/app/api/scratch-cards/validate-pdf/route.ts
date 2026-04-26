import { ResultSheet } from "@/components/pdf/ResultSheet";
import { getActivePeriod } from "@/lib/active-period";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/response";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { createElement } from "react";

// ── POST /api/scratch-cards/validate-pdf ──────────
// Public — validates PIN + returns PDF (no extra card use consumed)
// Note: This is separate from the main PDF generation endpoint because we want to validate the scratch card and active period before attempting to generate the PDF (which is resource intensive), and we don't want to consume a use on the card if PDF generation fails for any reason (e.g. rendering error)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { regNumber, pin } = body;

    if (!regNumber || !pin) {
      return errorResponse("regNumber and pin are required", 400);
    }

    // ── 1. Find student ────────────────────────────
    // Note: We do this before consuming card use, so that if PDF generation fails we don't consume a use on the card (we only mark the card as used after successfully generating the PDF)
    const student = await prisma.student.findUnique({
      where: { regNumber },
      select: { id: true, schoolId: true, status: true },
    });

    if (!student || student.status === "INACTIVE") {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 2. Find card ───────────────────────────────
    // Note: We do this before consuming card use, so that if PDF generation fails we don't consume a use on the card (we only mark the card as used after successfully generating the PDF)
    const card = await prisma.scratchCard.findUnique({
      where: { pin },
      include: { session: { select: { id: true, name: true } } },
    });

    if (!card) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    if (card.schoolId !== student.schoolId) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    if (card.status === "DISABLED") {
      return errorResponse("This scratch card has been disabled", 403);
    }

    // ── 3. Get active period ───────────────────────
    // Note: We do this before consuming card use, so that if PDF generation fails we don't consume a use on the card (we only mark the card as used after successfully generating the PDF)
    const { activePeriod, error: periodError } = await getActivePeriod(
      student.schoolId,
    );
    if (periodError) return periodError;

    const { session, term } = activePeriod!;

    // ── 4. Card session must match active session ──
    // Note: We do this before consuming card use, so that if PDF generation fails we don't consume a use on the card (we only mark the card as used after successfully generating the PDF)
    if (card.sessionId !== session.id) {
      return errorResponse(
        `This card is for the ${card.session.name} session.`,
        403,
      );
    }

    // ── 5. Card must not be exhausted ──────────────
    // Allow PDF download even if exhausted (they already paid for it)
    // but NOT if it was never used for this student + term
    const wasUsed = await prisma.cardUsage.findFirst({
      where: { cardId: card.id, studentId: student.id },
    });

    if (!wasUsed && card.status === "EXHAUSTED") {
      return errorResponse("This card has been exhausted", 403);
    }

    if (!wasUsed && card.usageCount >= card.maxUses) {
      return errorResponse("This scratch card has been used up", 403);
    }

    // ── 6. Fetch result ────────────────────────────
    // Note: We do this before consuming card use, so that if PDF generation fails we don't consume a use on the card (we only mark the card as used after successfully generating the PDF)
    const result = await prisma.result.findUnique({
      where: {
        studentId_termId: { studentId: student.id, termId: term.id },
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
          include: { subject: { select: { name: true, code: true } } },
          orderBy: { subject: { name: "asc" } },
        },
        skills: { orderBy: { name: "asc" } },
      },
    });

    if (!result) {
      return errorResponse("Result not found for the current term", 404);
    }

    if (!result.isPublished) {
      return errorResponse("Results have not been published yet", 403);
    }

    // ── 7. Build PDF data ──────────────────────────
    // Note: We do this before consuming card use, so that if PDF generation fails we don't consume a use on the card
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
    // ── Render PDF to binary buffer ────────────────────
    // Cast is safe — ResultSheet renders a <Document> at its root.
    const pdfBuffer = await renderToBuffer(
      createElement(ResultSheet, {
        data: pdfData,
      }) as ReactElement<DocumentProps>,
    );

    const filename =
      `Result_${result.student.lastName}_${result.term.name}_${result.session.name}.pdf`
        .replace(/\//g, "-")
        .replace(/\s+/g, "_");

    // ── Convert Buffer → Uint8Array for Web Response API ──
    // Required because TypeScript's BodyInit does not accept Node.js Buffer
    // directly, but does accept Uint8Array which Buffer extends
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
    console.error("[VALIDATE_PDF]", err);
    return errorResponse("Failed to generate PDF", 500);
  }
}
