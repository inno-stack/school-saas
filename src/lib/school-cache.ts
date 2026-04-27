/**
 * @file src/lib/school-cache.ts
 * @description In-memory cache for school data used in PDF generation.
 *
 * School data (logo, signatures, name, address) rarely changes.
 * Caching it for 5 minutes eliminates 1 DB query per PDF request.
 *
 * Cache is per-process (resets on server restart).
 * For multi-instance deployments, use Redis instead.
 */

import { prisma } from "./prisma";

// ── Cache storage ──────────────────────────────────
interface CachedSchool {
  data: SchoolPdfData;
  expiresAt: number; // Unix timestamp in ms
}

interface SchoolPdfData {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo: string | null;
  motto: string | null;
  teacherSignature: string | null;
  schoolSeal: string | null;
  principalSignature: string | null;
}

// ── In-memory cache map — schoolId → cached data ──
const cache = new Map<string, CachedSchool>();

// ── Cache TTL: 5 minutes ───────────────────────────
const TTL_MS = 5 * 60 * 1000;

/**
 * Gets school PDF data from cache or DB.
 * Cache hit: ~0ms. Cache miss: ~50-200ms (DB query).
 *
 * @param schoolId - The school's unique ID
 */
export async function getSchoolForPdf(
  schoolId: string,
): Promise<SchoolPdfData> {
  const now = Date.now();
  const cached = cache.get(schoolId);

  // ── Return cached data if still fresh ─────────
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  // ── Cache miss or expired — fetch from DB ──────
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      name: true,
      address: true,
      phone: true,
      email: true,
      logo: true,
      motto: true,
      teacherSignature: true,
      schoolSeal: true,
      principalSignature: true,
    },
  });

  if (!school) {
    throw new Error(`School not found: ${schoolId}`);
  }

  // ── Store in cache with expiry ─────────────────
  cache.set(schoolId, {
    data: school,
    expiresAt: now + TTL_MS,
  });

  return school;
}

/**
 * Invalidates the cache for a school.
 * Call this whenever school profile or signatures are updated
 * so the next PDF request gets fresh data.
 *
 * @param schoolId - The school whose cache should be cleared
 */
export function invalidateSchoolCache(schoolId: string): void {
  cache.delete(schoolId);
  console.log(`[SCHOOL_CACHE] Invalidated cache for school: ${schoolId}`);
}
