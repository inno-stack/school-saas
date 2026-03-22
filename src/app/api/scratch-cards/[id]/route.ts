import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

// ── GET /api/scratch-cards/[id] ────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { id } = await params;

    const card = await prisma.scratchCard.findFirst({
      where: { id, schoolId: auth!.schoolId },
      select: {
        id: true,
        serial: true,
        pin: true,
        status: true,
        assignedTo: true,
        usedBy: true,
        usedAt: true,
        createdAt: true,
        updatedAt: true,
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
// Hard delete only if UNUSED
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    if (card.status !== "UNUSED") {
      return errorResponse("Only unused cards can be deleted", 400);
    }

    await prisma.scratchCard.delete({ where: { id } });

    return successResponse(null, "Scratch card deleted successfully");
  } catch (err) {
    console.error("[DELETE_CARD]", err);
    return errorResponse("Internal server error", 500);
  }
}
