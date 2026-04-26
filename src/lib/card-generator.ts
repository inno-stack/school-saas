/**
 * @file src/lib/card-generator.ts
 * @description Collision-proof scratch card serial and PIN generator.
 *
 * Problem with old approach:
 * - COUNT(*) + offset gives same number to concurrent requests
 * - Race conditions cause duplicate serials → P2002 crash
 *
 * New approach:
 * - Query the LAST existing serial for this school/year
 * - Increment from that — never from a count
 * - Generate all serials BEFORE inserting any
 * - Insert one-by-one instead of createMany (catches per-card conflicts)
 * - Each card retries independently on collision
 */

import crypto from "crypto";
import { prisma } from "./prisma";

/**
 * Generates the next available serial number for a school.
 * Queries existing serials to find the highest sequence used,
 * then increments safely.
 *
 * @param schoolSlug  - School slug for prefix (e.g. "GRE")
 * @param schoolId    - School ID for scoping
 * @param batchOffset - Offset within current batch (0, 1, 2...)
 */
async function getNextSerial(
  schoolSlug: string,
  schoolId: string,
  batchOffset: number = 0,
): Promise<string> {
  const year = new Date().getFullYear();

  // ── Build prefix from first 3 letters of slug ──
  const prefix = schoolSlug.replace(/-/g, "").substring(0, 3).toUpperCase();

  // ── Find the highest existing serial for this school/year ─
  // More reliable than COUNT — works even after deletions
  const lastCard = await prisma.scratchCard.findFirst({
    where: {
      schoolId,
      serial: { startsWith: `${prefix}-${year}-` },
    },
    orderBy: { serial: "desc" }, // lexicographic desc gives highest number
    select: { serial: true },
  });

  // ── Parse the last sequence number ─────────────
  let lastSequence = 0;

  if (lastCard?.serial) {
    // Serial format: "GRE-2026-000042" → extract "000042" → 42
    const parts = lastCard.serial.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      lastSequence = lastNum;
    }
  }

  // ── Add batch offset to avoid collisions within same batch ─
  const nextSequence = lastSequence + batchOffset + 1;
  const padded = String(nextSequence).padStart(6, "0");

  return `${prefix}-${year}-${padded}`;
}

/**
 * Generates a cryptographically random 12-digit numeric PIN.
 * Uses crypto.randomInt for better randomness than Math.random.
 */
export function generatePin(): string {
  // ── Generate each digit independently for true randomness ─
  return Array.from({ length: 12 }, () =>
    crypto.randomInt(0, 10).toString(),
  ).join("");
}

/**
 * Generates a PIN guaranteed to be unique in the database.
 * Retries until a non-duplicate PIN is found.
 * Collision probability: ~1 in 10^12 per attempt — extremely rare.
 *
 * @param maxRetries - Maximum attempts before throwing (default: 10)
 */
export async function generateUniquePin(
  maxRetries: number = 10,
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const pin = generatePin();

    // ── Check uniqueness across ALL schools ────────
    const existing = await prisma.scratchCard.findUnique({
      where: { pin },
      select: { id: true },
    });

    if (!existing) {
      return pin; // ← unique PIN found
    }

    // ── Collision — extremely rare but handle gracefully ─
    console.warn(
      `[PIN_GEN] PIN collision on attempt ${attempt + 1}, regenerating...`,
    );
  }

  throw new Error(
    `[PIN_GEN] Could not generate unique PIN after ${maxRetries} attempts`,
  );
}

/**
 * Generates a batch of scratch cards with guaranteed unique serials and PINs.
 * Uses individual inserts (not createMany) so each card retries independently.
 *
 * @param schoolSlug - School slug for serial prefix
 * @param schoolId   - School tenant ID
 * @param sessionId  - Active session ID (cards are session-locked)
 * @param quantity   - Number of cards to generate
 * @param assignedTo - Optional student ID to pre-assign cards to
 * @returns Array of created card IDs and their details
 */
export async function generateScratchCards(params: {
  schoolSlug: string;
  schoolId: string;
  sessionId: string;
  quantity: number;
  assignedTo?: string | null;
}) {
  const { schoolSlug, schoolId, sessionId, quantity, assignedTo } = params;

  const createdCards: string[] = [];
  const MAX_CARD_RETRIES = 5;

  // ── Pre-calculate all serials BEFORE any inserts ─
  // This prevents the race condition from count-based generation
  const prebuiltSerials: string[] = [];

  for (let i = 0; i < quantity; i++) {
    // Pass i as offset so each card in the batch gets a unique sequence
    const serial = await getNextSerial(schoolSlug, schoolId, i);
    prebuiltSerials.push(serial);
  }

  // ── Deduplicate prebuilt serials (extra safety) ─
  const uniqueSerials = [...new Set(prebuiltSerials)];

  // If Set removed duplicates (edge case), fill back up
  if (uniqueSerials.length < quantity) {
    console.warn(
      `[CARD_GEN] ${quantity - uniqueSerials.length} duplicate serial(s) detected in batch. Regenerating...`,
    );
    // Fill the gap by querying fresh serials with higher offsets
    for (let extra = 0; uniqueSerials.length < quantity; extra++) {
      const serial = await getNextSerial(
        schoolSlug,
        schoolId,
        quantity + extra,
      );
      if (!uniqueSerials.includes(serial)) {
        uniqueSerials.push(serial);
      }
    }
  }

  // ── Insert each card individually ──────────────
  // Individual inserts allow per-card retry on collision
  // Much safer than createMany which rolls back the entire batch
  for (let i = 0; i < quantity; i++) {
    let serial = uniqueSerials[i];
    let inserted = false;
    let cardRetry = 0;

    while (!inserted && cardRetry < MAX_CARD_RETRIES) {
      try {
        // ── Generate unique PIN for this card ──────
        const pin = await generateUniquePin();

        // ── Check serial is still available ────────
        // Another concurrent request may have taken it
        const serialExists = await prisma.scratchCard.findUnique({
          where: { serial },
          select: { id: true },
        });

        if (serialExists) {
          // Serial was taken — get a fresh one with higher offset
          serial = await getNextSerial(
            schoolSlug,
            schoolId,
            quantity + i + cardRetry + 100,
          );
          cardRetry++;
          continue;
        }

        // ── Insert the card ─────────────────────────
        const card = await prisma.scratchCard.create({
          data: {
            serial,
            pin,
            schoolId,
            sessionId,
            assignedTo: assignedTo ?? null,
            // status defaults to ACTIVE, usageCount defaults to 0
          },
          select: { id: true },
        });

        createdCards.push(card.id);
        inserted = true;
      } catch (err: any) {
        if (err?.code === "P2002") {
          // ── Unique constraint violation — retry with new values ─
          console.warn(
            `[CARD_GEN] Card ${i + 1}/${quantity} collision on retry ${cardRetry + 1}. Retrying...`,
          );
          // Get a completely fresh serial for this retry
          serial = await getNextSerial(
            schoolSlug,
            schoolId,
            quantity + i + cardRetry + 200,
          );
          cardRetry++;
        } else {
          // ── Non-collision error — rethrow ──────────
          throw err;
        }
      }
    }

    if (!inserted) {
      throw new Error(
        `[CARD_GEN] Failed to insert card ${i + 1} after ${MAX_CARD_RETRIES} retries`,
      );
    }
  }

  return createdCards;
}
