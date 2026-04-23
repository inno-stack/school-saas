import { verifyAccessToken } from "@/lib/jwt";
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/results/verify",
  "/api/scratch-cards/validate",
  "/api/scratch-cards/validate-pdf",
];

const ROLE_ROUTES: Record<string, string[]> = {
  "/api/admin": ["SUPER_ADMIN"],
  "/api/school": ["SCHOOL_ADMIN", "SUPER_ADMIN"],
  "/api/teacher": ["TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"],
  "/api/parent": ["PARENT", "SCHOOL_ADMIN", "SUPER_ADMIN"],
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  // Only guard /api routes
  if (!pathname.startsWith("/api")) return NextResponse.next();

  // Extract token
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  try {
    const payload = verifyAccessToken(token);

    // Role-based access control
    const matchedRoute = Object.keys(ROLE_ROUTES).find((route) =>
      pathname.startsWith(route),
    );

    if (matchedRoute) {
      const allowedRoles = ROLE_ROUTES[matchedRoute];
      if (!allowedRoles.includes(payload.role)) {
        return NextResponse.json(
          { success: false, message: "Forbidden: Insufficient permissions" },
          { status: 403 },
        );
      }
    }

    // Inject user info into headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.userId);
    requestHeaders.set("x-user-email", payload.email);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-school-id", payload.schoolId);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid or expired token" },
      { status: 401 },
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
