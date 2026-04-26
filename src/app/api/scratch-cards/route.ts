/**
 * @file src/app/api/scratch-cards/route.ts (POST handler only — replace this section)
 * @description Updated card generation using collision-proof generator.
 */

import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { generateScratchCards } from "@/lib/card-generator";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { generateCardsSchema } from "@/validators/scratch-card.validator";
import { NextRequest } from "next/server";

// ── GET /api/scratch-cards ─────────────────────────
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"));
    const status = searchParams.get("status") ?? "";
    const search = searchParams.get("search") ?? "";
    const skip = (page - 1) * limit;

    const where = {
      schoolId: auth!.schoolId,
      ...(status && { status: status as "ACTIVE" | "EXHAUSTED" | "DISABLED" }),
      ...(search && {
        OR: [
          { serial: { contains: search, mode: "insensitive" as const } },
          { pin: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };
    // ── Fetch paginated scratch cards ──────────────────
    const [cards, total] = await Promise.all([
      prisma.scratchCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          serial: true,
          pin: true,
          status: true,
          usageCount: true, // ← how many times used out of maxUses
          maxUses: true, // ← always 4 in current system
          assignedTo: true,
          createdAt: true,
          session: {
            select: { id: true, name: true },
          },
          // ── Include usage history for the card list view ──
          usages: {
            orderBy: { usedAt: "desc" },
            select: {
              usedAt: true,
              term: { select: { name: true } },
              student: {
                select: { firstName: true, lastName: true, regNumber: true },
              },
            },
          },
        },
      }),
      prisma.scratchCard.count({ where }),
    ]);

    // Summary counts
    const [active, exhausted, disabled] = await Promise.all([
      prisma.scratchCard.count({
        where: { schoolId: auth!.schoolId, status: "ACTIVE" },
      }),
      prisma.scratchCard.count({
        where: { schoolId: auth!.schoolId, status: "EXHAUSTED" },
      }),
      prisma.scratchCard.count({
        where: { schoolId: auth!.schoolId, status: "DISABLED" },
      }),
    ]);

    return successResponse(
      {
        cards,
        summary: {
          active,
          exhausted,
          disabled,
          total: active + exhausted + disabled,
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Scratch cards fetched successfully",
    );
  } catch (err) {
    console.error("[GET_CARDS]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── Replace the entire POST function ──────────────
export async function POST(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = generateCardsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { quantity, assignedTo } = parsed.data;

    // ── Cards must be tied to the active session ───
    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { session } = activePeriod!;

    // ── Verify student if pre-assigning ───────────
    if (assignedTo) {
      const student = await prisma.student.findFirst({
        where: { id: assignedTo, schoolId: auth!.schoolId },
      });
      if (!student) {
        return errorResponse("Student not found", 404);
      }
    }

    // ── Get school slug for serial prefix ─────────
    const school = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: { slug: true },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    // ── Generate cards using collision-proof system ─
    const cardIds = await generateScratchCards({
      schoolSlug: school.slug,
      schoolId: auth!.schoolId,
      sessionId: session.id,
      quantity,
      assignedTo: assignedTo ?? null,
    });

    // ── Fetch the created cards to return ──────────
    const created = await prisma.scratchCard.findMany({
      where: {
        id: { in: cardIds },
      },
      select: {
        id: true,
        serial: true,
        pin: true,
        status: true,
        usageCount: true,
        maxUses: true,
        assignedTo: true,
        createdAt: true,
        session: { select: { name: true } },
      },
      orderBy: { serial: "asc" },
    });

    return successResponse(
      {
        generated: created.length,
        session: session.name,
        usesPerCard: 4,
        cards: created,
      },
      `${created.length} scratch card(s) generated for ${session.name} session`,
      201,
    );
  } catch (err: any) {
    console.error("[GENERATE_CARDS]", err?.message);
    return errorResponse("Failed to generate scratch cards", 500);
  }
}
