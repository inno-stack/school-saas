import { prisma } from "./prisma";

// Generates: GFA/2024/001 → GFA/2024/002 → GFA/2024/003
// Format: <SCHOOL_PREFIX>/<YEAR>/<SEQUENCE>

export async function generateRegNumber(
  schoolId: string,
  schoolSlug: string,
): Promise<string> {
  const year = new Date().getFullYear();

  // Build prefix from first 3 letters of slug (uppercase)
  const prefix = schoolSlug.replace(/-/g, "").substring(0, 3).toUpperCase();

  // Count existing students this year for this school
  const count = await prisma.student.count({
    where: {
      schoolId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lte: new Date(`${year}-12-31`),
      },
    },
  });

  // Pad sequence to 3 digits: 1 → 001, 25 → 025
  const sequence = String(count + 1).padStart(3, "0");

  return `${prefix}/${year}/${sequence}`;
}
