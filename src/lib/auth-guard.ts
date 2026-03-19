import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "./jwt";
import { errorResponse } from "./response";

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  schoolId: string;
}

export function requireAuth(
  req: NextRequest,
  allowedRoles?: Role[]
): { auth: AuthContext | null; error: Response | null } {
  
  // ── 1. Try forwarded headers first (set by proxy) ──
  const userIdHeader = req.headers.get("x-user-id");
  const emailHeader = req.headers.get("x-user-email");
  const roleHeader = req.headers.get("x-user-role") as Role;
  const schoolIdHeader = req.headers.get("x-user-school-id");

  let auth: AuthContext | null = null;

  if (userIdHeader && emailHeader && roleHeader && schoolIdHeader) {
    auth = {
      userId: userIdHeader,
      email: emailHeader,
      role: roleHeader,
      schoolId: schoolIdHeader,
    };
  } else {
    // ── 2. Fallback: verify token directly from header ──
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return {
        auth: null,
        error: errorResponse("Authentication required", 401),
      };
    }

    try {
      const payload = verifyAccessToken(token);
      auth = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as Role,
        schoolId: payload.schoolId,
      };
    } catch {
      return {
        auth: null,
        error: errorResponse("Invalid or expired token", 401),
      };
    }
  }

  // ── 3. Role check ──────────────────────────────────
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return {
      auth: null,
      error: errorResponse("Forbidden: Insufficient permissions", 403),
    };
  }

  return { auth, error: null };
}