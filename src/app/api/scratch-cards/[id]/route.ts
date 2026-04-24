/**
 * @file src/app/api/scratch-cards/[id]/route.ts
 * @description Single scratch card operations — GET and DELETE
 * Note: usedBy/usedAt were removed in the redesign.
 * Usage tracking is now done via the CardUsage relation.
 */

import { NextRequest } from "next/server";
import { prisma }      from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, errorResponse } from "@/lib/response";

// ── GET /api/scratch-cards/[id] ────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const card = await prisma.scratchCard.findFirst({
      where: { id, schoolId: auth!.schoolId },
      select: {
        id:         true,
        serial:     true,
        pin:        true,
        status:     true,
        usageCount: true,   // ← tracks how many times it has been used
        maxUses:    true,   // ← maximum allowed uses (default: 4)
        assignedTo: true,
        createdAt:  true,
        updatedAt:  true,
        // ── Include usage audit trail ──────────────
        // Each entry shows who used the card and for which term
        usages: {
          orderBy: { usedAt: "desc" },
          select: {
            usedAt:  true,
            student: { select: { firstName: true, lastName: true, regNumber: true } },
            term:    { select: { name: true } },
          },
        },
      },
    });

    if (!card) {
      return errorResponse("Scratch card not found", 404);
    }

    return successResponse(card, "Scratch card fetched successfully");
  } catch (err) {
    console.error("[GET_CARD]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── DELETE /api/scratch-cards/[id] ────────────────
// Hard delete — only allowed for UNUSED/ACTIVE cards with zero uses
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const card = await prisma.scratchCard.findFirst({
      where: { id, schoolId: auth!.schoolId },
    });

    if (!card) {
      return errorResponse("Scratch card not found", 404);
    }

    // ── Prevent deletion of cards that have been used ──
    // Once a card has been used even once, it must be preserved
    // for audit trail purposes — disable it instead of deleting
    if (card.usageCount > 0) {
      return errorResponse(
        "Cannot delete a card that has been used. Disable it instead.",
        400
      );
    }

    await prisma.scratchCard.delete({ where: { id } });

    return successResponse(null, "Scratch card deleted successfully");
  } catch (err) {
    console.error("[DELETE_CARD]", err);
    return errorResponse("Internal server error", 500);
  }
}