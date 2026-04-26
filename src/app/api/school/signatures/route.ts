/**
 * @file src/app/api/school/signatures/route.ts
 * @description Handles upload and retrieval of school signature images.
 *
 * Images are stored as base64 data URLs in the database.
 * This approach avoids needing external storage (S3, Cloudinary)
 * while still working in the PDF generator.
 *
 * Max file size: 500KB per image (enforced by validation)
 * Accepted formats: PNG, JPEG, WebP
 */

import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";
import { z } from "zod";

// ── Validation schema ──────────────────────────────
const signaturesSchema = z.object({
  // Each field is optional — admin can update one at a time
  teacherSignature: z.string().nullable().optional(),
  schoolSeal: z.string().nullable().optional(),
  principalSignature: z.string().nullable().optional(),
});

// ── GET /api/school/signatures ─────────────────────
// Fetch current signature images for the school
export async function GET(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const school = await prisma.school.findUnique({
      where: { id: auth!.schoolId },
      select: {
        teacherSignature: true,
        schoolSeal: true,
        principalSignature: true,
      },
    });

    if (!school) {
      return errorResponse("School not found", 404);
    }

    return successResponse(school, "Signatures fetched successfully");
  } catch (err) {
    console.error("[GET_SIGNATURES]", err);
    return errorResponse("Internal server error", 500);
  }
}

// ── PUT /api/school/signatures ─────────────────────
// Save/update signature images
export async function PUT(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = signaturesSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    // ── Validate base64 image sizes ────────────────
    // Prevent storing extremely large images in the DB
    const MAX_SIZE_BYTES = 500 * 1024; // 500KB

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value && typeof value === "string") {
        // ── Calculate approximate byte size of base64 string ─
        const sizeInBytes = Math.ceil((value.length * 3) / 4);
        if (sizeInBytes > MAX_SIZE_BYTES) {
          return errorResponse(
            `${key} image is too large. Maximum size is 500KB. ` +
              `Please compress or resize the image before uploading.`,
            400,
          );
        }

        // ── Validate it's a real image data URL ────
        const isValidDataUrl = value.startsWith("data:image/");
        if (!isValidDataUrl) {
          return errorResponse(
            `${key} must be a valid image. Accepted formats: PNG, JPEG, WebP.`,
            400,
          );
        }
      }
    }

    // ── Update only the fields that were provided ──
    const updated = await prisma.school.update({
      where: { id: auth!.schoolId },
      data: {
        ...(parsed.data.teacherSignature !== undefined && {
          teacherSignature: parsed.data.teacherSignature,
        }),
        ...(parsed.data.schoolSeal !== undefined && {
          schoolSeal: parsed.data.schoolSeal,
        }),
        ...(parsed.data.principalSignature !== undefined && {
          principalSignature: parsed.data.principalSignature,
        }),
      },
      select: {
        teacherSignature: true,
        schoolSeal: true,
        principalSignature: true,
      },
    });

    return successResponse(
      updated,
      "Signature images saved successfully. They will appear on all future result PDFs.",
    );
  } catch (err) {
    console.error("[UPDATE_SIGNATURES]", err);
    return errorResponse("Internal server error", 500);
  }
}
