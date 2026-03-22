import { requireAuth } from "@/lib/auth-guard";
import { generateSerial, generateUniquePin } from "@/lib/card-generator";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { generateCardsSchema } from "@/validators/scratch-card.validator";
import { NextRequest } from "next/server";

// ── GET /api/scratch-cards ─────────────────────────
// List all cards for this school (paginated + filters)
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
      ...(status && { status: status as "UNUSED" | "USED" | "DISABLED" }),
      ...(search && {
        OR: [
          { serial: { contains: search, mode: "insensitive" as const } },
          { pin: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

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
          assignedTo: true,
          usedBy: true,
          usedAt: true,
          createdAt: true,
        },
      }),
      prisma.scratchCard.count({ where }),
    ]);

    // Summary counts
    const [unused, used, disabled] = await Promise.all([
      prisma.scratchCard.count({
        where: { schoolId: auth!.schoolId, status: "UNUSED" },
      }),
      prisma.scratchCard.count({
        where: { schoolId: auth!.schoolId, status: "USED" },
      }),
      prisma.scratchCard.count({
        where: { schoolId: auth!.schoolId, status: "DISABLED" },
      }),
    ]);

    return successResponse(
      {
        cards,
        summary: { unused, used, disabled, total: unused + used + disabled },
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
// Generate a batch of scratch cards
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

    // If assigning to a student, verify they exist in this school
    if (assignedTo) {
      const student = await prisma.student.findFirst({
        where: { id: assignedTo, schoolId: auth!.schoolId },
      });
      if (!student) {
        return errorResponse("Student not found", 404);
      }
    }

    // Get school slug for serial generation
    const school = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: { slug: true },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    // Generate cards one by one to ensure unique serials + PINs
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
        assignedTo: assignedTo ?? null,
      });
    }

    // Bulk insert all generated cards
    await prisma.scratchCard.createMany({ data: cards });

    // Return the generated cards
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
        assignedTo: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(
      {
        generated: created.length,
        cards: created,
      },
      `${created.length} scratch card(s) generated successfully`,
      201,
    );
  } catch (err) {
    console.error("[GENERATE_CARDS]", err);
    return errorResponse("Internal server error", 500);
  }
}
