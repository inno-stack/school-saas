import { Grade } from "@prisma/client";

export interface GradeResult {
  grade: Grade;
  description: string;
  remark: string;
}

// ── Custom grade scale ─────────────────────────────
export function calculateGrade(total: number): GradeResult {
  if (total >= 70) {
    return { grade: "A", description: "Distinction", remark: "Excellent" };
  } else if (total >= 60) {
    return { grade: "B", description: "Upper Credit", remark: "Very Good" };
  } else if (total >= 50) {
    return { grade: "C", description: "Credit", remark: "Good" };
  } else if (total >= 45) {
    return { grade: "P", description: "Pass", remark: "Fair" };
  } else {
    return { grade: "F", description: "Fail", remark: "Poor" };
  }
}

// ── Overall performance from average ──────────────
export function getOverallPerformance(average: number): string {
  if (average >= 70) return "Distinction";
  if (average >= 60) return "Upper Credit";
  if (average >= 50) return "Credit";
  if (average >= 45) return "Pass";
  return "Fail";
}

// ── Ordinal position: 1 → "1st", 2 → "2nd" ───────
export function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
