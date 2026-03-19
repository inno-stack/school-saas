import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from "@/lib/jwt";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { loginSchema } from "@/validators/auth.validator";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── 1. Validate input ──────────────────────────────
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { email, password } = parsed.data;

    // ── 2. Find user ───────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        school: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
    });

    // Use same error message to prevent user enumeration attacks
    if (!user) {
      return errorResponse("Invalid email or password", 401);
    }

    // ── 3. Check account status ────────────────────────
    if (!user.isActive) {
      return errorResponse("Your account has been deactivated", 403);
    }

    if (!user.school.isActive) {
      return errorResponse("This school account has been deactivated", 403);
    }

    // ── 4. Verify password ─────────────────────────────
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return errorResponse("Invalid email or password", 401);
    }

    // ── 5. Build JWT payload ───────────────────────────
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
    };

    // ── 6. Generate tokens ─────────────────────────────
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // ── 7. Store refresh token in DB ───────────────────
    await prisma.token.create({
      data: {
        token: refreshToken,
        type: "REFRESH",
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // ── 8. Build response with HttpOnly cookie ─────────
    const response = successResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          school: user.school,
        },
        accessToken,
      },
      "Login successful",
    );

    // Set refresh token as HttpOnly cookie (not accessible to JS)
    response.cookies.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[LOGIN_ERROR]", error);
    return errorResponse("Internal server error", 500);
  }
}
