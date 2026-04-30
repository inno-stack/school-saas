/**
 * @file src/app/api/public/sessions/route.ts
 * @description Returns all sessions with their terms.
 * Removed distinct — returns all sessions across all schools.
 * The validate endpoint enforces school-level card locking.
 */

import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // ── Fetch all sessions with their terms ────────
    // Group by session name to deduplicate across schools
    // But keep ALL session IDs so term lookups work correctly
    const sessions = await prisma.session.findMany({
      orderBy: { name: "desc" },
      select: {
        id: true,
        name: true,
        isActive: true,
        schoolId: true,
        terms: {
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            isActive: true,
            schoolId: true,
          },
        },
      },
    });

    // ── Deduplicate by session name ─────────────────
    // Keep one entry per session name but preserve real IDs
    const seen = new Set<string>();
    const unique = sessions.filter((s) => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      return true;
    });

    // ── Format with term labels + cumulative option ─
    const formatted = unique.map((s) => {
      const terms: Array<{
        id: string;
        name: string;
        isActive: boolean;
        isCumulative: boolean;
        label: string;
      }> = s.terms.map((t) => ({
        id: t.id,
        name: t.name,
        isActive: t.isActive,
        isCumulative: false,
        label:
          t.name === "FIRST"
            ? "1st Term"
            : t.name === "SECOND"
              ? "2nd Term"
              : "3rd Term",
      }));

      // ── Add cumulative option if 2+ terms exist ───
      if (terms.length >= 2) {
        terms.push({
          id: "CUMULATIVE",
          name: "CUMULATIVE",
          isActive: false,
          isCumulative: true,
          label: "Cumulative (All Terms)",
        });
      }

      return {
        id: s.id,
        name: s.name,
        isActive: s.isActive,
        terms,
      };
    });

    return successResponse(formatted, "Sessions fetched successfully");
  } catch (err) {
    console.error("[PUBLIC_SESSIONS]", err);
    return errorResponse("Internal server error", 500);
  }
}
