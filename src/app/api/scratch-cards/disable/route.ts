import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { disableCardSchema } from "@/validators/scratch-card.validator";
import { NextRequest } from "next/server";
// 1. Import the CardStatus enum from Prisma
import { CardStatus } from "@prisma/client";

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

    // 2. Use CardStatus.ACTIVE instead of "UNUSED"
    const { count } = await prisma.scratchCard.updateMany({
      where: {
        id: { in: cardIds },
        schoolId: auth!.schoolId,
        status: CardStatus.ACTIVE, 
      },
      data: { status: CardStatus.DISABLED },
    });

    if (count === 0) {
      return errorResponse(
        "No eligible cards found. Only active cards can be disabled.",
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