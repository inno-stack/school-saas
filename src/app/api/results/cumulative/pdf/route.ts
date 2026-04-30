/**
 * @file src/app/api/results/cumulative/pdf/route.ts
 * @description Generates and streams a cumulative result PDF.
 * Used by both admin dashboard and the scratch card checker.
 */

import { CumulativeResultSheet } from "@/components/pdf/CumulativeResultSheet";
import { requireAuth } from "@/lib/auth-guard";
import {
  calculateCumulativePositions,
  calculateCumulativeResult,
} from "@/lib/cumulative-engine";
import { getOrdinal } from "@/lib/grade-engine";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/response";
import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";
import type { ReactElement } from "react";
import { createElement } from "react";

// ── GET /api/results/cumulative/pdf?studentId=x&sessionId=y ─
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
    const sessionId = searchParams.get("sessionId");

    if (!studentId || !sessionId) {
      return errorResponse("studentId and sessionId are required", 400);
    }

    // ── Verify student belongs to this school ──────
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: auth!.schoolId },
      select: { id: true },
    });

    if (!student) {
      return errorResponse("Student not found", 404);
    }

    // ── Calculate cumulative ───────────────────────
    const cumulative = await calculateCumulativeResult(
      studentId,
      sessionId,
      auth!.schoolId,
    );

    if (!cumulative) {
      return errorResponse(
        "No published results found for this student in this session.",
        404,
      );
    }

    // ── Calculate class position ───────────────────
    const positions = await calculateCumulativePositions(
      cumulative.classId,
      sessionId,
      auth!.schoolId,
    );

    const pos = positions.get(studentId);
    if (pos) {
      cumulative.summary.position = getOrdinal(pos.position);
      cumulative.summary.outOf = pos.outOf;
    }

    // ── Render PDF ─────────────────────────────────
    const pdfBuffer = await renderToBuffer(
      createElement(CumulativeResultSheet, {
        data: cumulative,
      }) as ReactElement<DocumentProps>,
    );

    const filename = `Cumulative_${cumulative.student.fullName}_${
      cumulative.sessionName
    }.pdf`
      .replace(/\s+/g, "_")
      .replace(/\//g, "-");

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("[CUMULATIVE_PDF]", err);
    return errorResponse("Failed to generate cumulative PDF", 500);
  }
}
