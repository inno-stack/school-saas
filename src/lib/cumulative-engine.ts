/**
 * @file src/lib/cumulative-engine.ts
 * @description Calculates cumulative (end-of-session) academic results.
 *
 * Cumulative Formula:
 * ─────────────────────────────────────────────────────
 * For each subject:
 *   Term Total     = CA (40) + Exam (60) = 100 max
 *   Cumulative Avg = (1st Term Total + 2nd Term Total + 3rd Term Total) / N
 *   where N = number of terms that have a score for this subject
 *
 * Session Total Score:
 *   Sum of all Cumulative Averages across subjects
 *
 * Session Average:
 *   Session Total Score / Number of subjects evaluated
 *
 * Class Position:
 *   Ranked by Session Average descending (tie = same position)
 *
 * Performance Band:
 *   A (70-100) = Distinction
 *   B (60-69)  = Upper Credit
 *   C (50-59)  = Credit
 *   P (45-49)  = Pass
 *   F (0-44)   = Fail
 */

import { prisma } from "./prisma";

// ── Term order map for sorting ─────────────────────
const TERM_ORDER: Record<string, number> = {
  FIRST: 1,
  SECOND: 2,
  THIRD: 3,
};

// ── Grade from percentage ──────────────────────────
function getGrade(avg: number): string {
  if (avg >= 70) return "A";
  if (avg >= 60) return "B";
  if (avg >= 50) return "C";
  if (avg >= 45) return "P";
  return "F";
}

// ── Performance band ───────────────────────────────
function getPerformance(avg: number): string {
  if (avg >= 70) return "Distinction";
  if (avg >= 60) return "Upper Credit";
  if (avg >= 50) return "Credit";
  if (avg >= 45) return "Pass";
  return "Fail";
}

// ── Types ──────────────────────────────────────────
export interface CumulativeSubjectRow {
  subjectId: string;
  subjectName: string;
  subjectCode: string | null;
  firstTerm: number | null; // total score in 1st term
  secondTerm: number | null; // total score in 2nd term
  thirdTerm: number | null; // total score in 3rd term
  cumulativeAvg: number; // average across available terms
  grade: string; // grade for cumulative avg
  remark: string; // remark for cumulative avg
}

export interface CumulativeResult {
  student: {
    id: string;
    fullName: string;
    regNumber: string;
    gender: string;
  };
  classId: string;
  className: string;
  sessionId: string;
  sessionName: string;
  school: {
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;
    motto: string | null;
    teacherSignature: string | null;
    schoolSeal: string | null;
    principalSignature: string | null;
  };
  subjects: CumulativeSubjectRow[];
  summary: {
    subjectsOffered: number;
    sessionTotalScore: number; // sum of all cumulative averages
    sessionAverage: number; // sessionTotalScore / subjectsOffered
    position: string | null;
    outOf: number;
    performance: string;
    grade: string;
    termsCompleted: number; // how many terms contributed
  };
  termTotals: {
    // per-term aggregate totals
    firstTerm: number | null;
    secondTerm: number | null;
    thirdTerm: number | null;
  };
  gradeKey: Array<{
    range: string;
    grade: string;
    description: string;
    remark: string;
  }>;
}

/**
 * Fetches all published results for a student in a session
 * and calculates the cumulative result.
 *
 * @param studentId - Student's unique ID
 * @param sessionId - Session to calculate cumulative for
 * @param schoolId  - School ID for scoping
 */
