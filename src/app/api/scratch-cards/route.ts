import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { generateSerial, generateUniquePin } from "@/lib/card-generator";
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
          usageCount: true,    // ← how many times used out of maxUses
          maxUses: true,        // ← always 4 in current system
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

// ── POST /api/scratch-cards ────────────────────────
// Cards are always tied to the ACTIVE session
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

    // ── Cards MUST be tied to the active session ───
    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { session } = activePeriod!;

    // Verify student if pre-assigning
    if (assignedTo) {
      const student = await prisma.student.findFirst({
        where: { id: assignedTo, schoolId: auth!.schoolId },
      });
      if (!student) {
        return errorResponse("Student not found", 404);
      }
    }

    const school = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: { slug: true },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    // Generate cards with unique serials + PINs
    const cards = [];

    for (let i = 0; i < quantity; i++) {
      const [serial, pin] = await Promise.all([
        generateSerial(school.slug, auth!.schoolId, i),
        generateUniquePin(),
      ]);

      cards.push({
        serial,
        pin,
        schoolId: auth!.schoolId,
        sessionId: session.id, // ← lock to active session
        assignedTo: assignedTo ?? null,
      });
    }

    await prisma.scratchCard.createMany({ data: cards });

    const created = await prisma.scratchCard.findMany({
      where: {
        schoolId: auth!.schoolId,
        serial: { in: cards.map((c) => c.serial) },
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
      orderBy: { createdAt: "desc" },
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
  } catch (err) {
    console.error("[GENERATE_CARDS]", err);
    return errorResponse("Internal server error", 500);
  }
}
