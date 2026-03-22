import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { disableCardSchema } from "@/validators/scratch-card.validator";
import { NextRequest } from "next/server";

// ── POST /api/scratch-cards/disable ───────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = disableCardSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { cardIds } = parsed.data;

    // Only disable UNUSED cards that belong to this school
    const { count } = await prisma.scratchCard.updateMany({
      where: {
        id: { in: cardIds },
        schoolId: auth!.schoolId,
        status: "UNUSED", // can't disable already used cards
      },
      data: { status: "DISABLED" },
    });

    if (count === 0) {
      return errorResponse(
        "No eligible cards found. Only unused cards can be disabled.",
        400,
      );
    }

    return successResponse(
      { disabledCount: count },
      `${count} card(s) disabled successfully`,
    );
  } catch (err) {
    console.error("[DISABLE_CARDS]", err);
    return errorResponse("Internal server error", 500);
  }
}
