import { prisma } from "./prisma";

// Calculates and updates positions for ALL students
// in a class for a given term — handles ties correctly
export async function recalculateClassPositions(
  classId: string,
  termId: string,
  schoolId: string,
): Promise<void> {
  // Fetch all published results for this class + term
  const results = await prisma.result.findMany({
    where: { classId, termId, schoolId },
    select: { id: true, average: true },
    orderBy: { average: "desc" },
  });

  if (results.length === 0) return;

  const outOf = results.length;

  // Assign positions — ties get the same position
  // e.g. two students with 85% both get position 1,
  // next student gets position 3 (not 2)
  let currentPosition = 1;

  const updates = results.map((result, index) => {
    if (index > 0 && result.average < results[index - 1].average) {
      currentPosition = index + 1;
    }

    return prisma.result.update({
      where: { id: result.id },
      data: {
        position: currentPosition,
        outOf,
      },
    });
  });

  await prisma.$transaction(updates);
}

// Calculates per-subject positions across all students in a class
export async function recalculateSubjectPositions(
  classId: string,
  termId: string,
  schoolId: string,
  subjectId: string,
): Promise<void> {
  // Get all result items for this subject in this class + term
  const items = await prisma.resultItem.findMany({
    where: {
      schoolId,
      subjectId,
      result: { classId, termId },
      totalScore: { not: null },
    },
    select: { id: true, totalScore: true },
    orderBy: { totalScore: "desc" },
  });

  if (items.length === 0) return;

  // Calculate class average for this subject
  const sum = items.reduce((acc, item) => acc + (item.totalScore ?? 0), 0);
  const classAverage = parseFloat((sum / items.length).toFixed(2));

  let currentPosition = 1;

  const updates = items.map((item, index) => {
    if (
      index > 0 &&
      (item.totalScore ?? 0) < (items[index - 1].totalScore ?? 0)
    ) {
      currentPosition = index + 1;
    }

    return prisma.resultItem.update({
      where: { id: item.id },
      data: {
        positionInClass: currentPosition,
        classAverage,
      },
    });
  });

  await prisma.$transaction(updates);
}
