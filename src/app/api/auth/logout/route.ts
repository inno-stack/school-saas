import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refreshToken")?.value;

    // Delete from DB if token exists
    if (refreshToken) {
      await prisma.token.deleteMany({
        where: { token: refreshToken },
      });
    }

    const response = successResponse(null, "Logged out successfully");

    // Clear the cookie
    response.cookies.set("refreshToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[LOGOUT_ERROR]", error);
    return errorResponse("Internal server error", 500);
  }
}
