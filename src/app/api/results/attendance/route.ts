import { getActivePeriod } from "@/lib/active-period";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/response";
import { updateAttendanceSchema } from "@/validators/result.validator";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest) {
  const { auth, error } = requireAuth(req, ["SCHOOL_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json();
    const { studentId, ...attendanceData } = body;

    if (!studentId) {
      return errorResponse("studentId is required", 400);
    }

    const parsed = updateAttendanceSchema.safeParse(attendanceData);
    if (!parsed.success) {
      return errorResponse("Validation failed", 422, parsed.error.flatten());
    }

    const { activePeriod, error: periodError } = await getActivePeriod(
      auth!.schoolId,
    );
    if (periodError) return periodError;

    const { term } = activePeriod!;

    const result = await prisma.result.findUnique({
      where: { studentId_termId: { studentId, termId: term.id } },
    });

    if (!result) {
      return errorResponse("Result not found for this student this term", 404);
    }

    const updated = await prisma.result.update({
      where: { id: result.id },
      data: {
        ...parsed.data,
        vacationDate: parsed.data.vacationDate
          ? new Date(parsed.data.vacationDate)
          : undefined,
        resumptionDate: parsed.data.resumptionDate
          ? new Date(parsed.data.resumptionDate)
          : undefined,
      },
      select: {
        daysOpen: true,
        daysPresent: true,
        daysAbsent: true,
        vacationDate: true,
        resumptionDate: true,
      },
    });

    return successResponse(updated, "Attendance updated successfully");
  } catch (err) {
    console.error("[UPDATE_ATTENDANCE]", err);
    return errorResponse("Internal server error", 500);
  }
}