export async function calculateCumulativeResult(
  studentId: string,
  sessionId: string,
  schoolId: string,
): Promise<CumulativeResult | null> {
  // ── 1. Get all terms in this session ──────────────
  const session = await prisma.session.findFirst({
    where: { id: sessionId, schoolId },
    select: {
      id: true,
      name: true,
      terms: {
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      },
    },
  });

  if (!session || session.terms.length === 0) return null;

  // ── 2. Fetch all published results for this student in this session ─
  const results = await prisma.result.findMany({
    where: {
      studentId,
      schoolId,
      sessionId,
      isPublished: true,
    },
    include: {
      term: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          regNumber: true,
          gender: true,
        },
      },
      school: {
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
      },
      items: {
        include: {
          subject: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });

  if (results.length === 0) return null;

  // ── 3. Sort results by term order ─────────────────
  results.sort(
    (a, b) => (TERM_ORDER[a.term.name] ?? 9) - (TERM_ORDER[b.term.name] ?? 9),
  );

  // ── 4. Use the first result for student/school/class data ─
  const base = results[0];

  // ── 5. Collect all unique subjects across all terms ─
  const subjectMap = new Map<
    string,
    {
      id: string;
      name: string;
      code: string | null;
      firstTerm: number | null;
      secondTerm: number | null;
      thirdTerm: number | null;
    }
  >();

  for (const result of results) {
    const termKey = result.term.name; // FIRST | SECOND | THIRD

    for (const item of result.items) {
      const subId = item.subject.id;

      if (!subjectMap.has(subId)) {
        subjectMap.set(subId, {
          id: subId,
          name: item.subject.name,
          code: item.subject.code,
          firstTerm: null,
          secondTerm: null,
          thirdTerm: null,
        });
      }

      const subRow = subjectMap.get(subId)!;

      // ── Assign score to correct term slot ──────────
      if (termKey === "FIRST" && item.totalScore !== null) {
        subRow.firstTerm = item.totalScore;
      }
      if (termKey === "SECOND" && item.totalScore !== null) {
        subRow.secondTerm = item.totalScore;
      }
      if (termKey === "THIRD" && item.totalScore !== null) {
        subRow.thirdTerm = item.totalScore;
      }
    }
  }

  // ── 6. Calculate cumulative average per subject ────
  const subjectRows: CumulativeSubjectRow[] = [];

  for (const [, subj] of subjectMap) {
    const scores = [subj.firstTerm, subj.secondTerm, subj.thirdTerm].filter(
      (s): s is number => s !== null,
    );

    if (scores.length === 0) continue;

    // ── Cumulative avg = sum / number of terms with scores ─
    const cumulativeAvg = parseFloat(
      (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2),
    );

    const grade = getGrade(cumulativeAvg);
    const remark =
      grade === "A"
        ? "Excellent"
        : grade === "B"
          ? "Very Good"
          : grade === "C"
            ? "Good"
            : grade === "P"
              ? "Fair"
              : "Poor";

    subjectRows.push({
      subjectId: subj.id,
      subjectName: subj.name,
      subjectCode: subj.code,
      firstTerm: subj.firstTerm,
      secondTerm: subj.secondTerm,
      thirdTerm: subj.thirdTerm,
      cumulativeAvg,
      grade,
      remark,
    });
  }

  // ── Sort subjects alphabetically ──────────────────
  subjectRows.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  // ── 7. Session-level summary ───────────────────────
  const sessionTotalScore = parseFloat(
    subjectRows.reduce((sum, s) => sum + s.cumulativeAvg, 0).toFixed(2),
  );

  const sessionAverage = parseFloat(
    (sessionTotalScore / subjectRows.length).toFixed(2),
  );

  // ── 8. Per-term aggregate totals ──────────────────
  // Sum of all subject totals per term
  const termTotals = {
    firstTerm: subjectRows.some((s) => s.firstTerm !== null)
      ? subjectRows.reduce((sum, s) => sum + (s.firstTerm ?? 0), 0)
      : null,
    secondTerm: subjectRows.some((s) => s.secondTerm !== null)
      ? subjectRows.reduce((sum, s) => sum + (s.secondTerm ?? 0), 0)
      : null,
    thirdTerm: subjectRows.some((s) => s.thirdTerm !== null)
      ? subjectRows.reduce((sum, s) => sum + (s.thirdTerm ?? 0), 0)
      : null,
  };

  // ── 9. Count terms completed ───────────────────────
  const termsCompleted = [
    termTotals.firstTerm,
    termTotals.secondTerm,
    termTotals.thirdTerm,
  ].filter((t) => t !== null).length;

  return {
    student: {
      id: base.student.id,
      fullName: `${base.student.lastName} ${base.student.firstName}${
        base.student.middleName ? " " + base.student.middleName : ""
      }`.toUpperCase(),
      regNumber: base.student.regNumber,
      gender: base.student.gender,
    },
    classId: base.class.id,
    className: base.class.name,
    sessionId: session.id,
    sessionName: session.name,
    school: base.school,
    subjects: subjectRows,
    summary: {
      subjectsOffered: subjectRows.length,
      sessionTotalScore,
      sessionAverage,
      position: null, // calculated separately (class-wide)
      outOf: 0, // calculated separately
      performance: getPerformance(sessionAverage),
      grade: getGrade(sessionAverage),
      termsCompleted,
    },
    termTotals,
    gradeKey: [
      {
        range: "70 - 100",
        grade: "A",
        description: "Distinction",
        remark: "Excellent",
      },
      {
        range: "60 - 69",
        grade: "B",
        description: "Upper Credit",
        remark: "Very Good",
      },
      { range: "50 - 59", grade: "C", description: "Credit", remark: "Good" },
      { range: "45 - 49", grade: "P", description: "Pass", remark: "Fair" },
      { range: "0 - 44", grade: "F", description: "Fail", remark: "Poor" },
    ],
  };
}

/**
 * Calculates class-wide cumulative positions.
 * Call this to get position for a specific student
 * relative to their classmates in the same session.
 *
 * @param classId   - Class to rank
 * @param sessionId - Session to rank within
 * @param schoolId  - School scope
 */
export async function calculateCumulativePositions(
  classId: string,
  sessionId: string,
  schoolId: string,
): Promise<Map<string, { position: number; outOf: number }>> {
  // ── Get all students in this class ────────────────
  const students = await prisma.student.findMany({
    where: { schoolId, status: "ACTIVE" },
    select: { id: true },
  });

  const positions = new Map<string, { position: number; outOf: number }>();
  const averages: { studentId: string; avg: number }[] = [];

  // ── Calculate cumulative average for each student ─
  for (const student of students) {
    const cum = await calculateCumulativeResult(
      student.id,
      sessionId,
      schoolId,
    );
    if (cum) {
      averages.push({
        studentId: student.id,
        avg: cum.summary.sessionAverage,
      });
    }
  }

  // ── Sort descending by average ─────────────────────
  averages.sort((a, b) => b.avg - a.avg);

  // ── Assign positions with tie-handling ────────────
  // Students with equal averages get the same position
  let currentPos = 1;
  const outOf = averages.length;

  averages.forEach((item, index) => {
    if (index > 0 && item.avg < averages[index - 1].avg) {
      currentPos = index + 1;
    }
    positions.set(item.studentId, { position: currentPos, outOf });
  });

  return positions;
}
