/**
 * @file src/app/api/results/comments/route.ts
 * @description Updates teacher and principal comments on a result.
 * Comments can be:
 * 1. Manually entered by admin
 * 2. Auto-generated based on student performance
 */

import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { NextRequest } from "next/server";
import { z } from "zod";

// ── Validation schema ──────────────────────────────
const commentsSchema = z.object({
  studentId: z.string().min(1, "Student ID required"),
  teacherComment: z.string().max(600).optional().nullable(),
  principalComment: z.string().max(600).optional().nullable(),
  teacherName: z.string().max(100).optional().nullable(),
  principalName: z.string().max(100).optional().nullable(),
  // Flag to auto-generate comments from performance
  autoGenerate: z.boolean().optional().default(false),
});

/**
 * Generates a dynamic teacher comment based on student performance.
 * @param studentName - Full name of the student
 * @param average - Student's average score
 * @param performance - Performance label (Distinction, Credit etc.)
 * @param position - Class position string (e.g. "1st")
 * @param outOf - Total students in class
 */
function generateTeacherComment(
  studentName: string,
  average: number,
  performance: string | null,
  position: number | null,
  outOf: number,
): string {
  // ── Select comment template based on performance ─
  // We use the average score to determine which comment template to use. The position and outOf are used to add context about class ranking if available. The student's first name is used for a more personalized comment.
  const firstName = studentName.split(" ").pop() ?? studentName;

  if (average >= 70) {
    return `${firstName} has demonstrated exceptional academic performance this term, achieving an impressive average of ${average}%. ${
      position ? `Ranked ${position} out of ${outOf} students, this` : "This"
    } outstanding result reflects great dedication and hard work. We are very proud of this achievement. Keep aiming for excellence!`;
  }

  if (average >= 60) {
    return `${firstName} has shown commendable performance this term with an average of ${average}%. ${
      position ? `Positioned ${position} out of ${outOf} students.` : ""
    } With continued effort and focus, even greater heights can be achieved. Well done!`;
  }

  if (average >= 50) {
    return `${firstName} has performed satisfactorily this term with an average of ${average}%. There is clear potential for improvement. I encourage ${firstName} to dedicate more time to studies and seek help where needed. Keep working hard!`;
  }

  if (average >= 45) {
    return `${firstName} has made an effort this term, achieving an average of ${average}%. However, there is significant room for improvement. I strongly encourage more consistent studying and active class participation to boost performance.`;
  }

  return `${firstName} needs to work considerably harder next term. An average of ${average}% is below expectation. I urge ${firstName} to take studies more seriously, attend all classes, and seek extra support where needed.`;
}

/**
 * Generates a dynamic principal comment based on student performance.
 * @param studentName - Full name of the student
 * @param performance - Performance label
 * @param average - Average score
 */
function generatePrincipalComment(
  studentName: string,
  performance: string | null,
  average: number,
): string {
  const firstName = studentName.split(" ").pop() ?? studentName;

  if (average >= 70) {
    return `We are extremely proud of ${firstName}'s outstanding academic achievement this term. This level of performance places ${firstName} among the top students in the school. Continue to strive for excellence and be an inspiration to others.`;
  }

  if (average >= 60) {
    return `${firstName} has done well this term and we commend this effort. We believe there is even greater potential within you. Stay focused, maintain discipline, and you will achieve remarkable results. Well done!`;
  }

  if (average >= 50) {
    return `${firstName} has demonstrated satisfactory performance this term. We encourage a stronger commitment to academic excellence next term. The management and staff are always available to support your growth. Keep pushing forward!`;
  }

  return `We encourage ${firstName} to take academics more seriously. The school management is committed to providing all the support needed. We expect to see significant improvement next term. Do not give up — you can do better!`;
}

// ── PUT /api/results/comments ──────────────────────
// Updates teacher and principal comments for a student's result. Can also auto-generate comments based on performance.
export async function PUT(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();

    const parsed = commentsSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const {
      studentId,
      teacherComment,
      principalComment,
      teacherName,
      principalName,
      autoGenerate,
    } = parsed.data;

    // ── Get active term ────────────────────────────
    // We need the active term to find the correct result for this student. Comments are term-specific.
    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { term } = activePeriod!;

    // ── Find result for this student + term ────────
    // We need the result to get performance data for auto-generating comments, and to update the correct record with new comments.
    const result = await prisma.result.findUnique({
      where: {
        studentId_termId: { studentId, termId: term.id },
      },
      include: {
        student: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!result) {
      return errorResponse(
        "No result found for this student this term. Enter scores first.",
        404,
      );
    }

    // ── Auto-generate comments if requested ────────
    // If autoGenerate is true, we create comments based on the student's average score and performance. Manual comments take precedence over auto-generated ones if both are provided.
    let finalTeacherComment = teacherComment;
    let finalPrincipalComment = principalComment;

    if (autoGenerate) {
      const studentName = `${result.student.firstName} ${result.student.lastName}`;

      // Only auto-generate if manual comment not provided
      if (!teacherComment) {
        finalTeacherComment = generateTeacherComment(
          studentName,
          result.average,
          result.performance,
          result.position,
          result.outOf,
        );
      }

      if (!principalComment) {
        finalPrincipalComment = generatePrincipalComment(
          studentName,
          result.performance,
          result.average,
        );
      }
    }

    // ── Save comments to DB ────────────────────────
    // We update the result record with the new comments and names of the commenters. We return the updated comments in the response.
    const updated = await prisma.result.update({
      where: { id: result.id },
      data: {
        teacherComment: finalTeacherComment,
        principalComment: finalPrincipalComment,
        teacherName,
        principalName,
      },
      select: {
        teacherComment: true,
        principalComment: true,
        teacherName: true,
        principalName: true,
      },
    });

    return successResponse(updated, "Comments saved successfully");
  } catch (err) {
    console.error("[UPDATE_COMMENTS]", err);
    return errorResponse("Internal server error", 500);
  }
}
