import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Get refresh token from HttpOnly cookie ──────
    const refreshToken = req.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return errorResponse("No refresh token provided", 401);
    }

    // ── 2. Verify the token signature ──────────────────
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return errorResponse("Invalid or expired refresh token", 401);
    }

    // ── 3. Check token exists in DB (not revoked) ──────
    const storedToken = await prisma.token.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return errorResponse("Refresh token expired or revoked", 401);
    }

    // ── 4. Rotate tokens (invalidate old, issue new) ───
    const [, newAccessToken, newRefreshToken] = await Promise.all([
      prisma.token.delete({ where: { token: refreshToken } }),
      generateAccessToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        schoolId: payload.schoolId,
      }),
      generateRefreshToken({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        schoolId: payload.schoolId,
      }),
    ]);

    // ── 5. Store new refresh token ─────────────────────
    await prisma.token.create({
      data: {
        token: newRefreshToken,
        type: "REFRESH",
        userId: payload.userId,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    // ── 6. Return new access token + rotate cookie ─────
    const response = successResponse(
      { accessToken: newAccessToken },
      "Token refreshed successfully",
    );

    response.cookies.set("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[REFRESH_ERROR]", error);
    return errorResponse("Internal server error", 500);
  }
}
