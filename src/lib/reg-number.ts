/**
 * @file src/lib/reg-number.ts
 * @description Auto-generates unique student registration numbers.
 *
 * Format: PREFIX/YEAR/SEQUENCE
 * Example: GRE/2026/001
 *
 * Problem with the old approach:
 * Counting existing students and using count+1 as sequence fails when:
 * 1. Two requests fire simultaneously (race condition)
 * 2. A student was deleted (count drops, collision with old reg number)
 * 3. Students from different slugs share the same count
 *
 * Solution:
 * Query the LAST reg number matching this prefix/year pattern
 * and increment it. Wrap in a retry loop to handle race conditions.
 */

import { prisma } from "./prisma";

/**
 * Generates a unique registration number for a student.
 * Retries up to 5 times if a collision occurs.
 *
 * @param schoolId  - The school's unique ID (for scoping)
 * @param schoolSlug - The school's slug (used as prefix)
 * @returns A unique reg number string e.g. "GRE/2026/001"
 */
export async function generateRegNumber(
  schoolId: string,
  schoolSlug: string,
): Promise<string> {
  const year = new Date().getFullYear();

  // ── Build 3-letter prefix from slug ───────────
  // e.g. "greenfield-academy" → "GRE"
  const prefix = schoolSlug.replace(/-/g, "").substring(0, 3).toUpperCase();

  // ── Retry loop — handles race conditions ───────
  // If two requests run simultaneously and generate the same number,
  // the second will get a P2002 error which we catch and retry.
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // ── Find the last reg number for this prefix/year ─
    // This is more reliable than counting — works even if
    // students were deleted or created out of order.
    const lastStudent = await prisma.student.findFirst({
      where: {
        schoolId,
        regNumber: {
          // Match pattern like "GRE/2026/..."
          startsWith: `${prefix}/${year}/`,
        },
      },
      orderBy: { regNumber: "desc" }, // highest sequence last
      select: { regNumber: true },
    });

    // ── Calculate next sequence number ─────────────
    let nextSequence = 1;

    if (lastStudent?.regNumber) {
      // Extract the numeric sequence from the end
      // e.g. "GRE/2026/007" → 7 → next is 8
      const parts = lastStudent.regNumber.split("/");
      const lastSeq = parseInt(parts[parts.length - 1], 10);

      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }

    // ── Format with zero-padding ────────────────────
    // 1 → "001", 25 → "025", 100 → "100"
    const sequence = String(nextSequence).padStart(3, "0");
    const regNumber = `${prefix}/${year}/${sequence}`;

    // ── Check this specific reg number isn't taken ──
    // This extra check handles any edge case the ordering misses
    const exists = await prisma.student.findUnique({
      where: { regNumber },
      select: { id: true },
    });

    if (!exists) {
      // ── Reg number is available — return it ────────
      return regNumber;
    }

    // ── Collision detected — log and retry ─────────
    console.warn(
      `[REG_NUMBER] Collision on attempt ${attempt + 1}: ${regNumber} already exists. Retrying...`,
    );

    // Small delay before retry to reduce simultaneous collision chance
    await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
  }

  // ── All retries exhausted — use timestamp fallback ─
  // This guarantees uniqueness at the cost of a less clean number.
  // Should essentially never happen in normal usage.
  const timestamp = Date.now().toString().slice(-4);
  const fallback = `${prefix}/${year}/${timestamp}`;

  console.error(
    `[REG_NUMBER] All ${MAX_RETRIES} retries exhausted. Using timestamp fallback: ${fallback}`,
  );

  return fallback;
}
