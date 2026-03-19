import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { registerSchoolSchema } from "@/validators/auth.validator";
import { NextRequest } from "next/server";

// Generates a URL-safe slug from school name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── 1. Validate input ──────────────────────────────
    const parsed = registerSchoolSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const {
      schoolName,
      schoolEmail,
      schoolPhone,
      schoolAddress,
      adminFirstName,
      adminLastName,
      adminEmail,
      password,
    } = parsed.data;

    // ── 2. Check for existing school or admin email ────
    const [existingSchool, existingAdmin] = await Promise.all([
      prisma.school.findUnique({ where: { email: schoolEmail } }),
      prisma.user.findUnique({ where: { email: adminEmail } }),
    ]);

    if (existingSchool) {
      return errorResponse("A school with this email already exists", 409);
    }

    if (existingAdmin) {
      return errorResponse(
        "An account with this admin email already exists",
        409,
      );
    }

    // ── 3. Generate unique slug ────────────────────────
    let slug = generateSlug(schoolName);
    const slugExists = await prisma.school.findUnique({ where: { slug } });
    if (slugExists) {
      slug = `${slug}-${Date.now()}`;
    }

    // ── 4. Hash password ───────────────────────────────
    const hashedPassword = await hashPassword(password);

    // ── 5. Atomic transaction: create school + admin ───
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          slug,
          email: schoolEmail,
          phone: schoolPhone,
          address: schoolAddress,
        },
      });

      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          firstName: adminFirstName,
          lastName: adminLastName,
          role: "SCHOOL_ADMIN",
          schoolId: school.id,
        },
      });

      return { school, admin };
    });

    // ── 6. Return success (never return password) ──────
    return successResponse(
      {
        school: {
          id: result.school.id,
          name: result.school.name,
          slug: result.school.slug,
          email: result.school.email,
        },
        admin: {
          id: result.admin.id,
          email: result.admin.email,
          firstName: result.admin.firstName,
          lastName: result.admin.lastName,
          role: result.admin.role,
        },
      },
      "School registered successfully",
      201,
    );
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return errorResponse("Internal server error", 500);
  }
}
