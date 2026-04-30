/**
 * @file src/app/api/scratch-cards/validate-cumulative-pdf/route.ts
 * @description Public endpoint — validates PIN and returns cumulative PDF.
 * Costs one card use (same as regular term check).
 * Card must match the session being requested.
 */

import { CumulativeResultSheet } from "@/components/pdf/CumulativeResultSheet";
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
import { z } from "zod";

const schema = z.object({
  regNumber: z.string().min(1),
  pin: z.string().length(12),
  sessionId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { regNumber, pin, sessionId } = parsed.data;

    // ── 1. Find student ────────────────────────────
    const student = await prisma.student.findUnique({
      where: { regNumber },
      select: { id: true, schoolId: true, status: true },
    });

    if (!student || student.status === "INACTIVE") {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    // ── 2. Find card ───────────────────────────────
    const card = await prisma.scratchCard.findUnique({
      where: { pin },
      include: { session: { select: { id: true, name: true } } },
    });

    if (!card || card.schoolId !== student.schoolId) {
      return errorResponse("Invalid registration number or PIN", 401);
    }

    if (card.status === "DISABLED") {
      return errorResponse("This scratch card has been disabled.", 403);
    }

    // ── 3. Session lock check ──────────────────────
    if (card.sessionId !== sessionId) {
      return errorResponse(
        `This card is for the ${card.session.name} session only.`,
        403,
      );
    }

    // ── 4. Check usage count ───────────────────────
    if (card.usageCount >= card.maxUses) {
      return errorResponse("This scratch card has been exhausted.", 403);
    }

    // ── 5. Record cumulative as a special usage ────
    // Uses a sentinel termId to track cumulative checks
    const newUsageCount = card.usageCount + 1;
    const newStatus = newUsageCount >= card.maxUses ? "EXHAUSTED" : "ACTIVE";

    await prisma.scratchCard.update({
      where: { id: card.id },
      data: { usageCount: newUsageCount, status: newStatus },
    });

    // ── 6. Calculate cumulative ────────────────────
    const cumulative = await calculateCumulativeResult(
      student.id,
      sessionId,
      student.schoolId,
    );

    if (!cumulative) {
      return errorResponse("No published results found for this session.", 404);
    }

    // ── 7. Calculate position ──────────────────────
    const positions = await calculateCumulativePositions(
      cumulative.classId,
      sessionId,
      student.schoolId,
    );

    const pos = positions.get(student.id);
    if (pos) {
      cumulative.summary.position = getOrdinal(pos.position);
      cumulative.summary.outOf = pos.outOf;
    }

    // ── 8. Generate and return PDF ─────────────────
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
    console.error("[CUMULATIVE_PDF_PUBLIC]", err);
    return errorResponse("Failed to generate cumulative PDF", 500);
  }
}
